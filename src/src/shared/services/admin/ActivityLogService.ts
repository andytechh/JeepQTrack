import { supabase } from "@/src/shared/config/supabase";

export type ActivityAction =
  | "login"
  | "logout"
  | "created"
  | "updated"
  | "deleted"
  | "activated"
  | "deactivated"
  | "assigned"
  | "unassigned"
  | "status_changed"
  | "trip_started"
  | "trip_completed"
  | "trip_cancelled"
  | "passenger_count_recorded"
  | "passenger_count_updated"
  | "notification_sent"
  | "sms_sent";

export type ActivityEntityType =
  | "user"
  | "staff"
  | "jeepney"
  | "terminal"
  | "trip"
  | "door_count"
  | "notification"
  | "system";

export interface CreateActivityLogInput {
  action: ActivityAction | string;
  entity_type: ActivityEntityType | string;
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  terminal_id?: string | null;
  jeepney_id?: string | null;
  user_id?: string | null;
}

export class ActivityLogService {
  /**
   * Creates one activity log using the currently authenticated user.
   *
   * The user_id can be explicitly supplied when the caller already
   * knows which user performed the action.
   */
  static async create(
    input: CreateActivityLogInput,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let userId = input.user_id ?? null;

      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        userId = user?.id ?? null;
      }

      const { error } = await supabase.from("activity_logs").insert({
        user_id: userId,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id ?? null,
        description: input.description,
        metadata: input.metadata ?? {},
        terminal_id: input.terminal_id ?? null,
        jeepney_id: input.jeepney_id ?? null,
      });

      if (error) {
        console.error("❌ Failed to create activity log:", error);

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("❌ ActivityLogService.create error:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create activity log",
      };
    }
  }

  static async login(description: string, metadata?: Record<string, unknown>) {
    return this.create({
      action: "login",
      entity_type: "user",
      description,
      metadata,
    });
  }

  static async logout(description: string, metadata?: Record<string, unknown>) {
    return this.create({
      action: "logout",
      entity_type: "user",
      description,
      metadata,
    });
  }

  static async created(
    entityType: ActivityEntityType,
    entityId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "created",
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async updated(
    entityType: ActivityEntityType,
    entityId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "updated",
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async deleted(
    entityType: ActivityEntityType,
    entityId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "deleted",
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async statusChanged(
    entityType: ActivityEntityType,
    entityId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "status_changed",
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async tripStarted(
    tripId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "trip_started",
      entity_type: "trip",
      entity_id: tripId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async tripCompleted(
    tripId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "trip_completed",
      entity_type: "trip",
      entity_id: tripId,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async passengerCount(
    jeepneyId: string,
    description: string,
    options?: {
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      tripId?: string | null;
    },
  ) {
    return this.create({
      action: "passenger_count_recorded",
      entity_type: "door_count",
      entity_id: options?.tripId ?? null,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: jeepneyId,
    });
  }

  static async notificationSent(
    description: string,
    options?: {
      entityId?: string | null;
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "notification_sent",
      entity_type: "notification",
      entity_id: options?.entityId ?? null,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }

  static async smsSent(
    description: string,
    options?: {
      entityId?: string | null;
      metadata?: Record<string, unknown>;
      terminalId?: string | null;
      jeepneyId?: string | null;
    },
  ) {
    return this.create({
      action: "sms_sent",
      entity_type: "notification",
      entity_id: options?.entityId ?? null,
      description,
      metadata: options?.metadata,
      terminal_id: options?.terminalId,
      jeepney_id: options?.jeepneyId,
    });
  }
}

export default ActivityLogService;
