"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { deleteAccount, updateProfile } from "@/lib/api/users";
import { useRouter } from "next/navigation";

const schema = z.object({ full_name: z.string().min(2, "Name must be at least 2 characters") });
type FormData = z.infer<typeof schema>;

export function ProfileForm() {
  const { user, refetchUser } = useAuth();
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: user?.full_name || "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateProfile(data.full_name);
      await refetchUser();
      toast.success("Profile updated");
    } catch { toast.error("Failed to update profile"); }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      await refetchUser();
      router.push("/login");
    } catch { toast.error("Failed to delete account"); setDeleting(false); }
  };

  return (
    <div>
      <h1 className="mb-8 font-display text-[40px] font-normal tracking-[-0.0125em] text-ink">Profile</h1>

      {/* Avatar */}
      <div className="mb-8">
        <p className="text-[12px] font-medium text-ink/40 mb-3">Avatar</p>
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-ink text-xl font-semibold text-bg">
          {user?.avatar_initials || "??"}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-[12px] font-medium text-ink/40 mb-2">Full name</label>
          <input
            {...register("full_name")}
            className="input-base w-full px-4 py-3 text-[14px]"
          />
          {errors.full_name && <p className="mt-1.5 text-xs text-red-400">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink/40 mb-2">Email</label>
          <div className="flex items-center gap-3">
            <input
              value={user?.email || ""}
              readOnly
              className="min-w-0 flex-1 cursor-not-allowed rounded-btn-md border border-ink/[0.08] bg-ink/[0.03] px-4 py-3 text-[14px] text-ink/50 outline-none"
            />
            <span className="badge-verified">Verified</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-lg disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="mt-10 pt-8 border-t-system">
        <h2 className="mb-2 text-[16px] font-semibold text-red-500">Delete account</h2>
        <p className="mb-5 text-[13px] leading-relaxed text-ink/55">
          Deleting your account permanently removes all your documents, conversations, and data.
        </p>

        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="btn-danger">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <p className="text-xs text-ink/40">
              Type <span className="font-mono text-ink">DELETE</span> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="input-base h-10 w-full border-red-500/25 px-4 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="h-9 px-4 rounded-lg text-sm text-ink/50 hover:text-ink transition bg-ink/[0.04] border-system"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteInput !== "DELETE" || deleting}
                className="h-9 rounded-md bg-red-600 px-4 text-sm text-white transition disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
