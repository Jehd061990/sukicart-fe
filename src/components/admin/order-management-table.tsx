import { AdminOrder, OrderStatus } from "@/types/admin";

interface OrderManagementTableProps {
  orders: AdminOrder[];
  selectedStatus: "all" | OrderStatus;
  isLoading: boolean;
  isBusy: boolean;
  onChangeFilter: (status: "all" | OrderStatus) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statuses: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned_to_rider",
  "arrived_at_seller",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

export function OrderManagementTable({
  orders,
  selectedStatus,
  isLoading,
  isBusy,
  onChangeFilter,
  onUpdateStatus,
}: OrderManagementTableProps) {
  return (
    <section id="orders" className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Order Management</h2>
          <p className="text-sm text-muted-foreground">
            Filter orders and update status from one place.
          </p>
        </div>

        <label className="text-sm">
          <span className="mr-2 font-medium">Filter status:</span>
          <select
            value={selectedStatus}
            onChange={(event) =>
              onChangeFilter(event.target.value as "all" | OrderStatus)
            }
            className="rounded-lg border px-2 py-1"
          >
            <option value="all">all</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading orders...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                  <td className="px-3 py-2">{order.buyerName}</td>
                  <td className="px-3 py-2">{order.sellerName}</td>
                  <td className="px-3 py-2">{order.status}</td>
                  <td className="px-3 py-2">
                    <select
                      disabled={isBusy}
                      value={order.status}
                      onChange={(event) =>
                        onUpdateStatus(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className="rounded-lg border px-2 py-1"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
