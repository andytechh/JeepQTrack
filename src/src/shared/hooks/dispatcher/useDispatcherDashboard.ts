import { useCallback, useMemo } from "react";

import { useAuthStore } from "../../../shared/store/authStore";
import { useDispatcherJeepneys } from "./useDispatcherJeepneys";
import { useDispatcherTrips } from "./useDispatcherTrips";

export function useDispatcherDashboard() {
  const { user, refreshUser } = useAuthStore();

  const terminalId = user?.terminalId ?? 1;

  const {
    jeepneys,
    loading: jeepneysLoading,
    refreshing,
    error,
    refreshJeepneys,
  } = useDispatcherJeepneys(terminalId);

  const {
    tripLogs,
    loading: tripsLoading,
    refreshTrips,
  } = useDispatcherTrips();

  const loading = jeepneysLoading || tripsLoading;

  const nextToDispatch = useMemo(() => {
    const queued = jeepneys
      .filter(
        (jeepney) =>
          jeepney.queue_position !== null && jeepney.status !== "inactive",
      )
      .sort((a, b) => (a.queue_position ?? 999) - (b.queue_position ?? 999));

    return queued[0] ?? null;
  }, [jeepneys]);

  const stats = useMemo(() => {
    const total = jeepneys.length;

    const online = jeepneys.filter((jeepney) =>
      ["active", "en_route", "loading"].includes(jeepney.status),
    ).length;

    const waiting = jeepneys.filter(
      (jeepney) => jeepney.status === "waiting",
    ).length;

    const queueLength = jeepneys.filter(
      (jeepney) => jeepney.queue_position !== null,
    ).length;

    return {
      totalJeepneys: total,
      onlineJeepneys: online,
      waitingDrivers: waiting,
      queueLength,
    };
  }, [jeepneys]);

  const handleRefresh = useCallback(async () => {
    await refreshUser();

    await Promise.all([refreshJeepneys(), refreshTrips()]);
  }, [refreshUser, refreshJeepneys, refreshTrips]);

  return {
    user,
    terminalId,

    jeepneys,
    tripLogs,

    nextToDispatch,
    stats,

    loading,
    refreshing,
    error,

    refreshJeepneys,
    handleRefresh,
  };
}
