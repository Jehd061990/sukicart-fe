"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SELLER_FEATURES_BY_PLAN } from "@/config/seller-dashboard";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { SellerFeatureKey, SellerPlanTier } from "@/types/saas-dashboard";
import { Button } from "@/components/ui/button";

const parsePermissionInput = (rawValue: string) =>
  Array.from(
    new Set(
      rawValue
        .split(/[\n,]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

export function AccessControlOverridesPanel() {
  const queryClient = useQueryClient();
  const [enabledOverridesState, setEnabledOverridesState] = useState<SellerFeatureKey[] | null>(null);
  const [disabledOverridesState, setDisabledOverridesState] = useState<SellerFeatureKey[] | null>(null);
  const [grantedPermissionsInputState, setGrantedPermissionsInputState] = useState<string | null>(null);
  const [revokedPermissionsInputState, setRevokedPermissionsInputState] = useState<string | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ["seller-subscription-current"],
    queryFn: subscriptionService.getCurrentSubscription,
  });

  const accessControlQuery = useQuery({
    queryKey: ["seller-access-control"],
    queryFn: subscriptionService.getAccessControl,
  });

  const updateAccessMutation = useMutation({
    mutationFn: subscriptionService.updateAccessControl,
    onSuccess: (data) => {
      setEnabledOverridesState((data.overrides.features.enabled || []) as SellerFeatureKey[]);
      setDisabledOverridesState((data.overrides.features.disabled || []) as SellerFeatureKey[]);
      setGrantedPermissionsInputState((data.overrides.permissions.granted || []).join("\n"));
      setRevokedPermissionsInputState((data.overrides.permissions.revoked || []).join("\n"));
      toast.success("Access control overrides updated");
      queryClient.invalidateQueries({ queryKey: ["seller-access-control"] });
      queryClient.invalidateQueries({ queryKey: ["seller-subscription-current"] });
    },
    onError: () => {
      toast.error("Failed to update access control overrides");
    },
  });

  const plan = (subscriptionQuery.data?.subscription?.plan || "FREE") as SellerPlanTier;
  const features = {
    ...(SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE),
    ...(subscriptionQuery.data?.subscription?.featureFlags || {}),
  };
  const serverOverrides = accessControlQuery.data?.overrides;
  const enabledOverrides = enabledOverridesState ?? ((serverOverrides?.features.enabled || []) as SellerFeatureKey[]);
  const disabledOverrides = disabledOverridesState ?? ((serverOverrides?.features.disabled || []) as SellerFeatureKey[]);
  const grantedPermissionsInput = grantedPermissionsInputState ?? (serverOverrides?.permissions.granted || []).join("\n");
  const revokedPermissionsInput = revokedPermissionsInputState ?? (serverOverrides?.permissions.revoked || []).join("\n");
  const allowedFeatureKeys = (accessControlQuery.data?.allowedFeatureKeys ||
    Object.keys(features)) as SellerFeatureKey[];
  const basePlanFeatures = SELLER_FEATURES_BY_PLAN[plan] || SELLER_FEATURES_BY_PLAN.FREE;

  const toggleFeatureOverride = (
    featureKey: SellerFeatureKey,
    mode: "enabled" | "disabled",
  ) => {
    if (mode === "enabled") {
      const exists = enabledOverrides.includes(featureKey);
      const next = exists
        ? enabledOverrides.filter((entry) => entry !== featureKey)
        : [...enabledOverrides, featureKey];
      setEnabledOverridesState(next);
      if (!exists) {
        setDisabledOverridesState((prev) => (prev || disabledOverrides).filter((entry) => entry !== featureKey));
      }
      return;
    }

    const exists = disabledOverrides.includes(featureKey);
    const next = exists
      ? disabledOverrides.filter((entry) => entry !== featureKey)
      : [...disabledOverrides, featureKey];
    setDisabledOverridesState(next);
    if (!exists) {
      setEnabledOverridesState((prev) => (prev || enabledOverrides).filter((entry) => entry !== featureKey));
    }
  };

  const saveAccessOverrides = () => {
    updateAccessMutation.mutate({
      featureOverrides: {
        enabled: enabledOverrides,
        disabled: disabledOverrides,
      },
      permissionOverrides: {
        granted: parsePermissionInput(grantedPermissionsInput),
        revoked: parsePermissionInput(revokedPermissionsInput),
      },
    });
  };

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Access Control Overrides</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Override plan defaults per seller by forcing feature access and granting/revoking granular permissions.
          </p>
        </div>
        <Button
          type="button"
          onClick={saveAccessOverrides}
          disabled={updateAccessMutation.isPending}
        >
          {updateAccessMutation.isPending ? "Saving..." : "Save Overrides"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {allowedFeatureKeys.map((featureKey) => {
          const baseEnabled = Boolean(basePlanFeatures[featureKey]);
          const effectiveEnabled = Boolean(features[featureKey]);
          const forcedEnabled = enabledOverrides.includes(featureKey);
          const forcedDisabled = disabledOverrides.includes(featureKey);

          return (
            <div key={featureKey} className="rounded-xl border p-3">
              <p className="text-sm font-semibold text-foreground">{featureKey}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Plan default: {baseEnabled ? "Enabled" : "Locked"} | Effective: {effectiveEnabled ? "Enabled" : "Locked"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <label className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={forcedEnabled}
                    onChange={() => toggleFeatureOverride(featureKey, "enabled")}
                  />
                  Force enable
                </label>
                <label className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={forcedDisabled}
                    onChange={() => toggleFeatureOverride(featureKey, "disabled")}
                  />
                  Force disable
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold text-foreground">Granted Permissions Override</p>
          <p className="mt-1 text-xs text-muted-foreground">One permission per line (or comma-separated).</p>
          <textarea
            value={grantedPermissionsInput}
            onChange={(event) => setGrantedPermissionsInputState(event.target.value)}
            className="mt-2 h-28 w-full rounded-lg border bg-background px-2 py-2 text-xs"
            placeholder="reports:export\nautomation:manage"
          />
        </div>

        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold text-foreground">Revoked Permissions Override</p>
          <p className="mt-1 text-xs text-muted-foreground">One permission per line (or comma-separated).</p>
          <textarea
            value={revokedPermissionsInput}
            onChange={(event) => setRevokedPermissionsInputState(event.target.value)}
            className="mt-2 h-28 w-full rounded-lg border bg-background px-2 py-2 text-xs"
            placeholder="billing:manage"
          />
        </div>
      </div>
    </article>
  );
}