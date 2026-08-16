import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminJeepney,
  AdminJeepneyService
} from "@/src/shared/services/admin/AdminJeepneyService";

export type JeepneyFilter =
  | "all"
  | "active"
  | "waiting"
  | "loading"
  | "en_route"
  | "arrived"
  | "dispatched"
  | "inactive";

interface UseAdminJeepneysResult {
  jeepneys: AdminJeepney[];
  filteredJeepneys: AdminJeepney[];

  loading: boolean;
  refreshing: boolean;
  error: string | null;

  search: string;
  filter: JeepneyFilter;

  setSearch: (value: string) => void;
  setFilter: (value: JeepneyFilter) => void;

  refresh: () => Promise<void>;

  totalCount: number;
  activeCount: number;
  waitingCount: number;
  loadingCount: number;
  enRouteCount: number;
  inactiveCount: number;

  getTerminalName: (terminalId: number | null) => string;
}

export function useAdminJeepneys(): UseAdminJeepneysResult {
  const [jeepneys, setJeepneys] = useState<AdminJeepney[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JeepneyFilter>("all");

  const loadJeepneys = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const data = await AdminJeepneyService.getJeepneys();

      setJeepneys(data);
    } catch (error: any) {
      console.error("❌ Admin jeepneys loading error:", error);

      setError(error?.message || "Unable to load jeepneys.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJeepneys();
  }, [loadJeepneys]);

  /*
   * Realtime jeepney updates.
   */

  useEffect(() => {
    const channel = AdminJeepneyService.subscribeToJeepneys(() => {
      console.log("🔄 Jeepney table changed. Refreshing admin list...");

      loadJeepneys();
    });

    return () => {
      console.log("📡 Removing admin jeepneys channel");

      channel.unsubscribe();
    };
  }, [loadJeepneys]);

  const filteredJeepneys = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return jeepneys.filter((jeepney) => {
      /*
       * Search
       */

      if (normalizedSearch) {
        const searchable = [
          jeepney.plate_number,
          jeepney.jeep_name,
          jeepney.driver_name,
          String(jeepney.bracket),
          String(jeepney.terminal_id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(normalizedSearch)) {
          return false;
        }
      }

      /*
       * Filter
       */

      if (filter === "all") {
        return true;
      }

      if (filter === "active") {
        return jeepney.status !== "inactive";
      }

      return jeepney.status === filter;
    });
  }, [jeepneys, search, filter]);

  const totalCount = jeepneys.length;

  const activeCount = jeepneys.filter(
    (jeepney) => jeepney.status !== "inactive",
  ).length;

  const waitingCount = jeepneys.filter(
    (jeepney) => jeepney.status === "waiting",
  ).length;

  const loadingCount = jeepneys.filter(
    (jeepney) => jeepney.status === "loading",
  ).length;

  const enRouteCount = jeepneys.filter(
    (jeepney) => jeepney.status === "en_route",
  ).length;

  const inactiveCount = jeepneys.filter(
    (jeepney) => jeepney.status === "inactive",
  ).length;

  const getTerminalName = useCallback((terminalId: number | null) => {
    if (terminalId === 1) {
      return "Donsol Terminal";
    }

    if (terminalId === 2) {
      return "Daraga Terminal";
    }

    return "Unknown Terminal";
  }, []);

  const refresh = useCallback(async () => {
    await loadJeepneys(true);
  }, [loadJeepneys]);

  return {
    jeepneys,
    filteredJeepneys,

    loading,
    refreshing,
    error,

    search,
    filter,

    setSearch,
    setFilter,

    refresh,

    totalCount,
    activeCount,
    waitingCount,
    loadingCount,
    enRouteCount,
    inactiveCount,

    getTerminalName,
  };
}
