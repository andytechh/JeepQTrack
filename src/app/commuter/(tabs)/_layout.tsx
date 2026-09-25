import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

import ClayTabBar from "../../../src/shared/components/clay/ClayTabBar";
import { supabase } from "../../../src/shared/config/supabase";
import { useNotifications } from "../../../src/shared/hooks/useCommuterNotifications";

export default function CommuterTabsLayout() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUserId(user?.id ?? null);
        }
      } catch (error) {
        console.error("Failed to get current user:", error);

        if (mounted) {
          setUserId(null);
        }
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Use the same notification hook as the commuter
   * notification screen.
   *
   * This gives us the real unread count instead of
   * using a hard-coded number.
   */
  const { unreadCount } = useNotifications(userId);

  return (
    <Tabs
      tabBar={(props) => (
        <ClayTabBar
          {...(props as any)}
          notificationsUnreadCount={unreadCount}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
