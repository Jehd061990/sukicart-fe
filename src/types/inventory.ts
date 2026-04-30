export interface InventoryListItem {
  id: string;
  sellerId: string;
  productId: string;
  stock: number;
  status: "active" | "inactive";
  product: {
    id: string;
    name: string;
    category: string;
    unit: "kg" | "pcs";
    price: number;
  } | null;
  updatedAt: string;
}

export interface InventoryListResponse {
  data: InventoryListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryItemResponse {
  item: InventoryListItem;
}

export interface UpdateInventoryPayload {
  stock?: number;
  status?: "active" | "inactive";
}
