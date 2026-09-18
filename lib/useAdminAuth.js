import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";

export function useAdminAuth({ required = true } = {}) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.admin) {
          setAdmin(data.admin);
          setLoading(false);
          return data.admin;
        }
      }
    } catch (err) {
      console.warn("Auth check error:", err);
    }

    setAdmin(null);
    setLoading(false);

    if (required && typeof window !== "undefined") {
      const returnUrl = encodeURIComponent(router.asPath || "/");
      router.replace(`/admin/login?returnUrl=${returnUrl}`);
    }
    return null;
  }, [required, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setAdmin(null);
    router.push("/admin/login");
  }, [router]);

  return { admin, loading, logout, checkAuth };
}

export default useAdminAuth;
