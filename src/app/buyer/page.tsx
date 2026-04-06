import { RoleModuleSection } from "@/components/layout/role-module-section";
import { ROLE_MODULES } from "@/config/navigation";

export default function BuyerRolePage() {
  const buyerConfig = ROLE_MODULES.find((config) => config.role === "BUYER");

  if (!buyerConfig) {
    return null;
  }

  return (
    <RoleModuleSection
      title={buyerConfig.title}
      subtitle="Buyer workflow modules"
      modules={buyerConfig.modules}
    />
  );
}
