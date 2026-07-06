"use client";

import { useState, FormEvent, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { posService } from "@/lib/api/services/pos.service";

interface EditPOSModalProps {
  open: boolean;
  onClose: () => void;
  pos: {
    id: string;
    posName: string;
    email?: string;
    username: string;
    branchId?: string | null;
    assignedUserId?: string | null;
    deviceStatus?: "active" | "inactive" | "suspended";
  } | null;
  branches: { _id: string; branchName: string }[];
}

export function EditPOSModal({ open, onClose, pos, branches }: EditPOSModalProps) {
  const queryClient = useQueryClient();
  const [posName, setPosName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<"active" | "inactive" | "suspended">("active");

  useEffect(() => {
    if (pos) {
      setPosName(pos.posName || "");
      setEmail(pos.email || "");
      setUsername(pos.username || "");
      setPassword("");
      setBranchId(pos.branchId || "");
      setAssignedUserId(pos.assignedUserId || "");
      setDeviceStatus(pos.deviceStatus || "active");
    }
  }, [pos]);

  const updatePOSMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      posName?: string;
      email?: string;
      username?: string;
      password?: string;
      branchId?: string;
      assignedUserId?: string;
      deviceStatus?: "active" | "inactive" | "suspended";
    }) => posService.updatePOSAccount(payload.id, payload),
    onSuccess: (data) => {
      toast.success(data.message || "POS account updated");
      queryClient.invalidateQueries({ queryKey: ["seller-pos-list"] });
      queryClient.invalidateQueries({ queryKey: ["seller-pos-sessions"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to update POS account");
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pos) return;
    updatePOSMutation.mutate({
      id: pos.id,
      posName: posName.trim() || undefined,
      email: email.trim() || undefined,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      branchId: branchId || undefined,
      assignedUserId: assignedUserId.trim() || undefined,
      deviceStatus,
    });
  };

  if (!open || !pos) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <CardHeader>
          <CardTitle>Edit POS Device</CardTitle>
          <CardDescription>Update POS device details and assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input value={posName} onChange={e => setPosName(e.target.value)} placeholder="POS Device Name" />
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="New Password" type="password" />
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Main Branch</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.branchName}</option>
              ))}
            </select>
            <Input value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} placeholder="Assigned Cashier/User ID" />
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" value={deviceStatus} onChange={e => setDeviceStatus(e.target.value as any)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={updatePOSMutation.isLoading}>Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
