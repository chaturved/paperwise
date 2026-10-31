"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.email("Enter a valid email address") });
type FormData = z.infer<typeof schema>;

interface Props {
  submitLabel: string;
  busyLabel?: string;
  defaultEmail?: string;
  onSubmit: (email: string) => string | void | Promise<string | void>;
}

export function EmailForm({ submitLabel, busyLabel = "Please wait…", defaultEmail = "", onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const message = await onSubmit(data.email);
        if (message) setError("email", { message });
      })}
      noValidate
      className="space-y-4"
    >
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>
      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60">
        {isSubmitting ? busyLabel : submitLabel}
      </Button>
    </form>
  );
}
