// src/shared/components/map/types.ts
import type { Direction } from "../../constants/terminals";

/** A jeepney as rendered on the map. */
export interface MapJeepney {
  id: string;
  jeepName: string;
  plateNumber: string;
  latitude: number | null;
  longitude: number | null;
  occupancy: number;
  capacity: number;
  status: string;
  heading?: number | null;
  speed?: number | null;
  /** 0 = Donsol, 1 = Daraga. Derived via `projectOntoRoute`. */
  progress?: number;
  direction?: Direction;
  etaMinutes?: number | null;
  driverName?: string | null;
}

export interface TerminalMapProps {
  jeepneys: MapJeepney[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Draw the corridor polyline between the two terminals. */
  showRoute?: boolean;
  /** Keep this jeepney centered as it moves. */
  followId?: string | null;
  height?: number | string;
  /** Show the terminal geofence circles. */
  showGeofences?: boolean;
  /** Only render jeepneys travelling this direction. */
  direction?: Direction | null;
}
