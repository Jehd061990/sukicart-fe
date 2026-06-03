"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";
import { posService } from "@/lib/api/services/pos.service";
import { productService } from "@/lib/api/services/product.service";
import {
  CreateProductPayload,
  Product,
  ProductCategory,
  ProductStatus,
  ProductTaxType,
  ProductUnit,
} from "@/types/product";
import { LazyInventoryImage } from "@/components/images/lazy-inventory-image";
import { SukiGoImageUploader } from "@/components/uploads/sukigo-image-uploader";
import { toast } from "sonner";

const CATEGORY_OPTIONS: ProductCategory[] = ["vegetables", "meat", "fish"];
const UNIT_OPTIONS: ProductUnit[] = ["kg", "pcs"];
const STATUS_OPTIONS: ProductStatus[] = ["active", "inactive"];
const TAX_OPTIONS: Array<{ value: ProductTaxType; label: string }> = [
  { value: "VAT", label: "VAT 12%" },
  { value: "VAT_EXEMPT", label: "VAT Exempt" },
  { value: "ZERO_RATED", label: "Zero Rated" },
  { value: "NON_VAT", label: "Non-VAT" },
];

const TAX_BADGE_CLASS: Record<ProductTaxType, string> = {
  VAT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  VAT_EXEMPT: "bg-blue-100 text-blue-700 border-blue-200",
  ZERO_RATED: "bg-violet-100 text-violet-700 border-violet-200",
  NON_VAT: "bg-slate-100 text-slate-700 border-slate-200",
};

const INITIAL_FORM: CreateProductPayload = {
  name: "",
  price: 0,
  stock: 0,
  barcode: "",
  expiryDate: null,
  unit: "kg",
  category: "vegetables",
  status: "active",
  image: "",
  images: [],
  taxType: "VAT",
  taxRate: 12,
};

