import { Crown, Sparkles } from "lucide-react";
import { SellerPlanTier } from "@/types/saas-dashboard";
import { getPlanUpgradeMessage } from "@/config/seller-dashboard";

interface SubscriptionStatusBannerProps {
  plan: SellerPlanTier;
}

const PLAN_TONE: Record<SellerPlanTier, string> = {
  FREE: "from-slate-50 to-white border-slate-200",
  PRO: "from-brand-50 to-white border-brand-200",
  BUSINESS: "from-deal-50 to-white border-deal-200",
};

export function SubscriptionStatusBanner({ plan }: SubscriptionStatusBannerProps) {
  return (
    <div
      className={`rounded-2xl border bg-linear-to-r p-4 ${PLAN_TONE[plan]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Active Subscription
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-foreground">
            {plan === "BUSINESS" ? <Crown className="h-5 w-5 text-deal-700" /> : <Sparkles className="h-5 w-5 text-brand-700" />}
            SukiGo {plan}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{getPlanUpgradeMessage(plan)}</p>
        </div>
      </div>
    </div>
  );
}
