import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../config/supabase";

export type AdminCommuterStatus = "active" | "inactive";

export interface AdminCommuterRecord {
  id: string;

  email: string;
  phone_number: string | null;
  display_name: string;

  role: "commuter";

  is_active: boolean;

  avatar_url: string | null;

  preferred_terminal: number | null;
  preferred_bracket: number | null;

  created_at: string;
  updated_at: string;
}

interface AdminCommutersResult {
  commuters: AdminCommuterRecord[];

  loading: boolean;
  refreshing: boolean;

  error: string | null;

  refresh: () => Promise<void>;
}

const SELECT_COLUMNS = `
  id,
  email,
  phone_number,
  display_name,
  role,
  is_active,
  avatar_url,
  preferred_terminal,
  preferred_bracket,
  created_at,
  updated_at
`;

export function useAdminCommuters(): AdminCommutersResult {
  const [commuters, setCommuters] = useState<AdminCommuterRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadCommuters = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select(SELECT_COLUMNS)
        .eq("role", "commuter")
        .order("display_name", {
          ascending: true,
        });

      if (fetchError) {
        throw fetchError;
      }

      const normalized: AdminCommuterRecord[] = (data ?? []).map(
        (item: any) => ({
          id: item.id,

          email: item.email ?? "",

          phone_number: item.phone_number ?? null,

          display_name: item.display_name ?? "Unnamed Commuter",

          role: "commuter",

          is_active: item.is_active ?? true,

          avatar_url: item.avatar_url ?? null,

          preferred_terminal:
            item.preferred_terminal == null
              ? null
              : Number(item.preferred_terminal),

          preferred_bracket:
            item.preferred_bracket == null
              ? null
              : Number(item.preferred_bracket),

          created_at: item.created_at ?? "",

          updated_at: item.updated_at ?? "",
        }),
      );

      setCommuters(normalized);
    } catch (err: any) {
      console.error("❌ Failed to load admin commuters:", err);

      setError(err?.message ?? "Unable to load commuter management data.");

      setCommuters([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Initial load.
   */
  useEffect(() => {
    loadCommuters(false);
  }, [loadCommuters]);

  /*
   * Realtime commuter updates.
   *
   * We listen to all users changes, but reload only when something
   * relevant happens. This keeps the admin commuter list synchronized.
   */
  useEffect(() => {
    const channel = supabase
      .channel("admin-commuters-management")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "users",
        },
        (payload) => {
          const user = payload.new as any;

          if (user.role === "commuter") {
            loadCommuters(true);
          }
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          const user = payload.new as any;

          /*
           * Reload when:
           * - user is currently a commuter
           * - user used to be a commuter
           *
           * This also handles role changes such as:
           * commuter -> driver
           * driver -> commuter
           */
          const oldUser = payload.old as any;

          if (user.role === "commuter" || oldUser?.role === "commuter") {
            loadCommuters(true);
          }
        },
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          const user = payload.old as any;

          /*
           * Reload because the deleted account could have been
           * a commuter.
           *
           * If replica identity does not expose role, the reload
           * is still safe and ensures the list stays accurate.
           */
          if (user?.role === "commuter" || !user?.role) {
            loadCommuters(true);
          }
        },
      )

      .subscribe((status) => {
        console.log("📡 Admin commuter realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [loadCommuters]);

  const refresh = useCallback(async () => {
    await loadCommuters(true);
  }, [loadCommuters]);

  return {
    commuters,

    loading,

    refreshing,

    error,

    refresh,
  };
}
