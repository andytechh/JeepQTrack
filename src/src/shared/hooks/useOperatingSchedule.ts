import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  formatClockTime,
  getNextOpeningTime,
  isWithinOperatingHours,
} from "../config/operatingHours";

export function useOperatingSchedule() {
  const [isOpen, setIsOpen] = useState(() => isWithinOperatingHours());
  const [nextOpenLabel, setNextOpenLabel] = useState(() =>
    formatClockTime(getNextOpeningTime()),
  );

  useEffect(() => {
    const check = () => {
      const open = isWithinOperatingHours();
      setIsOpen(open);
      if (!open) setNextOpenLabel(formatClockTime(getNextOpeningTime()));
    };

    check();

    // Cheap 30s poll — catches the open/close boundary without a precise timer.
    const interval = setInterval(check, 30000);

    // Device could've been asleep across the boundary overnight.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return { isOpen, nextOpenLabel };
}
