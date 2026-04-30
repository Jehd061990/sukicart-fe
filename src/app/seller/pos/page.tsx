"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { posService } from "@/lib/api/services/pos.service";

export default function SellerPOSPage() {
  const [posName, setPosName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const posListQuery = useQuery({
    queryKey: ["seller-pos-list"],
    queryFn: posService.listPOSAccounts,
  });

  const sessionListQuery = useQuery({
    queryKey: ["seller-pos-sessions"],
    queryFn: posService.listSessions,
  });

  const createPOSMutation = useMutation({
    mutationFn: () =>
      posService.createPOSAccount({
        posName,
        username: username || undefined,
        password: password || undefined,
        autoGeneratePassword: !password,
      }),
    onSuccess: (data) => {
      setGeneratedPassword(data.generatedPassword || null);
      setPosName("");
      setUsername("");
      setPassword("");
      toast.success(data.message);
      posListQuery.refetch();
      sessionListQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Failed to create POS account";

      toast.error(message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (posId: string) => posService.deactivatePOSAccount(posId),
    onSuccess: () => {
      toast.success("POS deactivated");
      posListQuery.refetch();
      sessionListQuery.refetch();
    },
    onError: () => toast.error("Failed to deactivate POS"),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (sessionId: string) => posService.forceLogoutSession(sessionId),
    onSuccess: () => {
      toast.success("Session revoked");
      posListQuery.refetch();
      sessionListQuery.refetch();
    },
    onError: () => toast.error("Failed to revoke session"),
  });

  const usageLabel = useMemo(() => {
    const usage = posListQuery.data?.usage;
    if (!usage) {
      return "POS usage: - / - active";
    }

    return `POS usage: ${usage.active} / ${usage.total} active`;
  }, [posListQuery.data?.usage]);

  const onCreatePOS = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!posName.trim()) {
      toast.error("POS name is required");
      return;
    }

    createPOSMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 via-white to-deal-50 p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 font-sans text-xs font-medium text-brand-700">
          POS Admin
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-900 sm:text-3xl">
          POS Management
        </h1>
        <p className="mt-2 font-sans text-sm text-gray-700">{usageLabel}</p>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Create POS Account
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onCreatePOS}>
          <Input
            value={posName}
            onChange={(event) => setPosName(event.target.value)}
            placeholder="POS name (e.g., Cashier 1)"
          />
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username (optional)"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (optional)"
            type="password"
          />
          <Button type="submit" disabled={createPOSMutation.isPending}>
            {createPOSMutation.isPending ? "Creating..." : "Create POS"}
          </Button>
        </form>
        {generatedPassword ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-900">
            Generated password: {generatedPassword}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          POS Accounts
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Username</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Device</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(posListQuery.data?.data || []).map((pos) => (
                <tr key={pos.id} className="border-b">
                  <td className="px-2 py-2">{pos.posName}</td>
                  <td className="px-2 py-2">{pos.username}</td>
                  <td className="px-2 py-2">{pos.isDeactivated ? "deactivated" : pos.status}</td>
                  <td className="px-2 py-2">{pos.activeSession?.deviceName || "-"}</td>
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deactivateMutation.isPending || pos.isDeactivated}
                      onClick={() => deactivateMutation.mutate(pos.id)}
                    >
                      Deactivate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Active Sessions
        </h2>
        <div className="mt-3 space-y-2">
          {(sessionListQuery.data?.data || []).map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {session.role} - {session.deviceName || session.deviceId}
                </p>
                <p className="text-xs text-gray-600">
                  Last active: {new Date(session.lastActiveAt).toLocaleString()} | IP: {session.ipAddress || "-"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={forceLogoutMutation.isPending}
                onClick={() => forceLogoutMutation.mutate(session.id)}
              >
                Force logout
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
