import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUserId } from "./useCurrentUserId";

export function useJeepneyNotify(jeepneyId: string) {
  const userId = useCurrentUserId();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !jeepneyId) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase
      .from("jeepney_subscriptions")
      .select("jeepney_id")
      .eq("user_id", userId)
      .eq("jeepney_id", jeepneyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn("Failed to check jeepney subscription:", error.message);
        } else {
          setSubscribed(!!data);
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId, jeepneyId]);

  // If the jeepney departs while this card is on screen, the DB trigger
  // clears the row server-side — reflect that locally without a refetch.
  useEffect(() => {
    if (!jeepneyId) return;

    const channel = supabase
      .channel(`jeepney-subscription-${jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
          filter: `id=eq.${jeepneyId}`,
        },
        (payload) => {
          if (payload.new?.status === "en_route") {
            setSubscribed(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jeepneyId]);

  const toggle = useCallback(async () => {
    if (!userId || !jeepneyId) return;
    setSaving(true);

    if (subscribed) {
      const { error } = await supabase
        .from("jeepney_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("jeepney_id", jeepneyId);

      if (!error) setSubscribed(false);
      else console.warn("Failed to unsubscribe from jeepney:", error.message);
    } else {
      const { error } = await supabase
        .from("jeepney_subscriptions")
        .upsert({ user_id: userId, jeepney_id: jeepneyId });

      if (!error) setSubscribed(true);
      else console.warn("Failed to subscribe to jeepney:", error.message);
    }

    setSaving(false);
  }, [userId, jeepneyId, subscribed]);

  return { subscribed, toggle, saving, loading };
}
