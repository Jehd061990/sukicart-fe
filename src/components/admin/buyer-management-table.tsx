import { AdminBuyer } from "@/types/admin";

interface BuyerManagementTableProps {
  buyers: AdminBuyer[];
  isLoading: boolean;
  isBusy: boolean;
  onDisableBuyer: (userId: string) => void;
}

export function BuyerManagementTable({
  buyers,
  isLoading,
  isBusy,
  onDisableBuyer,
}: BuyerManagementTableProps) {
  return (
    <section id="buyers" className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">User Management (Buyers)</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        View buyer accounts and disable abusive accounts.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading buyers...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{buyer.name}</td>
                  <td className="px-3 py-2">{buyer.email || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                      {buyer.isActive ? "active" : "disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!buyer.userId || isBusy || !buyer.isActive}
                      onClick={() => {
                        if (!buyer.userId) {
                          return;
                        }

                        onDisableBuyer(buyer.userId);
                      }}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Disable account
                    </button>
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