export function ProductManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">(
    "all",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState("1");
  const [formValues, setFormValues] =
    useState<CreateProductPayload>(INITIAL_FORM);

  const productsQuery = useQuery({
    queryKey: ["seller-products", page, search, statusFilter],
    queryFn: () =>
      productService.getMine({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter,
      }),
  });

  const storeConfigQuery = useQuery({
    queryKey: ["store-config", "me"],
    queryFn: () => posService.getStoreConfig(),
  });

  const expiryTrackingEnabled = Boolean(
    storeConfigQuery.data?.config?.features?.expiryTracking,
  );
  const storeTaxConfig = storeConfigQuery.data?.config?.tax;

  const categoryTaxDefaults = useMemo(() => {
    return storeTaxConfig?.categoryDefaults || {};
  }, [storeTaxConfig?.categoryDefaults]);

  const resolveCategoryTaxDefault = (category: ProductCategory) => {
    const categoryDefault = categoryTaxDefaults?.[category];
    const businessTaxType = storeTaxConfig?.businessTaxType || "VAT";
    const defaultVatRate = Number(storeTaxConfig?.defaultVatRate || 12);

    if (businessTaxType === "NON_VAT" || storeTaxConfig?.enabled === false) {
      return {
        taxType: "NON_VAT" as ProductTaxType,
        taxRate: 0,
      };
    }

    if (categoryDefault) {
      return {
        taxType: categoryDefault.taxType,
        taxRate: categoryDefault.taxType === "VAT" ? Number(categoryDefault.taxRate || defaultVatRate) : 0,
      };
    }

    return {
      taxType: "VAT" as ProductTaxType,
      taxRate: defaultVatRate,
    };
  };

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      setIsModalOpen(false);
      setFormValues(INITIAL_FORM);
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: Partial<CreateProductPayload>;
    }) => productService.update(productId, payload),
    onSuccess: () => {
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormValues(INITIAL_FORM);
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });

  const addStockMutation = useMutation({
    mutationFn: ({ product, quantity }: { product: Product; quantity: number }) =>
      productService.update(product._id, {
        stock: Number(product.stock || 0) + quantity,
      }),
    onSuccess: (_result, variables) => {
      setDetailsProduct((previous) => {
        if (!previous || previous._id !== variables.product._id) {
          return previous;
        }

        return {
          ...previous,
          stock: Number(previous.stock || 0) + variables.quantity,
        };
      });
      setStockToAdd("1");
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      toast.success("Stock added successfully.");
    },
    onError: () => {
      toast.error("Failed to add stock.");
    },
  });

  const products = productsQuery.data?.products || [];
  const pagination = productsQuery.data?.pagination;

  const openAddModal = () => {
    const categoryDefaultTax = resolveCategoryTaxDefault(INITIAL_FORM.category);
    setEditingProduct(null);
    setFormValues({
      ...INITIAL_FORM,
      taxType: categoryDefaultTax.taxType,
      taxRate: categoryDefaultTax.taxRate,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormValues({
      name: product.name,
      price: product.price,
      stock: product.stock,
      barcode: product.barcode || "",
      expiryDate: product.expiryDate || null,
      unit: product.unit,
      category: product.category,
      status: product.status,
      image: product.image || "",
      images: product.images || [],
      taxType: product.taxType || "NON_VAT",
      taxRate: Number(product.taxRate || 0),
    });
    setIsModalOpen(true);
  };

  const openDetailsModal = (product: Product) => {
    setDetailsProduct(product);
    setStockToAdd("1");
  };

  const handleAddStocks = async () => {
    if (!detailsProduct) {
      return;
    }

    const quantity = Math.floor(Number(stockToAdd));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid stock quantity greater than 0.");
      return;
    }

    await addStockMutation.mutateAsync({
      product: detailsProduct,
      quantity,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: CreateProductPayload = {
      ...formValues,
      taxRate: formValues.taxType === "VAT" ? Number(formValues.taxRate || 0) : 0,
    };

    if (editingProduct) {
      await updateMutation.mutateAsync({
        productId: editingProduct._id,
        payload,
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: "Image",
        cell: ({ row }) => (
          <LazyInventoryImage
            name={row.original.name}
            image={row.original.image}
            images={row.original.images}
            size={52}
          />
        ),
      },
      { header: "Name", accessorKey: "name" },
      {
        header: "Price",
        cell: ({ row }) => `PHP ${row.original.price.toFixed(2)}`,
      },
      {
        header: "Barcode",
        cell: ({ row }) => row.original.barcode || "-",
      },
      {
        header: "Expiry",
        cell: ({ row }) => {
          if (!row.original.expiryDate) {
            return "-";
          }

          return new Date(row.original.expiryDate).toLocaleDateString();
        },
      },
      { header: "Stock", accessorKey: "stock" },
      {
        header: "Status",
        cell: ({ row }) => (
          <span className="rounded-full border px-2 py-1 text-xs font-semibold">
            {row.original.status}
          </span>
        ),
      },
      { header: "Category", accessorKey: "category" },
      {
        header: "Tax",
        cell: ({ row }) => {
          const taxType = row.original.taxType || "NON_VAT";
          const label = TAX_OPTIONS.find((item) => item.value === taxType)?.label || "Non-VAT";

          return (
            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${TAX_BADGE_CLASS[taxType]}`}>
              {label}
            </span>
          );
        },
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(row.original);
              }}
              className="rounded border px-2 py-1 text-xs font-semibold hover:bg-muted"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                deleteMutation.mutate(row.original._id);
              }}
              className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const inventoryRows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const columnCount = table.getVisibleLeafColumns().length;
  const columnTemplate = `repeat(${columnCount}, minmax(100px, 1fr))`;
  // const INVENTORY_LIST_HEIGHT = "clamp(calc(100dvh - 150px), 56vh, 560px)";
  const INVENTORY_LIST_HEIGHT = "calc(100dvh - 400px)";
  const INVENTORY_ROW_ESTIMATE_SIZE_PX = 84;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your inventory catalog with create, edit, and delete actions.
          </p>
        </div>

        <Button onClick={openAddModal}>Add Inventory</Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search product or barcode"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as ProductStatus | "all");
            setPage(1);
          }}
        >
          <option value="all">all statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <div style={{ minWidth: 1200 }}>
          {headerGroups.map((headerGroup) => (
            <div
              key={headerGroup.id}
              className="grid border-b text-left text-sm"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              {headerGroup.headers.map((header) => (
                <div key={header.id} className="px-3 py-2 font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </div>
              ))}
            </div>
          ))}

          {productsQuery.isLoading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground" style={{ height: INVENTORY_LIST_HEIGHT }}>
              Loading products...
            </div>
          ) : inventoryRows.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground" style={{ height: INVENTORY_LIST_HEIGHT }}>
              No products found.
            </div>
          ) : (
            <VirtualizedSimpleBarList
              items={inventoryRows}
              height={INVENTORY_LIST_HEIGHT}
              estimateSize={INVENTORY_ROW_ESTIMATE_SIZE_PX}
              overscan={10}
              contentClassName="relative"
              itemClassName="absolute left-0 top-0 w-full"
              hideHorizontalOverflow
              getItemKey={(row) => row.id}
              renderItem={(row) => (
                <div
                  className="grid cursor-pointer border-b bg-card text-sm last:border-0 hover:bg-muted/40"
                  style={{ gridTemplateColumns: columnTemplate }}
                  onClick={() => openDetailsModal(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              )}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pagination?.page || 1} of {pagination?.totalPages || 1}
        </span>
        <Button
          variant="outline"
          disabled={Boolean(pagination && page >= pagination.totalPages)}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-background p-5 shadow-xl overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <h2 className="text-lg font-semibold">
              {editingProduct ? "Edit Inventory" : "Add Inventory"}
            </h2>

            <form className="mt-4 space-y-3 min-h-150" onSubmit={onSubmit}>
              <Input
                required
                placeholder="Product name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Barcode (optional)"
                  value={formValues.barcode || ""}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      barcode: event.target.value,
                    }))
                  }
                />
                <Input
                  type="date"
                  required={expiryTrackingEnabled}
                  value={
                    formValues.expiryDate
                      ? String(formValues.expiryDate).slice(0, 10)
                      : ""
                  }
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      expiryDate: event.target.value || null,
                    }))
                  }
                />
              </div>

              {expiryTrackingEnabled ? (
                <p className="text-xs text-amber-700">
                  Expiry tracking is enabled for your store type. Expiry date is
                  required.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Price"
                  value={formValues.price}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      price: Number(event.target.value || 0),
                    }))
                  }
                />
                <Input
                  required
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Stock"
                  value={formValues.stock}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      stock: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formValues.unit}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      unit: event.target.value as ProductUnit,
                    }))
                  }
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((state) => {
                      const nextCategory = event.target.value as ProductCategory;
                      const categoryDefaultTax = resolveCategoryTaxDefault(nextCategory);

                      return {
                        ...state,
                        category: nextCategory,
                        taxType: categoryDefaultTax.taxType,
                        taxRate: categoryDefaultTax.taxRate,
                      };
                    })
                  }
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formValues.status || "active"}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      status: event.target.value as ProductStatus,
                    }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  First uploaded image is used as primary thumbnail.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formValues.taxType || "NON_VAT"}
                  onChange={(event) => {
                    const nextTaxType = event.target.value as ProductTaxType;
                    setFormValues((state) => ({
                      ...state,
                      taxType: nextTaxType,
                      taxRate:
                        nextTaxType === "VAT"
                          ? Number(state.taxRate || storeTaxConfig?.defaultVatRate || 12)
                          : 0,
                    }));
                  }}
                >
                  {TAX_OPTIONS.map((taxOption) => (
                    <option key={taxOption.value} value={taxOption.value}>
                      {taxOption.label}
                    </option>
                  ))}
                </select>

                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="Tax rate %"
                  disabled={(formValues.taxType || "NON_VAT") !== "VAT"}
                  value={Number(formValues.taxRate || 0)}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      taxRate: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <p className="text-xs text-slate-600">
                Category defaults auto-apply tax on create. You can override anytime.
              </p>

              <SukiGoImageUploader
                value={formValues.images || []}
                folder={`sukigo/products/${formValues.category}`}
                onChange={(nextImages) =>
                  setFormValues((state) => ({
                    ...state,
                    images: nextImages,
                    image: nextImages[0]?.url || "",
                  }))
                }
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    setFormValues(INITIAL_FORM);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingProduct ? "Save Changes" : "Create Inventory"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsProduct ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Item Details</h2>
                <p className="text-xs text-muted-foreground">Review item info and add stocks.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsProduct(null)}
                className="rounded border px-2 py-1 text-xs font-semibold hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[72px_1fr] gap-3">
              <LazyInventoryImage
                name={detailsProduct.name}
                image={detailsProduct.image}
                images={detailsProduct.images}
                size={72}
              />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-foreground">{detailsProduct.name}</p>
                <p className="text-muted-foreground">Price: PHP {Number(detailsProduct.price || 0).toFixed(2)}</p>
                <p className="text-muted-foreground">Category: {detailsProduct.category}</p>
                <p className="text-muted-foreground">Unit: {detailsProduct.unit}</p>
                <p className="text-muted-foreground">Barcode: {detailsProduct.barcode || "-"}</p>
                <p className="text-muted-foreground">Status: {detailsProduct.status}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold">Current Stock: {detailsProduct.stock}</p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={stockToAdd}
                  onChange={(event) => setStockToAdd(event.target.value)}
                  placeholder="Add quantity"
                />
                <Button
                  type="button"
                  onClick={() => {
                    void handleAddStocks();
                  }}
                  disabled={addStockMutation.isPending}
                >
                  {addStockMutation.isPending ? "Adding..." : "Add Stocks"}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDetailsProduct(null);
                }}
              >
                Done
              </Button>
              <Button
                type="button"
                onClick={() => {
                  openEditModal(detailsProduct);
                }}
              >
                Edit Item
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
