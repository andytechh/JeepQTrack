import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../config/supabase";

export type AnnouncementAudience = "staff" | "commuters" | "all";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementStatus =
  "draft" | "scheduled" | "published" | "expired";
export type AnnouncementCategory =
  | "maintenance"
  | "terminal"
  | "service"
  | "disruption"
  | "system"
  | "policy"
  | "staff"
  | "event"
  | "general";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  created_by: string;
  published_at: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  expires_at?: string | null;
}

function getError(result: any, functionError: any) {
  if (result?.error) return new Error(String(result.error));
  if (functionError?.message) return new Error(functionError.message);
  return new Error("Unable to complete the announcement request.");
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke(
        "admin-announcements",
        { body: { action: "list" } },
      );

      if (functionError || data?.success === false) {
        throw getError(data, functionError);
      }

      setAnnouncements(
        Array.isArray(data?.announcements) ? data.announcements : [],
      );
    } catch (err: any) {
      setError(err?.message ?? "Unable to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createAnnouncement = useCallback(
    async (input: CreateAnnouncementInput) => {
      const { data, error: functionError } = await supabase.functions.invoke(
        "admin-announcements",
        { body: { action: "create", ...input } },
      );

      if (functionError || data?.success === false) {
        throw getError(data, functionError);
      }

      if (data?.announcement) {
        setAnnouncements((current) => [data.announcement, ...current]);
      }

      return data.announcement as Announcement;
    },
    [],
  );

  const deleteAnnouncement = useCallback(async (id: string) => {
    const { data, error: functionError } = await supabase.functions.invoke(
      "admin-announcements",
      { body: { action: "delete", id } },
    );

    if (functionError || data?.success === false) {
      throw getError(data, functionError);
    }

    setAnnouncements((current) => current.filter((item) => item.id !== id));
    return true;
  }, []);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return {
    announcements,
    loading,
    refreshing,
    error,
    refresh,
    createAnnouncement,
    deleteAnnouncement,
  };
}
