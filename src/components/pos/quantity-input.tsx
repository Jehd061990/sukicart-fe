"use client";

import { Button } from "@/components/ui/button";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  unit: "kg" | "pcs";
  max?: number;
  enableBulkActions?: boolean;
}

export function QuantityInput({
  value,
  onChange,
  unit,
  max,
  enableBulkActions,
}: QuantityInputProps) {
  const step = unit === "kg" ? 0.25 : 1;
  const bulkStep = unit === "kg" ? 2.5 : 10;

  const onIncrement = () => {
    const next = Number((value + step).toFixed(2));
    onChange(max ? Math.min(next, max) : next);
  };

  const onBulkIncrement = () => {
    const next = Number((value + bulkStep).toFixed(2));
    onChange(max ? Math.min(next, max) : next);
  };

  const onDecrement = () => {
    const next = Number((value - step).toFixed(2));
    onChange(next);
  };

  return (
    <div className="inline-flex items-center gap-2">
      {enableBulkActions ? (
        <Button variant="outline" size="sm" onClick={onBulkIncrement}>
          +{bulkStep}
        </Button>
      ) : null}
      <Button variant="outline" size="sm" onClick={onDecrement}>
        -
      </Button>
      <div className="min-w-20 rounded-md border px-3 py-1 text-center text-sm">
        {value} {unit}
      </div>
      <Button variant="outline" size="sm" onClick={onIncrement}>
        +
      </Button>
    </div>
  );
}
