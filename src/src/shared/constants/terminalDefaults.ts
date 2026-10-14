// src/shared/constants/terminalDefaults.ts
// The REAL Donsol and Daraga geofences. "Restore real terminals" writes these to Supabase.
// Keep in sync with: sql/01_terminals.sql seed and TerminalRepository.DEFAULTS (device app).
import type { TerminalConfig } from "@/src/shared/hooks/admin/useTerminalSettings";

export const REAL_TERMINALS: TerminalConfig[] = [
  {
    id: 1,
    name: "Donsol Terminal",
    lat: 12.9032,
    lng: 123.59425,
    radius_m: 100,
  },
  {
    id: 2,
    name: "Daraga Terminal",
    lat: 13.14769,
    lng: 123.71216,
    radius_m: 100,
  },
];
