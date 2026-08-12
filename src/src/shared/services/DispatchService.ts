// src/shared/services/DispatchService.ts
import { supabase } from "../config/supabase";

export interface DispatchResult {
  success: boolean;
  error?: string;
}

const routeForTerminal = (terminalId: number) =>
  terminalId === 1 ? "Donsol → Daraga" : "Daraga → Donsol";

export class DispatchService {
  /**
   * Dispatches a jeepney out of the terminal queue.
   *
   * Delegates entirely to the `depart_jeepney` Postgres RPC — the same
   * function used by the Android app's geofence-exit path and
   * LoadingCheckWorker's auto-departure — instead of re-implementing
   * queue math client-side. This is deliberate: the RPC is transaction-
   * locked (pg_advisory_xact_lock) against concurrent arrivals/departures
   * for the same terminal+bracket, inserts the trips row, and auto-
   * promotes the next waiting jeepney to "loading". A client-side
   * re-implementation can't safely replicate the locking, and previously
   * didn't promote the next jeepney at all — don't reintroduce a second
   * copy of this logic here.
   */
  static async dispatchJeepney(
    jeepneyId: string,
    dispatcherId?: string,
  ): Promise<DispatchResult> {
    try {
      const { data: jeepney, error: fetchError } = await supabase
        .from("jeepneys")
        .select("id, driver_id, plate_number, terminal_id, status")
        .eq("id", jeepneyId)
        .single();

      if (fetchError) throw fetchError;
      if (!jeepney) throw new Error("Jeepney not found");

      if (!["waiting", "loading", "arrived"].includes(jeepney.status)) {
        throw new Error(
          `Jeepney is not in a dispatchable state (current status: ${jeepney.status})`,
        );
      }

      const { data: departed, error: rpcError } = await supabase.rpc(
        "depart_jeepney",
        {
          p_jeepney_id: jeepneyId,
          p_route: routeForTerminal(jeepney.terminal_id),
          p_dispatcher_id: dispatcherId ?? null,
        },
      );

      if (rpcError) throw rpcError;
      if (departed === false) {
        throw new Error("Jeepney was not eligible to depart.");
      }

      if (jeepney.driver_id) {
        const { error: notifyError } = await supabase
          .from("notifications")
          .insert({
            user_id: jeepney.driver_id,
            title: "🚀 You've been dispatched",
            message: `${jeepney.plate_number} is cleared to depart on ${routeForTerminal(jeepney.terminal_id)}.`,
            type: "dispatch",
            data: { jeepney_id: jeepneyId },
          });

        // Don't fail the whole dispatch over a notification hiccup —
        // the jeepney has already legitimately departed at this point.
        if (notifyError) {
          console.error("Dispatch succeeded but notify failed:", notifyError);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("❌ DispatchService.dispatchJeepney failed:", err);
      return {
        success: false,
        error: err?.message || "Failed to dispatch jeepney",
      };
    }
  }
}
