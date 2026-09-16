import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useState } from "react";

export interface TerminalSubscription {
  terminalId: number;
  subscribedAt: string;
  expiresAt: string;
}

export function useTerminalSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<
    Record<number, TerminalSubscription>
  >({});
  const [loading, setLoading] = useState(true);
  const [processingTerminal, setProcessingTerminal] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "get_my_terminal_subscriptions",
      );

      if (rpcError) {
        console.error("❌ Failed to load terminal subscriptions:", rpcError);
        setError(rpcError.message);
        return;
      }

      const next: Record<number, TerminalSubscription> = {};

      for (const row of data || []) {
        const terminalId = Number(row.terminal_id);
        const expiresAt = String(row.expires_at || "");

        if (
          !Number.isFinite(terminalId) ||
          !expiresAt ||
          new Date(expiresAt).getTime() <= Date.now()
        ) {
          continue;
        }

        next[terminalId] = {
          terminalId,
          subscribedAt: String(row.subscribed_at || ""),
          expiresAt,
        };
      }

      setSubscriptions(next);
    } catch (err) {
      console.error("❌ Unexpected subscription load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notification settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const isSubscribed = useCallback(
    (terminalId: number) => {
      const subscription = subscriptions[terminalId];

      if (!subscription) {
        return false;
      }

      return new Date(subscription.expiresAt).getTime() > Date.now();
    },
    [subscriptions],
  );

  const toggleSubscription = useCallback(
    async (terminalId: number) => {
      try {
        setProcessingTerminal(terminalId);
        setError(null);

        const currentlySubscribed = isSubscribed(terminalId);

        if (currentlySubscribed) {
          const { error: rpcError } = await supabase.rpc(
            "unsubscribe_terminal",
            {
              p_terminal_id: terminalId,
            },
          );

          if (rpcError) {
            console.error(
              `❌ Failed to unsubscribe terminal ${terminalId}:`,
              rpcError,
            );

            setError(rpcError.message);
            return false;
          }

          setSubscriptions((current) => {
            const next = { ...current };
            delete next[terminalId];
            return next;
          });

          return true;
        }

        const { data, error: rpcError } = await supabase.rpc(
          "subscribe_terminal",
          {
            p_terminal_id: terminalId,
          },
        );

        if (rpcError) {
          console.error(
            `❌ Failed to subscribe terminal ${terminalId}:`,
            rpcError,
          );

          setError(rpcError.message);
          return false;
        }

        const result = Array.isArray(data) ? data[0] : data;

        const expiresAt = String(result?.expires_at || "");

        if (!expiresAt) {
          throw new Error(
            "Subscription was created, but no expiration time was returned.",
          );
        }

        setSubscriptions((current) => ({
          ...current,
          [terminalId]: {
            terminalId,
            subscribedAt: new Date().toISOString(),
            expiresAt,
          },
        }));

        return true;
      } catch (err) {
        console.error("❌ Unexpected subscription update error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to update notification settings.",
        );

        return false;
      } finally {
        setProcessingTerminal(null);
      }
    },
    [isSubscribed],
  );

  const getExpirationLabel = useCallback(
    (terminalId: number) => {
      const subscription = subscriptions[terminalId];

      if (!subscription) {
        return "";
      }

      const expiresAt = new Date(subscription.expiresAt);

      if (expiresAt.getTime() <= Date.now()) {
        return "";
      }

      return `Active until ${expiresAt.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    },
    [subscriptions],
  );

  return {
    subscriptions,
    loading,
    processingTerminal,
    error,
    isSubscribed,
    toggleSubscription,
    getExpirationLabel,
    reload: loadSubscriptions,
  };
}
