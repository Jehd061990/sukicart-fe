export type SyncQueueEntry = {
  id?: number;
  type: "pos-order-create";
  payload: {
    paymentMethod: "cash";
    items: Array<{
      productId: string;
      quantity: number;
      variant?: string;
      note?: string;
    }>;
    scannedCode?: string;
    createdAt: number;
  };
  createdAt: number;
};

const DB_NAME = "sukicart-offline-db";
const DB_VERSION = 1;

const STORES = {
  products: "products",
  cart: "cart",
  orders: "orders",
  syncQueue: "syncQueue",
  meta: "meta",
} as const;

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.products)) {
        db.createObjectStore(STORES.products, { keyPath: "_id" });
      }

      if (!db.objectStoreNames.contains(STORES.cart)) {
        db.createObjectStore(STORES.cart, { keyPath: "lineKey" });
      }

      if (!db.objectStoreNames.contains(STORES.orders)) {
        db.createObjectStore(STORES.orders, { keyPath: "localId" });
      }

      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        db.createObjectStore(STORES.syncQueue, {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
};

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return undefined;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let request: IDBRequest<T> | void;
    try {
      request = operation(store);
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = () => {
      if (request && "result" in request) {
        resolve(request.result);
      } else {
        resolve(undefined);
      }
    };

    tx.onerror = () => {
      reject(tx.error || new Error(`Transaction failed for ${storeName}`));
    };
  });
};

export const offlineDb = {
  async replaceProducts<T extends { _id: string }>(products: T[]) {
    await withStore(STORES.products, "readwrite", (store) => {
      store.clear();
      for (const product of products) {
        store.put(product);
      }
    });
  },

  async getProducts<T>() {
    const records = await withStore<T[]>(STORES.products, "readonly", (store) =>
      store.getAll(),
    );
    return records || [];
  },

  async replaceCartItems<T extends { lineKey: string }>(items: T[]) {
    await withStore(STORES.cart, "readwrite", (store) => {
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    });
  },

  async getCartItems<T>() {
    const records = await withStore<T[]>(STORES.cart, "readonly", (store) =>
      store.getAll(),
    );
    return records || [];
  },

  async addOrderSnapshot<T extends { localId: string }>(order: T) {
    await withStore(STORES.orders, "readwrite", (store) => store.put(order));
  },

  async enqueueSync(entry: SyncQueueEntry) {
    const queued = await withStore<number>(STORES.syncQueue, "readwrite", (store) =>
      store.add(entry),
    );
    return queued;
  },

  async dequeueSync(id: number) {
    await withStore(STORES.syncQueue, "readwrite", (store) => store.delete(id));
  },

  async getSyncQueue() {
    const queue = await withStore<SyncQueueEntry[]>(
      STORES.syncQueue,
      "readonly",
      (store) => store.getAll(),
    );
    return (queue || []).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  },

  async getSyncQueueCount() {
    const count = await withStore<number>(STORES.syncQueue, "readonly", (store) =>
      store.count(),
    );
    return Number(count || 0);
  },
};
