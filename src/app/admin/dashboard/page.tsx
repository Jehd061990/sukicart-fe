"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BuyerManagementTable } from "@/components/admin/buyer-management-table";
import { OrderManagementTable } from "@/components/admin/order-management-table";
import { RiderAssignmentDebugPanel } from "@/components/admin/rider-assignment-debug-panel";
import { RiderManagementTable } from "@/components/admin/rider-management-table";
import { SellerManagementTable } from "@/components/admin/seller-management-table";
import { StatsGrid } from "@/components/admin/stats-grid";
import { adminService } from "@/lib/api/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { useAdminStore } from "@/store/admin.store";
import { AdminRiderAssignment, AdminSeller, OrderStatus } from "@/types/admin";

const parseErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data
  ) {
    return String(error.response.data.message);
  }

  return fallback;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  const {
    stats,
    sellers,
    riders,
    buyers,
    orders,
    loading,
    fetchDashboardData,
    updateSellerStatus,
    addRider,
    toggleRiderStatus,
    removeRider,
    disableBuyer,
    fetchOrders,
    updateOrderStatus,
  } = useAdminStore();

  const [selectedSeller, setSelectedSeller] = useState<AdminSeller | null>(
    null,
  );
  const [orderFilter, setOrderFilter] = useState<"all" | OrderStatus>("all");
  const [assignmentFilterInput, setAssignmentFilterInput] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignments, setAssignments] = useState<AdminRiderAssignment[]>([]);
  const isAdmin = hydrated && user?.role === "ADMIN";

  const fetchAssignments = async (orderId = assignmentFilter) => {
    if (!isAdmin) {
      return;
    }

    try {
      setAssignmentLoading(true);
      setAssignmentError("");
      const nextAssignments = await adminService.getRiderAssignments(
        orderId || undefined,
      );
      setAssignments(nextAssignments);
    } catch (error) {
      setAssignmentError(
        parseErrorMessage(error, "Failed to load rider assignment state"),
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      toast.error("Admin access only");
      router.replace("/");
      return;
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    fetchDashboardData("all").catch((error) => {
      toast.error(parseErrorMessage(error, "Failed to load admin dashboard"));
    });
  }, [fetchDashboardData, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    fetchAssignments(assignmentFilter);

    const poller = setInterval(() => {
      fetchAssignments(assignmentFilter);
    }, 10_000);

    return () => clearInterval(poller);
  }, [isAdmin, assignmentFilter]);

  const hasAnyLoading = useMemo(
    () =>
      loading.stats ||
      loading.sellers ||
      loading.riders ||
      loading.buyers ||
      loading.orders,
    [loading],
  );

  if (!hydrated || !isAdmin) {
    return (
      <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
        <p className="font-sans text-sm text-gray-700">
          Checking admin access...
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
        <p className="font-sans text-xs font-medium uppercase tracking-wider text-brand-700">
          Admin Dashboard
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          Platform Control Center
        </h1>
        <p className="mt-2 font-sans text-sm text-gray-700">
          Manage sellers, riders, buyers, and order operations for SukiCart.
        </p>
        {hasAnyLoading ? (
          <p className="mt-3 font-sans text-xs font-medium text-deal-700">
            Refreshing data...
          </p>
        ) : null}
      </header>

      <StatsGrid stats={stats} isLoading={loading.stats} />

      <RiderAssignmentDebugPanel
        assignments={assignments}
        isLoading={assignmentLoading}
        error={assignmentError}
        filterValue={assignmentFilterInput}
        activeFilter={assignmentFilter}
        onFilterChange={setAssignmentFilterInput}
        onApplyFilter={() => {
          setAssignmentFilter(assignmentFilterInput.trim());
        }}
        onClearFilter={() => {
          setAssignmentFilterInput("");
          setAssignmentFilter("");
        }}
        onRefresh={() => {
          fetchAssignments(assignmentFilter);
        }}
      />

      <SellerManagementTable
        sellers={sellers}
        isLoading={loading.sellers}
        isBusy={loading.action}
        onChangeStatus={(sellerProfileId, status) => {
          updateSellerStatus(sellerProfileId, status)
            .then(() => {
              toast.success(`Seller status updated to ${status.toLowerCase()}`);
            })
            .catch((error) => {
              toast.error(
                parseErrorMessage(error, "Failed to update seller status"),
              );
            });
        }}
        onViewDetails={(seller) => {
          setSelectedSeller(seller);
        }}
      />

      <RiderManagementTable
        riders={riders}
        isLoading={loading.riders}
        isBusy={loading.action}
        onAddRider={async (payload) => {
          try {
            await addRider(payload);
            toast.success("Rider created successfully");
          } catch (error) {
            toast.error(parseErrorMessage(error, "Failed to create rider"));
            throw error;
          }
        }}
        onToggleRider={(userId) => {
          toggleRiderStatus(userId)
            .then(() => {
              toast.success("Rider status updated");
            })
            .catch((error) => {
              toast.error(parseErrorMessage(error, "Failed to update rider"));
            });
        }}
        onRemoveRider={(userId) => {
          const confirmed = window.confirm(
            "Remove this rider account? This action cannot be undone.",
          );

          if (!confirmed) {
            return;
          }

          removeRider(userId)
            .then(() => {
              toast.success("Rider removed successfully");
            })
            .catch((error) => {
              toast.error(parseErrorMessage(error, "Failed to remove rider"));
            });
        }}
      />

      <BuyerManagementTable
        buyers={buyers}
        isLoading={loading.buyers}
        isBusy={loading.action}
        onDisableBuyer={(userId) => {
          const confirmed = window.confirm(
            "Disable this buyer account? The user can no longer log in.",
          );

          if (!confirmed) {
            return;
          }

          disableBuyer(userId)
            .then(() => {
              toast.success("Buyer account disabled");
            })
            .catch((error) => {
              toast.error(parseErrorMessage(error, "Failed to disable buyer"));
            });
        }}
      />

      <OrderManagementTable
        orders={orders}
        selectedStatus={orderFilter}
        isLoading={loading.orders}
        isBusy={loading.action}
        onChangeFilter={(status) => {
          setOrderFilter(status);
          fetchOrders(status).catch((error) => {
            toast.error(parseErrorMessage(error, "Failed to filter orders"));
          });
        }}
        onUpdateStatus={(orderId, status) => {
          updateOrderStatus(orderId, status)
            .then(() => {
              toast.success("Order status updated");
              if (orderFilter !== "all") {
                return fetchOrders(orderFilter);
              }
              return Promise.resolve();
            })
            .catch((error) => {
              toast.error(parseErrorMessage(error, "Failed to update order"));
            });
        }}
      />

      {selectedSeller ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-brand-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-lg font-medium text-brand-900">
                  Seller details
                </h3>
                <p className="font-sans text-sm text-gray-600">
                  {selectedSeller.name} - {selectedSeller.storeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="rounded-lg border border-brand-300 px-3 py-1 text-sm font-semibold text-brand-800 hover:bg-brand-50"
              >
                Close
              </button>
            </div>

            <dl className="mt-4 grid gap-3 font-sans text-sm text-gray-600 sm:grid-cols-2">
              <div>
                <dt className="font-sans text-xs text-gray-500">Status</dt>
                <dd className="font-semibold">{selectedSeller.status}</dd>
              </div>
              <div>
                <dt className="font-sans text-xs text-gray-500">Email</dt>
                <dd className="font-semibold">{selectedSeller.email || "-"}</dd>
              </div>
              <div>
                <dt className="font-sans text-xs text-gray-500">Phone</dt>
                <dd className="font-semibold">
                  {selectedSeller.phoneNumber || "-"}
                </dd>
              </div>
              <div>
                <dt className="font-sans text-xs text-gray-500">Store Type</dt>
                <dd className="font-semibold">{selectedSeller.storeType}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-sans text-xs text-gray-500">
                  Market Location
                </dt>
                <dd className="font-semibold">
                  {selectedSeller.marketLocation || "Not provided"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-sans text-xs text-gray-500">
                  Exact Address
                </dt>
                <dd className="font-semibold">
                  {selectedSeller.exactAddress || "Not provided"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
