"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { joinWaitlist } from "@/lib/api/misc";
import { Button } from "@/components/ui/button";

export function ProWaitlist() {
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!user?.email) return;
    setJoining(true);
    try {
      await joinWaitlist(user.email);
      setJoined(true);
      toast.success("You're on the list.");
    } catch {
      toast.error("We couldn't add you right now. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        type="button"
        onClick={join}
        disabled={joined || joining || !user}
        size="lg"
        className="disabled:opacity-60"
      >
        {joined ? "You're on the list" : joining ? "Joining…" : "Join the waitlist"}
      </Button>
      {user?.email && <span className="text-sm text-muted">We will email {user.email}.</span>}
    </div>
  );
}
