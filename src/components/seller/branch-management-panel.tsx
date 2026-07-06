"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { branchService } from "@/lib/api/services/branch.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusVariant = (status: string) => {
  if (["active", "paid"].includes(status)) {
    return "success" as const;
  }

  if (["pending", "trial", "inactive"].includes(status)) {
    return "warning" as const;
  }

  if (["failed", "cancelled", "expired", "past_due", "archived"].includes(status)) {
    return "destructive" as const;
  }

  return "secondary" as const;
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

export function BranchManagementPanel() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchContactNumber, setBranchContactNumber] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["seller-branches"],
    queryFn: branchService.listBranches,
  });

  const createBranchMutation = useMutation({
    mutationFn: branchService.createBranch,
    onSuccess: (data) => {
      toast.success(data.message);
      setBranchName("");
      setBranchAddress("");
      setBranchContactNumber("");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to create branch"));
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" | "archived" }) =>
      branchService.updateBranch(id, { status }),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to update branch"));
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: branchService.deleteBranch,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["seller-branches"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: (error: unknown) => {
      toast.error(asErrorMessage(error, "Failed to delete branch"));
    },
  });

  const onCreateBranch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }

    createBranchMutation.mutate({
      branchName: branchName.trim(),
      address: branchAddress.trim(),
      contactNumber: branchContactNumber.trim(),
    });
  };

  const onCloseCreateModal = () => {
    if (createBranchMutation.isPending) {
      return;
    }

    setIsCreateModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Management</CardTitle>
        <CardDescription>
          Create, update, and archive branches used by your seller operation and POS assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
            Create Branch
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {branchesQuery.isLoading ? (
            <p className="rounded-xl border p-3 text-sm text-muted-foreground">Loading branches...</p>
          ) : null}

          {(branchesQuery.data?.branches || []).map((branch) => (
            <div key={branch._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div>
                <p className="font-medium text-slate-900">{branch.branchName}</p>
                <p className="text-xs text-muted-foreground">
                  {branch.address || "No address"} | {branch.contactNumber || "No contact"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={statusVariant(branch.status)}>{branch.status}</Badge>
                  {branch.isDefault ? <Badge variant="secondary">Main Branch</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateBranchMutation.isPending}
                  onClick={() =>
                    updateBranchMutation.mutate({
                      id: branch._id,
                      status: branch.status === "active" ? "inactive" : "active",
                    })
                  }
                >
                  {branch.status === "active" ? "Set Inactive" : "Set Active"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateBranchMutation.isPending}
                  onClick={() =>
                    updateBranchMutation.mutate({
                      id: branch._id,
                      status: "archived",
                    })
                  }
                >
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteBranchMutation.isPending || branch.isDefault}
                  onClick={() => deleteBranchMutation.mutate(branch._id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {!branchesQuery.isLoading && (branchesQuery.data?.branches || []).length === 0 ? (
            <p className="rounded-xl border p-3 text-sm text-muted-foreground">No branches yet. Create your first branch.</p>
          ) : null}
        </div>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Create Branch</CardTitle>
                <CardDescription>
                  Add a new branch for seller operations and POS assignment.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0">
                <form className="grid gap-3" onSubmit={onCreateBranch}>
                  <Input
                    value={branchName}
                    onChange={(event) => setBranchName(event.target.value)}
                    placeholder="Branch Name"
                  />
                  <Input
                    value={branchAddress}
                    onChange={(event) => setBranchAddress(event.target.value)}
                    placeholder="Address"
                  />
                  <Input
                    value={branchContactNumber}
                    onChange={(event) => setBranchContactNumber(event.target.value)}
                    placeholder="Contact Number"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={onCloseCreateModal}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBranchMutation.isPending}>
                      {createBranchMutation.isPending ? "Creating..." : "Create Branch"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}