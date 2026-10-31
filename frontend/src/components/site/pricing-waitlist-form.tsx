"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { joinWaitlist } from "@/lib/api/misc";
import { Button } from "@/components/ui/button";

const schema = z.object({ email: z.email("Enter a valid email address") });
type WaitlistFormData = z.infer<typeof schema>;

export function PricingWaitlistForm() {
  const [joined, setJoined] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<WaitlistFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: WaitlistFormData) => {
    try {
      await joinWaitlist(email.trim());
      setJoined(true);
      toast.success("You're on the list.");
    } catch {
      toast.error("We couldn't add you right now. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">Email address</label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "waitlist-email-error" : undefined}
          disabled={joined}
          {...register("email")}
          className="min-h-12 min-w-0 flex-1 rounded border border-white/60 bg-transparent px-4 text-base text-white outline-none placeholder:text-white/55 focus:border-white disabled:opacity-60"
        />
        <Button type="submit" disabled={isSubmitting || joined} variant="light" size="lg" className="disabled:opacity-60">
          {joined ? "You're on the list" : isSubmitting ? "Joining…" : "Notify me"}
        </Button>
      </div>
      {errors.email && <p id="waitlist-email-error" role="alert" className="mt-2 text-xs font-medium text-red-300">{errors.email.message}</p>}
    </form>
  );
}
