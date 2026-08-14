// src/shared/hooks/useCurrentUserId.ts

import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";

export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("❌ Failed to get current user:", error);

          if (mounted) {
            setUserId(null);
          }

          return;
        }

        if (mounted) {
          setUserId(user?.id ?? null);
        }
      } catch (error) {
        console.error("❌ Current user error:", error);

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

  return userId;
}
