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
import { posService } from "@/lib/api/services/pos.service";
import { productService } from "@/lib/api/services/product.service";
import {
  CreateProductPayload,
  Product,
  ProductCategory,
  ProductStatus,
  ProductUnit,
} from "@/types/product";

const CATEGORY_OPTIONS: ProductCategory[] = ["vegetables", "meat", "fish"];
const UNIT_OPTIONS: ProductUnit[] = ["kg", "pcs"];
const STATUS_OPTIONS: ProductStatus[] = ["active", "inactive"];

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

  const products = productsQuery.data?.products || [];
  const pagination = productsQuery.data?.pagination;

  const openAddModal = () => {
    setEditingProduct(null);
    setFormValues(INITIAL_FORM);
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
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingProduct) {
      await updateMutation.mutateAsync({
        productId: editingProduct._id,
        payload: formValues,
      });
      return;
    }

    await createMutation.mutateAsync(formValues);
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
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
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openEditModal(row.original)}
              className="rounded border px-2 py-1 text-xs font-semibold hover:bg-muted"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(row.original._id)}
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

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Product Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your catalog with create, edit, and delete actions.
          </p>
        </div>

        <Button onClick={openAddModal}>Add Product</Button>
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
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b text-left">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {productsQuery.isLoading ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                  Loading products...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                  No products found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>

            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
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
                    setFormValues((state) => ({
                      ...state,
                      category: event.target.value as ProductCategory,
                    }))
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

                <Input
                  placeholder="Image URL (optional)"
                  value={formValues.image || ""}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      image: event.target.value,
                    }))
                  }
                />
              </div>

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
                  {editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
