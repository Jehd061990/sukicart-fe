import { RoleModuleSection } from "@/components/layout/role-module-section";
import { ROLE_MODULES } from "@/config/navigation";

export default function RiderRolePage() {
  const riderConfig = ROLE_MODULES.find((config) => config.role === "RIDER");

  if (!riderConfig) {
    return null;
  }

  return (
    <RoleModuleSection
      title={riderConfig.title}
      subtitle="Rider workflow modules"
      modules={riderConfig.modules}
    />
  );
}
