import { supabase } from "../../config/supabase";

export interface AlertDriverResult {
  success: boolean;
  error?: string;
}

export class DispatcherQueueService {
  static async alertDriver(
    dispatcherId: string,
    jeepneyId: string,
  ): Promise<AlertDriverResult> {
    try {
      if (!dispatcherId) {
        return {
          success: false,
          error: "Dispatcher account not found.",
        };
      }

      if (!jeepneyId) {
        return {
          success: false,
          error: "Jeepney was not specified.",
        };
      }

      const { data: dispatcherAssignment, error: dispatcherAssignmentError } =
        await supabase
          .from("terminal_dispatchers")
          .select(
            `
            id,
            terminal_id,
            dispatcher_id,
            is_active
          `,
          )
          .eq("dispatcher_id", dispatcherId)
          .eq("is_active", true)
          .maybeSingle();

      if (dispatcherAssignmentError) {
        throw dispatcherAssignmentError;
      }

      if (!dispatcherAssignment) {
        return {
          success: false,
          error: "You are not assigned to an active terminal.",
        };
      }

      const { data: jeepneyAssignment, error: jeepneyAssignmentError } =
        await supabase
          .from("terminal_jeepneys")
          .select(
            `
            id,
            terminal_id,
            jeepney_id,
            is_active
          `,
          )
          .eq("jeepney_id", jeepneyId)
          .eq("is_active", true)
          .maybeSingle();

      if (jeepneyAssignmentError) {
        throw jeepneyAssignmentError;
      }

      if (!jeepneyAssignment) {
        return {
          success: false,
          error: "This jeepney is not assigned to an active terminal.",
        };
      }

      if (jeepneyAssignment.terminal_id !== dispatcherAssignment.terminal_id) {
        return {
          success: false,
          error: "You can only alert jeepneys assigned to your terminal.",
        };
      }

      const { data: jeepney, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select(
          `
            id,
            plate_number,
            driver_id,
            status
          `,
        )
        .eq("id", jeepneyId)
        .maybeSingle();

      if (jeepneyError) {
        throw jeepneyError;
      }

      if (!jeepney) {
        return {
          success: false,
          error: "Jeepney was not found.",
        };
      }

      if (jeepney.status !== "waiting" && jeepney.status !== "loading") {
        return {
          success: false,
          error: "This jeepney is no longer in the active queue.",
        };
      }

      if (!jeepney.driver_id) {
        return {
          success: false,
          error: "No driver is assigned to this jeepney.",
        };
      }

      const { data: driver, error: driverError } = await supabase
        .from("users")
        .select(
          `
            id,
            display_name,
            role,
            is_active
          `,
        )
        .eq("id", jeepney.driver_id)
        .eq("role", "driver")
        .maybeSingle();

      if (driverError) {
        throw driverError;
      }

      if (!driver) {
        return {
          success: false,
          error: "The assigned driver account was not found.",
        };
      }

      if (!driver.is_active) {
        return {
          success: false,
          error: "The assigned driver account is inactive.",
        };
      }

      const { data: terminal, error: terminalError } = await supabase
        .from("terminals")
        .select(
          `
            id,
            name,
            terminal_number,
            bracket_number
          `,
        )
        .eq("id", dispatcherAssignment.terminal_id)
        .maybeSingle();

      if (terminalError) {
        throw terminalError;
      }

      if (!terminal) {
        return {
          success: false,
          error: "Assigned terminal could not be found.",
        };
      }

      const { data: existingAlert, error: existingAlertError } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", driver.id)
        .eq("type", "queue")
        .eq("read", false)
        .contains("data", {
          jeepney_id: jeepney.id,
          dispatcher_alert: true,
        })
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (existingAlertError) {
        console.warn(
          "Unable to check existing alert:",
          existingAlertError.message,
        );
      }

      if (existingAlert) {
        return {
          success: false,
          error: "An active queue alert has already been sent to this driver.",
        };
      }

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: driver.id,
          title: "Queue Alert",
          message: `${jeepney.plate_number} is currently in the queue at ${terminal.name}. Please be ready for automatic dispatch.`,
          type: "queue",
          read: false,
          data: {
            dispatcher_alert: true,
            jeepney_id: jeepney.id,
            terminal_id: terminal.id,
            terminal_number: terminal.terminal_number,
            bracket_number: terminal.bracket_number,
          },
        });

      if (notificationError) {
        throw notificationError;
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Dispatcher queue alert error:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to alert driver.",
      };
    }
  }
}
