"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/lib/api/users";

const schema = z.object({
  current_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormData = z.infer<typeof schema>;

export default function PasswordPage() {
  const [show, setShow] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const pw = watch("new_password", "");
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length;
  const strengthColors = ["", "bg-red-500", "bg-accent", "bg-yellow-400", "bg-emerald-500"];

  const onSubmit = async (data: FormData) => {
    try {
      await changePassword(data.current_password, data.new_password);
      toast.success("Password updated");
      reset();
    } catch { toast.error("Current password is incorrect"); }
  };

  const fields: { id: keyof FormData; label: string }[] = [
    { id: "current_password", label: "Current password" },
    { id: "new_password",     label: "New password" },
    { id: "confirm",          label: "Confirm new password" },
  ];

  return (
    <div>
      <h1 className="mb-8 text-[32px] font-medium tracking-[-0.04em] text-ink">Password</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="block text-[12px] font-medium text-ink/40 mb-2">{f.label}</label>
            <div className="relative">
              <input
                {...register(f.id)}
                type={show ? "text" : "password"}
                placeholder="••••••••"
                className="input-base w-full px-4 py-3 text-[14px] pr-11"
              />
              {f.id === "current_password" && (
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            {errors[f.id] && <p className="mt-1.5 text-xs text-red-400">{errors[f.id]?.message}</p>}
            {f.id === "new_password" && pw && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i <= score ? strengthColors[score] : "bg-ink/[0.08]"}`} />
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 rounded-btn-md text-[14px] font-bold bg-ink text-bg disabled:opacity-50 transition hover:opacity-90"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
