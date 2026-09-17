import { supabase } from "@/src/shared/config/supabase";
import {
  AdminJeepneyService,
  type AddJeepneyInput,
  type AdminJeepney,
  type AdminJeepneyRecord,
  type AvailableDriver,
  type UpdateJeepneyInput,
} from "@/src/shared/services/admin/AdminJeepneyService";
import { useCallback, useEffect, useRef, useState } from "react";

export type {
  AddJeepneyInput,
  AdminJeepney,
  AdminJeepneyRecord,
  AvailableDriver,
  UpdateJeepneyInput
};

export function useAdminJeepneys() {
  const [jeepneys, setJeepneys] = useState<AdminJeepneyRecord[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driversLoading, setDriversLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [driversError, setDriversError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const jeepneysChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const channel = jeepneysChannelRef.current;
      jeepneysChannelRef.current = null;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadJeepneys = useCallback(async (isRefresh = false) => {
    if (!mountedRef.current) {
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const rows = await AdminJeepneyService.getAdminJeepneyRecords();

      if (!mountedRef.current) {
        return;
      }

      setJeepneys(rows);
    } catch (err: any) {
      console.error("❌ Failed to load admin jeepneys:", err);

      if (mountedRef.current) {
        setError(err?.message ?? "Unable to load jeepneys.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    try {
      setDriversLoading(true);
      setDriversError(null);

      const rows = await AdminJeepneyService.getAvailableDrivers();

      if (!mountedRef.current) {
        return;
      }

      setAvailableDrivers(rows);
    } catch (err: any) {
      console.error("❌ Failed to load available drivers:", err);

      if (mountedRef.current) {
        setDriversError(err?.message ?? "Unable to load available drivers.");
      }
    } finally {
      if (mountedRef.current) {
        setDriversLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadJeepneys(true), loadDrivers()]);
  }, [loadJeepneys, loadDrivers]);

  const addJeepney = useCallback(
    async (input: AddJeepneyInput) => {
      const created = await AdminJeepneyService.addJeepney(input);

      if (mountedRef.current) {
        setJeepneys((current) => {
          const exists = current.some((item) => item.id === created.id);

          if (exists) {
            return current.map((item) =>
              item.id === created.id
                ? {
                    ...item,
                    ...created,
                  }
                : item,
            );
          }

          return [
            ...current,
            {
              ...created,
              terminal_name:
                created.terminal_id == null
                  ? null
                  : `Terminal ${created.terminal_id}`,
              last_gps_at: created.last_location_update ?? null,
            },
          ];
        });
      }

      await Promise.all([loadJeepneys(true), loadDrivers()]);

      return created;
    },
    [loadJeepneys, loadDrivers],
  );

  const updateJeepney = useCallback(
    async (jeepneyId: string, updates: UpdateJeepneyInput) => {
      const updated = await AdminJeepneyService.updateJeepney(
        jeepneyId,
        updates,
      );

      if (mountedRef.current) {
        setJeepneys((current) =>
          current.map((item) =>
            item.id === jeepneyId
              ? {
                  ...item,
                  ...updated,
                }
              : item,
          ),
        );
      }

      await Promise.all([loadJeepneys(true), loadDrivers()]);

      return updated;
    },
    [loadJeepneys, loadDrivers],
  );

  const uploadJeepneyImage = useCallback(
    async (jeepneyId: string, uri: string) => {
      const updated = await AdminJeepneyService.uploadJeepneyImage(
        jeepneyId,
        uri,
      );

      if (mountedRef.current) {
        setJeepneys((current) =>
          current.map((item) =>
            item.id === jeepneyId
              ? {
                  ...item,
                  ...updated,
                }
              : item,
          ),
        );
      }

      return updated;
    },
    [],
  );

  const removeJeepneyImage = useCallback(async (jeepneyId: string) => {
    const updated = await AdminJeepneyService.removeJeepneyImage(jeepneyId);

    if (mountedRef.current) {
      setJeepneys((current) =>
        current.map((item) =>
          item.id === jeepneyId
            ? {
                ...item,
                ...updated,
              }
            : item,
        ),
      );
    }

    return updated;
  }, []);

  const disableJeepney = useCallback(
    async (jeepneyId: string) => {
      const updated = await AdminJeepneyService.disableJeepney(jeepneyId);

      if (mountedRef.current) {
        setJeepneys((current) =>
          current.map((item) =>
            item.id === jeepneyId
              ? {
                  ...item,
                  ...updated,
                }
              : item,
          ),
        );
      }

      await Promise.all([loadJeepneys(true), loadDrivers()]);

      return updated;
    },
    [loadJeepneys, loadDrivers],
  );

  const deleteJeepney = useCallback(
    async (jeepneyId: string) => {
      if (!jeepneyId) {
        throw new Error("Jeepney ID is required.");
      }

      /*
       * The service performs the database deletion first.
       * Only after it succeeds do we remove the item locally.
       *
       * This prevents the list from disappearing when Supabase
       * rejects the delete because of a foreign-key constraint.
       */
      await AdminJeepneyService.deleteJeepney(jeepneyId);

      if (!mountedRef.current) {
        return;
      }

      setJeepneys((current) => current.filter((item) => item.id !== jeepneyId));

      /*
       * Refresh the driver list because deleting a jeepney can make
       * its assigned driver available again.
       */
      await loadDrivers();
    },
    [loadDrivers],
  );

  const getJeepney = useCallback(async (jeepneyId: string) => {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    return AdminJeepneyService.getJeepney(jeepneyId);
  }, []);

  const getLatestGpsAt = useCallback(async (jeepneyId: string) => {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    return AdminJeepneyService.getLatestGpsAt(jeepneyId);
  }, []);

  const subscribeToJeepney = useCallback(
    (
      jeepneyId: string,
      onJeepneyChange: () => void,
      onGpsChange?: (recordedAt: string) => void,
    ) => {
      if (!jeepneyId) {
        throw new Error("Jeepney ID is required.");
      }

      return AdminJeepneyService.subscribeToJeepney(
        jeepneyId,
        onJeepneyChange,
        onGpsChange,
      );
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;

    void loadJeepneys(false);
    void loadDrivers();

    /*
     * Make sure this hook owns exactly one list realtime channel.
     * This avoids accumulating duplicate Supabase subscriptions when
     * the screen remounts or React recreates the effect.
     */
    const channel = AdminJeepneyService.subscribeToJeepneys(() => {
      if (!mountedRef.current) {
        return;
      }

      void loadJeepneys(true);
      void loadDrivers();
    });

    jeepneysChannelRef.current = channel;

    return () => {
      if (jeepneysChannelRef.current === channel) {
        jeepneysChannelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadJeepneys, loadDrivers]);

  return {
    jeepneys,
    availableDrivers,

    loading,
    refreshing,
    driversLoading,

    error,
    driversError,

    refresh,
    loadJeepneys,
    loadDrivers,

    addJeepney,
    updateJeepney,
    uploadJeepneyImage,
    removeJeepneyImage,
    disableJeepney,
    deleteJeepney,

    getJeepney,
    getLatestGpsAt,

    subscribeToJeepney,
  };
}

export default useAdminJeepneys;
