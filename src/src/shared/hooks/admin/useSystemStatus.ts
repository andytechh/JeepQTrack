import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/src/shared/config/supabase";

export type SystemServiceStatus = "operational" | "degraded" | "offline";

export type SystemService = {
  id: string;
  name: string;
  description: string;
  status: SystemServiceStatus;
  responseTime: number | null;
  details: string;
};

export type SystemStatus = {
  overall: SystemServiceStatus;
  services: SystemService[];
  checkedAt: string | null;
};

type ServiceCheckResult = {
  status: SystemServiceStatus;
  responseTime: number | null;
  details: string;
};

function getResponseTime(start: number) {
  return Math.max(0, Date.now() - start);
}

function getStatusFromResponse(
  responseTime: number,
  error: unknown,
): SystemServiceStatus {
  if (error) {
    return "offline";
  }

  if (responseTime >= 3000) {
    return "degraded";
  }

  return "operational";
}

async function checkSupabase(): Promise<ServiceCheckResult> {
  const startedAt = Date.now();

  try {
    const { error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    const responseTime = getResponseTime(startedAt);

    if (error) {
      return {
        status: "offline",
        responseTime,
        details: error.message || "Unable to connect to the database.",
      };
    }

    return {
      status: getStatusFromResponse(responseTime, null),
      responseTime,
      details:
        responseTime >= 3000
          ? "Database connection is responding slowly."
          : "Database connection is healthy.",
    };
  } catch (error) {
    const responseTime = getResponseTime(startedAt);

    return {
      status: "offline",
      responseTime,
      details:
        error instanceof Error
          ? error.message
          : "Unable to connect to Supabase.",
    };
  }
}

async function checkUsersService(): Promise<SystemService> {
  const startedAt = Date.now();

  try {
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    const responseTime = getResponseTime(startedAt);

    if (error) {
      return {
        id: "users",
        name: "User Service",
        description: "Staff and commuter account data",
        status: "offline",
        responseTime,
        details: error.message || "User service is unavailable.",
      };
    }

    return {
      id: "users",
      name: "User Service",
      description: "Staff and commuter account data",
      status: getStatusFromResponse(responseTime, null),
      responseTime,
      details:
        count !== null
          ? `${count} user account${count === 1 ? "" : "s"} available.`
          : "User data is available.",
    };
  } catch (error) {
    const responseTime = getResponseTime(startedAt);

    return {
      id: "users",
      name: "User Service",
      description: "Staff and commuter account data",
      status: "offline",
      responseTime,
      details:
        error instanceof Error ? error.message : "User service is unavailable.",
    };
  }
}

async function checkJeepneyService(): Promise<SystemService> {
  const startedAt = Date.now();

  try {
    const { count, error } = await supabase
      .from("jeepneys")
      .select("id", { count: "exact", head: true });

    const responseTime = getResponseTime(startedAt);

    if (error) {
      return {
        id: "jeepneys",
        name: "Jeepney Monitoring",
        description: "Terminal and jeepney monitoring data",
        status: "offline",
        responseTime,
        details: error.message || "Jeepney monitoring is unavailable.",
      };
    }

    return {
      id: "jeepneys",
      name: "Jeepney Monitoring",
      description: "Terminal and jeepney monitoring data",
      status: getStatusFromResponse(responseTime, null),
      responseTime,
      details:
        count !== null
          ? `${count} jeepney record${count === 1 ? "" : "s"} available.`
          : "Jeepney monitoring data is available.",
    };
  } catch (error) {
    const responseTime = getResponseTime(startedAt);

    return {
      id: "jeepneys",
      name: "Jeepney Monitoring",
      description: "Terminal and jeepney monitoring data",
      status: "offline",
      responseTime,
      details:
        error instanceof Error
          ? error.message
          : "Jeepney monitoring is unavailable.",
    };
  }
}

async function checkNotificationService(): Promise<SystemService> {
  const startedAt = Date.now();

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true });

    const responseTime = getResponseTime(startedAt);

    if (error) {
      return {
        id: "notifications",
        name: "Notification Service",
        description: "Push and in-app notification records",
        status: "offline",
        responseTime,
        details: error.message || "Notification service is unavailable.",
      };
    }

    return {
      id: "notifications",
      name: "Notification Service",
      description: "Push and in-app notification records",
      status: getStatusFromResponse(responseTime, null),
      responseTime,
      details:
        count !== null
          ? `${count} notification record${count === 1 ? "" : "s"} available.`
          : "Notification service is available.",
    };
  } catch (error) {
    const responseTime = getResponseTime(startedAt);

    return {
      id: "notifications",
      name: "Notification Service",
      description: "Push and in-app notification records",
      status: "offline",
      responseTime,
      details:
        error instanceof Error
          ? error.message
          : "Notification service is unavailable.",
    };
  }
}

function getOverallStatus(services: SystemService[]): SystemServiceStatus {
  if (services.some((service) => service.status === "offline")) {
    return "offline";
  }

  if (services.some((service) => service.status === "degraded")) {
    return "degraded";
  }

  return "operational";
}

export function useSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: "offline",
    services: [],
    checkedAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSystemStatus = useCallback(async () => {
    try {
      setError(null);

      const results = await Promise.all([
        checkSupabase(),
        checkUsersService(),
        checkJeepneyService(),
        checkNotificationService(),
      ]);

      const [supabaseResult, usersResult, jeepneyResult, notificationResult] =
        results;

      const services: SystemService[] = [
        {
          id: "supabase",
          name: "Database",
          description: "Supabase database connection",
          status: supabaseResult.status,
          responseTime: supabaseResult.responseTime,
          details: supabaseResult.details,
        },
        usersResult,
        jeepneyResult,
        notificationResult,
      ];

      setSystemStatus({
        overall: getOverallStatus(services),
        services,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("System status check failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to check system status.",
      );
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);

    try {
      await checkSystemStatus();
    } finally {
      setLoading(false);
    }
  }, [checkSystemStatus]);

  const refresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await checkSystemStatus();
    } finally {
      setRefreshing(false);
    }
  }, [checkSystemStatus, refreshing]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    systemStatus,
    loading,
    refreshing,
    error,
    refresh,
    checkSystemStatus,
  };
}
