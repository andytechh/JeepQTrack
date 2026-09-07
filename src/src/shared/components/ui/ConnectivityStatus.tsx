import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ConnectionStatus = "connected" | "slow" | "offline";

const SLOW_CONNECTION_MS = 1500;
const CHECK_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 4000;

const STATUS_CONFIG = {
  offline: {
    title: "No internet connection",
    message: "Trying to reconnect…",

    banner: "border-red-200 bg-red-50 shadow-red-950/10",

    dot: "bg-red-600",

    titleText: "text-red-800",

    messageText: "text-red-700",
  },

  slow: {
    title: "Slow connection",
    message: "Your internet connection is slow.",

    banner: "border-orange-200 bg-orange-50 shadow-orange-950/10",

    dot: "bg-orange-600",

    titleText: "text-orange-800",

    messageText: "text-orange-700",
  },

  connected: {
    title: "Connected",
    message: "Internet connection restored.",

    banner: "border-green-200 bg-green-50 shadow-green-950/10",

    dot: "bg-green-600",

    titleText: "text-green-800",

    messageText: "text-green-700",
  },
} as const;

/**
 * Displays a connection status banner when:
 *
 * - Internet is unavailable
 * - Internet is slow
 * - Internet has just been restored
 *
 * The banner automatically disappears when the connection
 * is stable again.
 */
export default function ConnectivityStatus() {
  const insets = useSafeAreaInsets();
  const network = Network.useNetworkState();

  const [status, setStatus] = useState<ConnectionStatus>("connected");

  const [showRestored, setShowRestored] = useState(false);

  const previousStatus = useRef<ConnectionStatus>("connected");

  const mounted = useRef(true);

  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check actual internet connectivity and
   * measure approximate response latency.
   */
  const checkConnection = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();

      /*
       * Device has no network or no internet.
       */
      if (
        networkState.isConnected === false ||
        networkState.isInternetReachable === false
      ) {
        if (mounted.current) {
          setStatus("offline");
        }

        return;
      }

      /*
       * Measure actual internet response time.
       */
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      const start = Date.now();

      try {
        /*
         * Lightweight endpoint.
         *
         * This does not download a webpage.
         * It is only used to verify internet access.
         */
        await fetch("https://www.google.com/generate_204", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const latency = Date.now() - start;

        clearTimeout(timeout);

        if (!mounted.current) {
          return;
        }

        if (latency >= SLOW_CONNECTION_MS) {
          setStatus("slow");
        } else {
          setStatus("connected");
        }
      } catch {
        clearTimeout(timeout);

        if (mounted.current) {
          setStatus("offline");
        }
      }
    } catch {
      if (mounted.current) {
        setStatus("offline");
      }
    }
  };

  /**
   * React immediately when Expo detects a
   * network state change.
   */
  useEffect(() => {
    const isOffline =
      network.isConnected === false || network.isInternetReachable === false;

    if (isOffline) {
      setStatus("offline");
      return;
    }

    if (network.isConnected === true && network.isInternetReachable === true) {
      checkConnection();
    }
  }, [network.isConnected, network.isInternetReachable]);

  /**
   * Periodically check the actual connection.
   */
  useEffect(() => {
    mounted.current = true;

    checkConnection();

    const interval = setInterval(() => {
      checkConnection();
    }, CHECK_INTERVAL_MS);

    return () => {
      mounted.current = false;

      clearInterval(interval);

      if (restoredTimer.current) {
        clearTimeout(restoredTimer.current);
      }
    };
  }, []);

  /**
   * Detect recovery.
   *
   * Offline → Connected
   * Slow → Connected
   *
   * Show the green "Connected" banner temporarily.
   */
  useEffect(() => {
    const previous = previousStatus.current;

    const connectionRestored =
      status === "connected" && (previous === "offline" || previous === "slow");

    if (connectionRestored) {
      setShowRestored(true);

      if (restoredTimer.current) {
        clearTimeout(restoredTimer.current);
      }

      restoredTimer.current = setTimeout(() => {
        if (mounted.current) {
          setShowRestored(false);
        }
      }, 3000);
    }

    previousStatus.current = status;
  }, [status]);

  /**
   * Normal healthy connection:
   * don't show anything.
   */
  if (status === "connected" && !showRestored) {
    return null;
  }

  /*
   * When recovering, display the connected config.
   * Otherwise display offline or slow.
   */
  const displayStatus: ConnectionStatus =
    status === "connected" && showRestored ? "connected" : status;

  const config = STATUS_CONFIG[displayStatus];

  return (
    <View
      className={`
        absolute
        left-4
        right-4
        z-[100]
        flex-row
        items-center
        gap-2.5
        rounded-xl
        border
        px-[15px]
        py-3
        shadow-lg
        ${config.banner}
      `}
      style={{
        top: insets.top + 8,
      }}
    >
      {/* Status indicator */}
      <View
        className={`
          h-2.5
          w-2.5
          rounded-full
          ${config.dot}
        `}
      />

      {/* Status text */}
      <View className="flex-1">
        <Text
          className={`
            text-sm
            font-extrabold
            ${config.titleText}
          `}
        >
          {config.title}
        </Text>

        <Text
          className={`
            mt-px
            text-xs
            ${config.messageText}
          `}
        >
          {config.message}
        </Text>
      </View>
    </View>
  );
}
