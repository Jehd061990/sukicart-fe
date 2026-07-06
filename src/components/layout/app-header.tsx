"use client";

import { useRouter } from "next/navigation";
import { Bell, Menu, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";

interface AppHeaderProps {
  onOpenMenu?: () => void;
}

export function AppHeader({ onOpenMenu }: AppHeaderProps) {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const canSeeCart = userRole === "BUYER";
  const searchHintByRole: Record<string, string> = {
    ADMIN: "Search sellers, riders, buyers, orders...",
    BUYER: "Search products, stores, and orders...",
    SELLER: "Search products, orders, customers...",
    POS: "Search products, tickets, and transactions...",
    RIDER: "Search assigned deliveries and status...",
  };
  const searchHint = searchHintByRole[userRole || ""] || "Search...";
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <header className="sticky top-0 z-0 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={onOpenMenu}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex">
            <Search className="h-4 w-4" />
            <span>{searchHint}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {canSeeCart ? (
            <Button
              variant="ghost"
              className="relative"
              aria-label="Open cart"
              onClick={() => router.push("/buyer/cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              ) : null}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="hidden sm:inline-flex"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
