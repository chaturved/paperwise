"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const schema = z.object({ email: z.email("Enter a valid email address") });
type FormData = z.infer<typeof schema>;

interface Props {
  submitLabel: string;
  busyLabel?: string;
  defaultEmail?: string;
  onSubmit: (email: string) => void | Promise<void>;
}

export function EmailForm({ submitLabel, busyLabel = "Please wait…", defaultEmail = "", onSubmit }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data.email))} noValidate className="space-y-4">
      <Field id="email" label="Email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
          className="field"
        />
      </Field>
      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60">
        {isSubmitting ? busyLabel : submitLabel}
      </Button>
    </form>
  );
}
