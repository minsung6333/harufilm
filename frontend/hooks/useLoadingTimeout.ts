import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useLoadingTimeout(isLoading: boolean, seconds = 30, redirectTo = "/") {
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => router.replace(redirectTo), seconds * 1000);
    return () => clearTimeout(timeout);
  }, [isLoading, seconds, redirectTo, router]);
}
