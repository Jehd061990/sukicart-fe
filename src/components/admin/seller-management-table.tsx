"use client";

import { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AdminSeller, SellerReviewStatus } from "@/types/admin";

interface SellerManagementTableProps {
  sellers: AdminSeller[];
  isLoading: boolean;
  isBusy: boolean;
  onChangeStatus: (sellerProfileId: string, status: SellerReviewStatus) => void;
  onViewDetails: (seller: AdminSeller) => void;
}

export function SellerManagementTable({
  sellers,
  isLoading,
  isBusy,
  onChangeStatus,
  onViewDetails,
}: SellerManagementTableProps) {
  const columns = useMemo<ColumnDef<AdminSeller>[]>(
    () => [
      {
        header: "Name",
        accessorKey: "name",
      },
      {
        header: "Store Name",
        accessorKey: "storeName",
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <span className="rounded-full border px-2 py-1 text-xs font-semibold">
            {row.original.status.toLowerCase()}
          </span>
        ),
      },
      {
        header: "Actions",
        cell: ({ row }) => {
          const seller = row.original;

          return (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onChangeStatus(seller.id, "APPROVED")}
                className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onChangeStatus(seller.id, "REJECTED")}
                className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onViewDetails(seller)}
                className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-muted"
              >
                View details
              </button>
            </div>
          );
        },
      },
    ],
    [isBusy, onChangeStatus, onViewDetails],
  );

  const table = useReactTable({
    data: sellers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section id="sellers" className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Seller Management</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Review pending sellers and manage registration status.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sellers...</p>
      ) : (
        <div className="overflow-x-auto">
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
              {table.getRowModel().rows.map((row) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
