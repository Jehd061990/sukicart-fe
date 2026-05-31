"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { branchService } from "@/lib/api/services/branch.service";
import { posService } from "@/lib/api/services/pos.service";
import {
  POS_SELLER_DEFAULT_RETURN_PATH,
  POS_SELLER_AUTH_BACKUP_KEY,
  POS_SELLER_RETURN_PATH_KEY,
  POS_SELLER_SWITCH_FLAG_KEY,
  POS_SELLER_SWITCH_FLAG_VALUE,
} from "@/constants/pos-switch";
import { useAuthStore } from "@/store/auth.store";
import { CreatePOSModal } from "@/components/pos/CreatePOSModal";
import { EditPOSModal } from "@/components/pos/EditPOSModal";
import { VirtualizedSimpleBarList } from "@/components/ui/virtualized-simplebar-list";

const getStableDeviceId = () => {
  if (typeof window === "undefined") {
    return "server-device";
  }

  const storageKey = "sukigo-device-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(storageKey, generated);
  return generated;
};

const asErrorMessage = (error: unknown, fallback: string) => {
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

const toDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
};

const statusVariant = (status: string) => {
  if (["active", "paid"].includes(status)) {
    return "success" as const;
  }

  if (["pending", "trial", "inactive"].includes(status)) {
    return "warning" as const;
  }

  if (["failed", "cancelled", "expired", "past_due", "suspended", "archived"].includes(status)) {
    return "destructive" as const;
  }

  return "secondary" as const;
};

