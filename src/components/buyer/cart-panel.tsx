"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/store/cart.store";

export function CartPanel() {
  const items = useCartStore((state) => state.items);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = useCartStore((state) => state.subtotal());

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <Button
          variant="outline"
          onClick={clearCart}
          disabled={items.length === 0}
        >
          Clear Cart
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Your cart is empty.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.productId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-600">
                    PHP {item.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decreaseQuantity(item.productId)}
                    >
                      -
                    </Button>
                    <span className="min-w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => increaseQuantity(item.productId)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-semibold">
            PHP {subtotal.toFixed(2)}
          </span>
        </CardContent>
      </Card>
    </section>
  );
}
