"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { requestDemo } from "@/lib/api/misc";
import { rateLimitMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";

const TEAM_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2 to 10 people" },
  { value: "11-50", label: "11 to 50 people" },
  { value: "51+", label: "More than 50" },
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(120),
  email: z.email("Enter a valid email address"),
  company: z.string().trim().max(160).optional(),
  team_size: z.enum(["", "solo", "2-10", "11-50", "51+"]),
  message: z.string().trim().max(2000, "Keep it under 2,000 characters").optional(),
  website: z.string().max(0),
});
type FormData = z.infer<typeof schema>;

const FIELD = "input-base min-h-12 w-full px-4 text-base";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function DemoRequestForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { team_size: "", website: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await requestDemo({
        name: data.name,
        email: data.email,
        company: data.company || undefined,
        team_size: data.team_size || undefined,
        message: data.message || undefined,
        website: data.website,
      });
      setSent(true);
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? "We couldn't send your request. Please try again, or email us.");
    }
  };

  if (sent) {
    return (
      <div role="status" className="rounded-lg border border-line bg-surface p-8">
        <h2 className="font-display text-[28px] font-normal tracking-[-0.0125em]">Thanks, we have your request</h2>
        <p className="mt-3 max-w-[44ch] text-base leading-relaxed text-ink/70">
          We will reply by email to arrange a time. If you would like to start before then, you can upload a file for
          free.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-lg border border-line bg-surface p-6 md:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="demo-name" label="Your name" error={errors.name?.message}>
          <input
            id="demo-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
            className={FIELD}
          />
        </Field>
        <Field id="demo-email" label="Work email" error={errors.email?.message}>
          <input
            id="demo-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
            className={FIELD}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="demo-company" label="Company or business (optional)">
          <input id="demo-company" autoComplete="organization" {...register("company")} className={FIELD} />
        </Field>
        <Field id="demo-team" label="Team size (optional)">
          <select id="demo-team" {...register("team_size")} className={FIELD}>
            <option value="">Choose one</option>
            {TEAM_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="demo-message" label="What would you like to see? (optional)" error={errors.message?.message}>
        <textarea
          id="demo-message"
          rows={4}
          placeholder="For example: checking payment terms in client contracts"
          {...register("message")}
          className={`${FIELD} resize-y py-3`}
        />
      </Field>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="demo-website">Leave this empty</label>
        <input id="demo-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <Button type="submit" disabled={isSubmitting} size="lg" className="w-full disabled:opacity-60 sm:w-auto">
        {isSubmitting ? "Sending…" : "Request a demo"}
      </Button>
    </form>
  );
}
