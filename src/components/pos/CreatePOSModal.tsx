"use client";

import { useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { posService } from "@/lib/api/services/pos.service";

interface CreatePOSModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePOSModal({ open, onClose }: CreatePOSModalProps) {
  const queryClient = useQueryClient();
  const [posName, setPosName] = useState("");
  const [posEmail, setPosEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [posBranchId, setPosBranchId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<"active" | "inactive" | "suspended">("active");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

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
      onClose();
    },
    onError: (error: unknown) => {
      toast.error("Failed to create POS account");
    },
  });

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <CardHeader>
          <CardTitle>POS Device Management</CardTitle>
          <CardDescription>
            Register devices, assign branch and cashier, manage status, and control active sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onCreatePOS}>
            <Input
              value={posName}
              onChange={(event) => setPosName(event.target.value)}
              placeholder="POS Device Name"
            />
            <Input
              value={posEmail}
              onChange={(event) => setPosEmail(event.target.value)}
              placeholder="Email (optional)"
              type="email"
            />
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (optional)"
              type="password"
            />
            {/* TODO: Add branch and assigned user dropdowns if needed */}
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={deviceStatus}
              onChange={(e) => setDeviceStatus(e.target.value as any)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={createPOSMutation.isLoading}>
                Create POS Device
              </Button>
            </div>
            {generatedPassword && (
              <div className="mt-2 rounded bg-slate-100 p-2 text-xs text-slate-700">
                Generated password: <span className="font-mono">{generatedPassword}</span>
              </div>
            )}
          </form>
        </CardContent>
      </div>
    </div>
  );
}
