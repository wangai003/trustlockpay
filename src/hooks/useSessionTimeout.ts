import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const useSessionTimeout = (loginPath: string) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await signOut();
      // Clear any testnet auth flags + admin session credential
      localStorage.removeItem("tl_buyer_auth");
      localStorage.removeItem("tl_vendor_auth");
      localStorage.removeItem("tl_admin_auth");
      sessionStorage.removeItem("tl_admin_session_pw");
      navigate(loginPath, { replace: true });
    }, SESSION_TIMEOUT_MS);
  }, [signOut, navigate, loginPath]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // start on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
};
