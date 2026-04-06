import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NavItem } from "@/config/navigation";

interface RoleModuleSectionProps {
  title: string;
  subtitle: string;
  modules: NavItem[];
}

export function RoleModuleSection({
  title,
  subtitle,
  modules,
}: RoleModuleSectionProps) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-xl border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">{module.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
