import { OrderStatus } from "@/types/delivery";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
];

interface OrderStatusTimelineProps {
  status: OrderStatus;
}

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentIndex = ORDER_STATUSES.indexOf(status);

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-4 text-base font-semibold">Order Timeline</h3>
      <ol className="space-y-3">
        {ORDER_STATUSES.map((step, index) => {
          const isDone = index <= currentIndex;

          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${isDone ? "bg-primary" : "bg-muted"}`}
                aria-hidden
              />
              <p
                className={`${isDone ? "text-foreground" : "text-muted-foreground"}`}
              >
                {step.replaceAll("_", " ")}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
