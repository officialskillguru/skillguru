import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateMentorCourse } from "@/hooks/useMentorPortal";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { SaveStatusIndicator } from "@/components/mentor/course-builder/SaveStatusIndicator";
import type { StepProps } from "@/components/mentor/course-builder/types";

type PricingValues = { price: string; discountPrice: string };

function toValues(course: StepProps["course"]): PricingValues {
  return {
    price: course.price != null ? String(course.price) : "0",
    discountPrice: course.discount_price != null ? String(course.discount_price) : "",
  };
}

export function PricingStep({ course, onDirtyChange }: Readonly<StepProps>) {
  const priceId = useId();
  const discountId = useId();
  const errorId = useId();
  const updateCourse = useUpdateMentorCourse(course.id);

  const [values, setValues] = useState<PricingValues>(() => toValues(course));
  const [validationError, setValidationError] = useState<string | null>(null);

  const autosave = useDebouncedAutosave<PricingValues>(async (v) => {
    const price = Number(v.price);
    const discount = v.discountPrice.trim() === "" ? null : Number(v.discountPrice);
    await updateCourse.mutateAsync({ price, discount_price: discount });
  }, 900);

  useEffect(() => {
    onDirtyChange("pricing", autosave.hasUnsavedWork);
  }, [autosave.hasUnsavedWork, onDirtyChange]);

  const update = (key: keyof PricingValues, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);

    const price = Number(next.price);
    const discount = next.discountPrice.trim() === "" ? null : Number(next.discountPrice);

    if (!Number.isFinite(price) || price < 0) {
      setValidationError("Price must be a number of 0 or more.");
      return;
    }
    if (discount !== null && (!Number.isFinite(discount) || discount < 0)) {
      setValidationError("Discount price must be a number of 0 or more.");
      return;
    }
    if (discount !== null && discount >= price) {
      setValidationError("Discount price must be lower than the regular price.");
      return;
    }
    setValidationError(null);
    autosave.schedule(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pricing</h2>
          <p className="text-sm text-muted-foreground">Set what students pay to enroll. Use 0 for a free course.</p>
        </div>
        <SaveStatusIndicator status={autosave.status} errorMessage={autosave.errorMessage} onRetry={autosave.flush} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={priceId}>Price (₹)</Label>
          <Input
            id={priceId}
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? errorId : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={discountId}>Discount price (₹, optional)</Label>
          <Input
            id={discountId}
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={values.discountPrice}
            onChange={(e) => update("discountPrice", e.target.value)}
            placeholder="No discount"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? errorId : undefined}
          />
        </div>
      </div>

      {validationError && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-destructive-text">
          {validationError}
        </p>
      )}
    </div>
  );
}
