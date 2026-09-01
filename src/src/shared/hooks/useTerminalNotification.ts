import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUserId } from "./useCurrentUserId";

const SUBSCRIPTION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

export function useTerminalNotifications() {
  const userId = useCurrentUserId();
  const [expiresAt, setExpiresAt] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick every 30s so the UI reflects expiry / countdown without a refetch.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("terminal_subscriptions")
      .select("terminal_id, expires_at")
      .eq("user_id", userId);

    if (error) {
      console.warn("Failed to load terminal subscriptions:", error.message);
    } else {
      const map: Record<number, string> = {};
      (data ?? []).forEach((row) => {
        map[row.terminal_id] = row.expires_at;
      });
      setExpiresAt(map);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSubscribed = useCallback(
    (terminalId: number) => {
      const exp = expiresAt[terminalId];
      return !!exp && new Date(exp).getTime() > now;
    },
    [expiresAt, now],
  );

  const remainingMinutes = useCallback(
    (terminalId: number) => {
      const exp = expiresAt[terminalId];
      if (!exp) return 0;
      return Math.max(0, Math.round((new Date(exp).getTime() - now) / 60_000));
    },
    [expiresAt, now],
  );

  const toggle = useCallback(
    async (terminalId: number) => {
      if (!userId) return;
      setSavingId(terminalId);

      if (isSubscribed(terminalId)) {
        const { error } = await supabase
          .from("terminal_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("terminal_id", terminalId);

        if (!error) {
          setExpiresAt((prev) => {
            const next = { ...prev };
            delete next[terminalId];
            return next;
          });
        } else {
          console.warn("Failed to unsubscribe from terminal:", error.message);
        }
      } else {
        const expires = new Date(
          Date.now() + SUBSCRIPTION_DURATION_MS,
        ).toISOString();
        const { error } = await supabase.from("terminal_subscriptions").upsert({
          user_id: userId,
          terminal_id: terminalId,
          expires_at: expires,
        });

        if (!error) {
          setExpiresAt((prev) => ({ ...prev, [terminalId]: expires }));
        } else {
          console.warn("Failed to subscribe to terminal:", error.message);
        }
      }

      setSavingId(null);
    },
    [userId, isSubscribed],
  );

  return { isSubscribed, remainingMinutes, toggle, loading, savingId };
}
