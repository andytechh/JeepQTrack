import { supabase } from "@/src/shared/config/supabase";

export type DriverAlertType =
  "arrival" | "dispatch" | "occupancy" | "eta" | "status" | "queue" | "system";

export type SendDriverAlertOptions = {
  title?: string;
  message?: string;
  type?: DriverAlertType;
};

export type SendDriverAlertResult = {
  pushSent: boolean;
};

/**
 * Alerts a jeepney's driver in two ways:
 *   1. Inserts a row into `notifications` (drives the driver's in-app
 *      Notifications screen and unread badge, via useStaffNotifications).
 *   2. Sends an Expo push notification to the driver's registered
 *      device, if they have one (expo_push_token on `users`).
 *
 * Looks the jeepney up fresh by id rather than trusting whatever shape
 * the caller already has in memory, so it works the same whether it's
 * called from a dashboard list item or a details screen.
 *
 * NOTE: this calls Expo's push API directly from the client. That's
 * consistent with how the rest of this app talks to Supabase directly
 * from the client, but it does mean the push token round-trips through
 * the device. If you later add a server (Supabase Edge Function, etc.),
 * move this call there instead.
 */
export async function sendDriverAlert(
  jeepneyId: string,
  options: SendDriverAlertOptions = {},
): Promise<SendDriverAlertResult> {
  const { data: jeepneyRow, error: jeepneyError } = await supabase
    .from("jeepneys")
    .select("id, plate_number, driver_id")
    .eq("id", jeepneyId)
    .maybeSingle();

  if (jeepneyError) {
    throw jeepneyError;
  }

  if (!jeepneyRow) {
    throw new Error("This jeepney could not be found.");
  }

  if (!jeepneyRow.driver_id) {
    throw new Error("This jeepney has no assigned driver.");
  }

  const type: DriverAlertType = options.type ?? "dispatch";
  const title = options.title ?? "Dispatch Alert";
  const message =
    options.message ??
    `${jeepneyRow.plate_number} is next in the queue — please prepare to depart.`;

  // 1. In-app notification row.
  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: jeepneyRow.driver_id,
    title,
    message,
    type,
    read: false,
    data: {
      jeepney_id: jeepneyRow.id,
      plate_number: jeepneyRow.plate_number,
    },
  });

  if (insertError) {
    throw insertError;
  }

  // 2. Push notification.
  const { data: driver, error: driverError } = await supabase
    .from("users")
    .select("expo_push_token")
    .eq("id", jeepneyRow.driver_id)
    .maybeSingle();

  if (driverError) {
    throw driverError;
  }

  if (!driver?.expo_push_token) {
    return { pushSent: false };
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: driver.expo_push_token,
      title,
      body: message,
      data: {
        jeepney_id: jeepneyRow.id,
        plate_number: jeepneyRow.plate_number,
        type,
      },
    }),
  });

  return { pushSent: response.ok };
}
