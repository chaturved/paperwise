import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/api/auth";

export function useLogout() {
  const router = useRouter();
  const { refetchUser } = useAuth();

  return async () => {
    try {
      await logout();
      await refetchUser();
      router.push("/login");
    } catch {
      toast.error("Could not log out. Please try again.");
    }
  };
}
