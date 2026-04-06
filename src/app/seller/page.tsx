import { RoleModuleSection } from "@/components/layout/role-module-section";
import { ROLE_MODULES } from "@/config/navigation";

export default function SellerRolePage() {
  const sellerConfig = ROLE_MODULES.find((config) => config.role === "SELLER");

  if (!sellerConfig) {
    return null;
  }

  return (
    <RoleModuleSection
      title={sellerConfig.title}
      subtitle="Seller workflow modules"
      modules={sellerConfig.modules}
    />
  );
}