export default function SellerPOSPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [posName, setPosName] = useState("");
  const [posEmail, setPosEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [posBranchId, setPosBranchId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<"active" | "inactive" | "suspended">("active");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<{
    id: string;
    posName: string;
    email?: string;
    username: string;
    branchId?: string | null;
    assignedUserId?: string | null;
    deviceStatus?: "active" | "inactive" | "suspended";
  } | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["seller-branches"],
    queryFn: branchService.listBranches,
  });

  const posListQuery = useQuery({
    queryKey: ["seller-pos-list"],
    queryFn: posService.listPOSAccounts,
  });

  const sessionListQuery = useQuery({
    queryKey: ["seller-pos-sessions"],
    queryFn: posService.listSessions,
  });

  const createPOSMutation = useMutation({
    mutationFn: posService.createPOSAccount,
    onSuccess: (data) => {
      setGeneratedPassword(data.generatedPassword || null);
      setPosName("");
      setPosEmail("");
      setUsername("");
      setPassword("");
      setPosBranchId("");
      setAssignedUserId("");
      setDeviceStatus("active");
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to create POS account"));
    },
  });

  // Edit POS logic is now handled in EditPOSModal

  const deactivatePOSMutation = useMutation({
    mutationFn: posService.deactivatePOSAccount,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to deactivate POS account"));
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: posService.forceLogoutSession,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to revoke session"));
    },
  });

  const launchPOSMutation = useMutation({
    mutationFn: ({ id }: { id: string; posName: string }) =>
      posService.launchPOSAccount(id, {
        deviceId: getStableDeviceId(),
        deviceName:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : "Seller POS Quick Access",
      }),
    onSuccess: (response, variables) => {
      setAuth(
        response.accessToken,
        response.refreshToken,
        response.user,
        response.sessionId,
        response.posUsage || null,
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          POS_SELLER_SWITCH_FLAG_KEY,
          POS_SELLER_SWITCH_FLAG_VALUE,
        );
      }
      toast.success(`Switched to ${variables.posName}`);
      router.push("/pos");
    },
    onError: (error: unknown) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(POS_SELLER_AUTH_BACKUP_KEY);
        window.sessionStorage.removeItem(POS_SELLER_RETURN_PATH_KEY);
        window.sessionStorage.removeItem(POS_SELLER_SWITCH_FLAG_KEY);
      }
      toast.error(asErrorMessage(error, "Failed to open selected POS"));
    },
  });

  const usageLabel = useMemo(() => {
    const usage = posListQuery.data?.usage;
    if (!usage) {
      return "POS usage: - / - active devices";
    }

    return `POS usage: ${usage.active} / ${usage.total} active devices`;
  }, [posListQuery.data?.usage]);

  const onCreatePOS = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!posName.trim()) {
      toast.error("POS device name is required");
      return;
    }

    createPOSMutation.mutate({
      posName: posName.trim(),
      email: posEmail.trim() || undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      autoGeneratePassword: !password.trim(),
      branchId: posBranchId || undefined,
      assignedUserId: assignedUserId.trim() || undefined,
      deviceStatus,
    });
  };

  // Edit POS logic is now handled in EditPOSModal

  const launchSelectedPOS = (pos: { id: string; posName: string }) => {
    const authState = useAuthStore.getState();
    if (authState.user?.role !== "SELLER") {
      toast.error("Only seller accounts can switch into POS");
      return;
    }

    if (typeof window !== "undefined") {
      const backup = {
        accessToken: authState.accessToken || authState.token,
        refreshToken: authState.refreshToken,
        user: authState.user,
        sessionId: authState.sessionId,
        posUsage: authState.posUsage,
      };
      window.sessionStorage.setItem(POS_SELLER_AUTH_BACKUP_KEY, JSON.stringify(backup));
      window.sessionStorage.setItem(POS_SELLER_RETURN_PATH_KEY, POS_SELLER_DEFAULT_RETURN_PATH);
    }

    launchPOSMutation.mutate({ id: pos.id, posName: pos.posName });
  };

  const ORDER_LIST_HEIGHT_PX = 460;
  const ORDER_CARD_ESTIMATE_SIZE_PX = 96;
  const ORDER_CARD_GAP_PX = 12;
  const POS_MOBILE_LIST_HEIGHT = "clamp(320px, 60vh, 560px)";
  const POS_MOBILE_CARD_ESTIMATE_SIZE_PX = 232;
  const POS_TABLE_HEIGHT = "clamp(280px, 58vh, 520px)";
  const POS_ROW_ESTIMATE_SIZE_PX = 96;

  return (
    <div className="space-y-6">
      {/* <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 font-sans text-xs font-medium text-brand-700">
          POS Device Control Center
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          POS Devices and Sessions
        </h1>
        <p className="mt-2 font-sans text-sm text-gray-700">{usageLabel}</p>
      </section> */}

      <section>
        <div className="flex justify-end mb-2">
          {/* <p className="mt-2 font-sans text-sm text-gray-700">{usageLabel}</p> */}
          <Button onClick={() => setCreateModalOpen(true)} variant="default">
            + Add POS Device
          </Button>
        </div>
        <CreatePOSModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
        <Card>
          <CardHeader>
            <CardTitle>POS Device Management</CardTitle>
            <CardDescription>
              Register devices, assign branch and cashier, manage status, and
              control active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="mt-2 font-sans text-sm text-primary-700">{usageLabel}</p>
            <div className="md:hidden">
              <VirtualizedSimpleBarList
                items={posListQuery.data?.data || []}
                height={POS_MOBILE_LIST_HEIGHT}
                estimateSize={POS_MOBILE_CARD_ESTIMATE_SIZE_PX}
                gap={12}
                overscan={6}
                getItemKey={(pos) => pos.id}
                renderItem={(pos) => (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="space-y-1">
                      <p
                        className="truncate text-base font-semibold text-slate-900"
                        title={pos.posName}
                      >
                        {pos.posName}
                      </p>
                      <p
                        className="truncate text-xs text-slate-600"
                        title={pos.email || "-"}
                      >
                        {pos.email || "-"}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-700">
                      <p className="truncate" title={pos.username}>
                        <span className="font-semibold">Username:</span>{" "}
                        {pos.username}
                      </p>
                      <p
                        className="truncate"
                        title={pos.branchName || "Main Branch"}
                      >
                        <span className="font-semibold">Branch:</span>{" "}
                        {pos.branchName || "Main Branch"}
                      </p>
                      <p className="truncate" title={pos.assignedUserId || "-"}>
                        <span className="font-semibold">Assigned:</span>{" "}
                        {pos.assignedUserId || "-"}
                      </p>
                      <p
                        className="truncate"
                        title={pos.activeSession?.deviceName || "-"}
                      >
                        <span className="font-semibold">Session:</span>{" "}
                        {pos.activeSession?.deviceName || "-"}
                      </p>
                    </div>

                    <div className="mt-3">
                      <Badge
                        variant={statusVariant(pos.deviceStatus || pos.status)}
                      >
                        {pos.isDeactivated
                          ? "deactivated"
                          : pos.deviceStatus || pos.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          launchPOSMutation.isPending ||
                          pos.isDeactivated ||
                          (pos.deviceStatus || "active") !== "active"
                        }
                        onClick={() =>
                          launchSelectedPOS({
                            id: pos.id,
                            posName: pos.posName,
                          })
                        }
                      >
                        {launchPOSMutation.isPending &&
                        launchPOSMutation.variables?.id === pos.id
                          ? "Opening..."
                          : "Open POS"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPos({
                            id: pos.id,
                            posName: pos.posName,
                            email: pos.email,
                            username: pos.username,
                            branchId: pos.branchId,
                            assignedUserId: pos.assignedUserId,
                            deviceStatus: pos.deviceStatus,
                          });
                          setEditModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          deactivatePOSMutation.isPending || pos.isDeactivated
                        }
                        onClick={() => deactivatePOSMutation.mutate(pos.id)}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-372">
                <div className="grid grid-cols-[11rem_14rem_10rem_9rem_10rem_9rem_14rem_16rem] border-b text-left text-sm font-medium text-slate-700">
                  <div className="px-2 py-2">Device</div>
                  <div className="px-2 py-2">Email</div>
                  <div className="px-2 py-2">Username</div>
                  <div className="px-2 py-2">Branch</div>
                  <div className="px-2 py-2">Assigned User</div>
                  <div className="px-2 py-2">Device Status</div>
                  <div className="px-2 py-2">Session Device</div>
                  <div className="px-2 py-2">Actions</div>
                </div>

                <VirtualizedSimpleBarList
                  items={posListQuery.data?.data || []}
                  height={POS_TABLE_HEIGHT}
                  estimateSize={POS_ROW_ESTIMATE_SIZE_PX}
                  overscan={8}
                  contentClassName="relative"
                  itemClassName="absolute left-0 top-0 w-full"
                  hideHorizontalOverflow
                  getItemKey={(pos) => pos.id}
                  renderItem={(pos) => (
                    <div className="grid min-h-20 grid-cols-[11rem_14rem_10rem_9rem_10rem_9rem_14rem_16rem] items-center border-b bg-white text-sm">
                      <div className="truncate px-2 py-2" title={pos.posName}>
                        {pos.posName}
                      </div>
                      <div
                        className="truncate px-2 py-2"
                        title={pos.email || "-"}
                      >
                        {pos.email || "-"}
                      </div>
                      <div className="truncate px-2 py-2" title={pos.username}>
                        {pos.username}
                      </div>
                      <div
                        className="truncate px-2 py-2"
                        title={pos.branchName || "Main Branch"}
                      >
                        {pos.branchName || "Main Branch"}
                      </div>
                      <div
                        className="truncate px-2 py-2"
                        title={pos.assignedUserId || "-"}
                      >
                        {pos.assignedUserId || "-"}
                      </div>
                      <div className="px-2 py-2">
                        <Badge
                          variant={statusVariant(
                            pos.deviceStatus || pos.status,
                          )}
                        >
                          {pos.isDeactivated
                            ? "deactivated"
                            : pos.deviceStatus || pos.status}
                        </Badge>
                      </div>
                      <div
                        className="truncate px-2 py-2"
                        title={pos.activeSession?.deviceName || "-"}
                      >
                        {pos.activeSession?.deviceName || "-"}
                      </div>
                      <div className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              launchPOSMutation.isPending ||
                              pos.isDeactivated ||
                              (pos.deviceStatus || "active") !== "active"
                            }
                            onClick={() =>
                              launchSelectedPOS({
                                id: pos.id,
                                posName: pos.posName,
                              })
                            }
                          >
                            {launchPOSMutation.isPending &&
                            launchPOSMutation.variables?.id === pos.id
                              ? "Opening..."
                              : "Open POS"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPos({
                                id: pos.id,
                                posName: pos.posName,
                                email: pos.email,
                                username: pos.username,
                                branchId: pos.branchId,
                                assignedUserId: pos.assignedUserId,
                                deviceStatus: pos.deviceStatus,
                              });
                              setEditModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              deactivatePOSMutation.isPending ||
                              pos.isDeactivated
                            }
                            onClick={() => deactivatePOSMutation.mutate(pos.id)}
                          >
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Active Sessions
              </p>
              <VirtualizedSimpleBarList
                items={sessionListQuery.data?.data || []}
                height={ORDER_LIST_HEIGHT_PX}
                estimateSize={ORDER_CARD_ESTIMATE_SIZE_PX}
                gap={ORDER_CARD_GAP_PX}
                overscan={8}
                // className="rounded-xl border border-slate-200 bg-slate-50/70"
                getItemKey={(session) => session.id}
                renderItem={(session) => (
                  <div
                    key={session.id}
                    className="flex min-h-21 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {session.role} -{" "}
                        {session.deviceName || session.deviceId}
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        Last active: {toDate(session.lastActiveAt)} | IP:{" "}
                        {session.ipAddress || "-"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={forceLogoutMutation.isPending}
                      onClick={() => forceLogoutMutation.mutate(session.id)}
                    >
                      Force Logout
                    </Button>
                  </div>
                )}
              />
            </div> */}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            {/* <CardDescription>
              Register devices, assign branch and cashier, manage status, and
              control active sessions.
            </CardDescription> */}
            <CardContent className=" px-0">
              {/* <div className="space-y-2"> */}
              <VirtualizedSimpleBarList
                items={sessionListQuery.data?.data || []}
                height={ORDER_LIST_HEIGHT_PX}
                estimateSize={ORDER_CARD_ESTIMATE_SIZE_PX}
                gap={ORDER_CARD_GAP_PX}
                overscan={8}
                // className="rounded-xl border border-slate-200 bg-slate-50/70"
                getItemKey={(session) => session.id}
                renderItem={(session) => (
                  <div
                    key={session.id}
                    className="flex min-h-21 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {session.role} -{" "}
                        {session.deviceName || session.deviceId}
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        Last active: {toDate(session.lastActiveAt)} | IP:{" "}
                        {session.ipAddress || "-"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={forceLogoutMutation.isPending}
                      onClick={() => forceLogoutMutation.mutate(session.id)}
                    >
                      Force Logout
                    </Button>
                  </div>
                )}
              />
              {/* </div> */}
            </CardContent>
          </CardHeader>
        </Card>
        <EditPOSModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          pos={editingPos}
          branches={branchesQuery.data?.branches || []}
        />
      </section>
    </div>
  );
}
