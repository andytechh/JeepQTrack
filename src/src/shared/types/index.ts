export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  role: "driver" | "dispatcher" | "admin" | "commuter";
  jeepneyId: string | null;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  role?: "driver" | "dispatcher" | "admin" | "commuter";
  jeepneyId?: string;
}

export interface Jeepney {
  id: string;
  plateNumber: string;
  bracket: number;
  capacity: number;
  status: "waiting" | "en_route" | "arrived" | "dispatched" | "inactive";
  currentOccupancy: number;
  lastOccupancyUpdate: string;
  occupancyDetails: {
    frontDoor: { count: number; timestamp: string };
    rearDoor: { count: number; timestamp: string };
  };
  passengerFlow: {
    boarded: number;
    alighted: number;
    netChange: number;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  queuePosition: number;
  departureTime: string | null;
  eta: number | null;
}
