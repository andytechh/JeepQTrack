import { supabase } from "@/src/shared/config/supabase";
import ActivityLogService from "@/src/shared/services/admin/ActivityLogService";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminJeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number | null;
  status: JeepneyStatus;
  current_occupancy: number | null;
  last_occupancy_update: string | null;
  queue_position: number | null;
  departure_time: string | null;
  eta: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string | null;
  updated_at: string | null;
  latitude: number | null;
  longitude: number | null;
  last_queue_update: string | null;
  entered_geofence_at: string | null;
  loading_started_at: string | null;
  departed_at: string | null;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  terminal_id: number | null;
  loading_ends_at: string | null;
  image_url: string | null;
}

export interface AddJeepneyInput {
  plate_number: string;
  jeep_name?: string | null;
  bracket: number;
  capacity?: number | null;
  driver_id?: string | null;
  driver_name?: string | null;
  terminal_id?: number | null;
  image_uri?: string | null;
}

export interface UpdateJeepneyInput {
  plate_number?: string;
  bracket?: number;
  capacity?: number | null;
  jeep_name?: string | null;
  driver_name?: string | null;
  driver_id?: string | null;
  terminal_id?: number | null;
  image_url?: string | null;
  status?: JeepneyStatus;
}

export interface AvailableDriver {
  id: string;
  display_name: string;
  phone_number?: string | null;
}

export interface AdminJeepneyRecord extends AdminJeepney {
  terminal_name: string | null;
  last_gps_at: string | null;
}

const JEEPNEY_COLUMNS = `
  id,
  plate_number,
  bracket,
  capacity,
  status,
  current_occupancy,
  last_occupancy_update,
  queue_position,
  departure_time,
  eta,
  current_latitude,
  current_longitude,
  last_location_update,
  created_at,
  updated_at,
  latitude,
  longitude,
  last_queue_update,
  entered_geofence_at,
  loading_started_at,
  departed_at,
  jeep_name,
  driver_name,
  driver_id,
  terminal_id,
  loading_ends_at,
  image_url
`;

const BUCKET = "jeepney-images";

function getContentType(uri: string) {
  const clean = uri.split("?")[0].toLowerCase();

  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";

  if (clean.endsWith(".heic") || clean.endsWith(".heif")) {
    return "image/heic";
  }

  return "image/jpeg";
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase();
}

function normalizeDriverId(driverId?: string | null) {
  const value = driverId?.trim();
  return value ? value : null;
}

function jeepneyLabel(jeepney: {
  jeep_name?: string | null;
  plate_number?: string | null;
}) {
  return (
    jeepney.jeep_name?.trim() ||
    jeepney.plate_number?.trim() ||
    "Unnamed jeepney"
  );
}

function getChangedFields(
  before: AdminJeepney,
  after: AdminJeepney,
): Record<string, unknown> {
  const fields = [
    "plate_number",
    "jeep_name",
    "bracket",
    "capacity",
    "driver_id",
    "driver_name",
    "terminal_id",
    "status",
    "image_url",
  ] as const;

  const changes: Record<string, unknown> = {};

  for (const field of fields) {
    const oldValue = before[field];
    const newValue = after[field];

    if (oldValue !== newValue) {
      changes[field] = {
        from: oldValue ?? null,
        to: newValue ?? null,
      };
    }
  }

  return changes;
}

async function createActivityLogSafely(
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  options?: {
    metadata?: Record<string, unknown>;
    terminalId?: string | null;
    jeepneyId?: string | null;
  },
) {
  try {
    const result = await ActivityLogService.create({
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: options?.metadata ?? {},
      terminal_id: options?.terminalId ?? null,
      jeepney_id: options?.jeepneyId ?? null,
    });

    if (!result.success) {
      console.warn(
        "⚠️ Activity log was not recorded:",
        result.error ?? "Unknown error",
      );
    }
  } catch (error) {
    console.warn("⚠️ Activity log failed:", error);
  }
}

export class AdminJeepneyService {
  private static readonly LIST_CHANNEL = "admin-jeepneys-realtime";

  static getColumns() {
    return JEEPNEY_COLUMNS;
  }

  private static removeExistingChannel(channelName: string) {
    const existing = supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${channelName}`);

    existing.forEach((channel) => {
      console.log(`♻️ Removing existing Supabase channel: ${channelName}`);

      void supabase.removeChannel(channel);
    });
  }

  static async getJeepneys(): Promise<AdminJeepney[]> {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(JEEPNEY_COLUMNS)
      .order("terminal_id", { ascending: true })
      .order("queue_position", {
        ascending: true,
        nullsFirst: false,
      })
      .order("plate_number", { ascending: true });

    if (error) {
      console.error("❌ Failed to fetch admin jeepneys:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as AdminJeepney[];
  }

  static async getJeepney(jeepneyId: string): Promise<AdminJeepney | null> {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    const { data, error } = await supabase
      .from("jeepneys")
      .select(JEEPNEY_COLUMNS)
      .eq("id", jeepneyId)
      .maybeSingle();

    if (error) {
      console.error("❌ Failed to fetch jeepney:", error);
      throw new Error(error.message);
    }

    return data as AdminJeepney | null;
  }

  static async getLatestGpsAt(jeepneyId: string) {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    const { data, error } = await supabase
      .from("gps_tracking")
      .select("recorded_at")
      .eq("jeepney_id", jeepneyId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("⚠️ Failed to fetch latest jeepney GPS:", error);
      return null;
    }

    return data?.recorded_at ?? null;
  }

  static async getAvailableDrivers(): Promise<AvailableDriver[]> {
    const [
      { data: driverRows, error: driverError },
      { data: assignedRows, error: assignedError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, phone_number")
        .eq("role", "driver")
        .order("display_name", { ascending: true }),

      supabase
        .from("jeepneys")
        .select("driver_id")
        .not("driver_id", "is", null),
    ]);

    if (driverError) {
      console.error("❌ Failed to fetch drivers:", driverError);
      throw new Error(driverError.message);
    }

    if (assignedError) {
      console.error("❌ Failed to fetch assigned driver IDs:", assignedError);
      throw new Error(assignedError.message);
    }

    const assignedDriverIds = new Set(
      (assignedRows ?? [])
        .map((row: any) => String(row.driver_id ?? "").trim())
        .filter(Boolean),
    );

    return (driverRows ?? [])
      .filter((row: any) => !assignedDriverIds.has(String(row.id)))
      .map((row: any) => ({
        id: row.id,
        display_name:
          row.display_name || row.full_name || row.name || "Unnamed Driver",
        phone_number: row.phone_number ?? null,
      }));
  }

  static async getTerminalNames(): Promise<Record<number, string>> {
    const { data, error } = await supabase
      .from("terminals")
      .select("terminal_number, name");

    if (error) {
      console.error("⚠️ Failed to fetch terminal names:", error);
      return {};
    }

    return Object.fromEntries(
      (data ?? []).map((row: any) => [
        Number(row.terminal_number),
        row.name ?? `Terminal ${row.terminal_number}`,
      ]),
    );
  }

  static async getAdminJeepneyRecords(): Promise<AdminJeepneyRecord[]> {
    const [jeepneys, terminalNames] = await Promise.all([
      this.getJeepneys(),
      this.getTerminalNames(),
    ]);

    const gpsRows = await supabase
      .from("latest_gps_tracking")
      .select("jeepney_id, recorded_at");

    const lastGpsById = new Map<string, string | null>();

    if (!gpsRows.error) {
      (gpsRows.data ?? []).forEach((row: any) => {
        if (row.jeepney_id) {
          lastGpsById.set(row.jeepney_id, row.recorded_at ?? null);
        }
      });
    }

    return jeepneys.map((jeepney) => ({
      ...jeepney,
      terminal_name:
        jeepney.terminal_id == null
          ? null
          : (terminalNames[Number(jeepney.terminal_id)] ??
            `Terminal ${jeepney.terminal_id}`),
      last_gps_at:
        lastGpsById.get(jeepney.id) ?? jeepney.last_location_update ?? null,
    }));
  }

  private static async resolveDriver(driverId: string | null) {
    if (!driverId) {
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, phone_number")
      .eq("id", driverId)
      .eq("role", "driver")
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to verify driver: ${error.message}`);
    }

    if (!data) {
      throw new Error("The selected driver does not exist or is not a driver.");
    }

    return {
      id: data.id,
      display_name: data.display_name || "Unnamed Driver",
      phone_number: data.phone_number ?? null,
    };
  }

  private static async syncTerminalAssignment(
    jeepneyId: string,
    terminalId: number | null,
  ) {
    const { error: deactivateError } = await supabase
      .from("terminal_jeepneys")
      .update({ is_active: false })
      .eq("jeepney_id", jeepneyId);

    if (deactivateError) {
      throw new Error(
        `Unable to update terminal assignment: ${deactivateError.message}`,
      );
    }

    if (terminalId == null) {
      return;
    }

    const { data: terminal, error: terminalError } = await supabase
      .from("terminals")
      .select("id, terminal_number")
      .eq("terminal_number", terminalId)
      .maybeSingle();

    if (terminalError) {
      throw new Error(`Unable to verify terminal: ${terminalError.message}`);
    }

    if (!terminal) {
      throw new Error(`Terminal ${terminalId} does not exist.`);
    }

    const { error: assignmentError } = await supabase
      .from("terminal_jeepneys")
      .insert({
        terminal_id: terminal.id,
        jeepney_id: jeepneyId,
        is_active: true,
      });

    if (assignmentError) {
      throw new Error(
        `Unable to save terminal assignment: ${assignmentError.message}`,
      );
    }
  }

  static async addJeepney(input: AddJeepneyInput): Promise<AdminJeepney> {
    const plate = normalizePlate(input.plate_number);

    if (!plate) {
      throw new Error("Plate number is required.");
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("jeepneys")
      .select("id")
      .eq("plate_number", plate)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(duplicateError.message);
    }

    if (duplicate) {
      throw new Error("A jeepney with this plate number already exists.");
    }

    const driverId = normalizeDriverId(input.driver_id);

    const driver = await this.resolveDriver(driverId);

    const terminalId = input.terminal_id ?? 1;

    const { data, error } = await supabase
      .from("jeepneys")
      .insert({
        plate_number: plate,
        jeep_name: input.jeep_name?.trim() || null,
        bracket: input.bracket,
        capacity: input.capacity ?? 24,
        driver_id: driver?.id ?? null,
        driver_name: driver?.display_name ?? null,
        terminal_id: terminalId,
        current_occupancy: 0,
        status: "inactive",
        queue_position: null,
        departure_time: null,
        eta: null,
        current_latitude: null,
        current_longitude: null,
        loading_ends_at: null,
      })
      .select(JEEPNEY_COLUMNS)
      .single();

    if (error) {
      console.error("❌ Failed to add jeepney:", error);
      throw new Error(error.message);
    }

    const jeepney = data as AdminJeepney;

    try {
      await this.syncTerminalAssignment(jeepney.id, terminalId);
    } catch (assignmentError) {
      await supabase.from("jeepneys").delete().eq("id", jeepney.id);

      throw assignmentError;
    }

    let finalJeepney = jeepney;

    if (input.image_uri) {
      try {
        finalJeepney = await this.uploadJeepneyImageWithoutLog(
          jeepney.id,
          input.image_uri,
          getContentType(input.image_uri),
        );
      } catch (imageError) {
        console.error(
          "⚠️ Jeepney created but image upload failed:",
          imageError,
        );
      }
    }

    await createActivityLogSafely(
      "created",
      "jeepney",
      finalJeepney.id,
      `Created jeepney ${jeepneyLabel(finalJeepney)}`,
      {
        terminalId:
          finalJeepney.terminal_id != null
            ? String(finalJeepney.terminal_id)
            : null,
        jeepneyId: finalJeepney.id,
        metadata: {
          jeep_name: finalJeepney.jeep_name,
          plate_number: finalJeepney.plate_number,
          bracket: finalJeepney.bracket,
          capacity: finalJeepney.capacity,
          driver_id: finalJeepney.driver_id,
          driver_name: finalJeepney.driver_name,
          terminal_id: finalJeepney.terminal_id,
          status: finalJeepney.status,
          has_image: Boolean(finalJeepney.image_url),
        },
      },
    );

    return finalJeepney;
  }

  static async updateJeepney(
    jeepneyId: string,
    updates: UpdateJeepneyInput,
  ): Promise<AdminJeepney> {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    const current = await this.getJeepney(jeepneyId);

    if (!current) {
      throw new Error("Jeepney not found.");
    }

    const cleanedUpdates: Record<string, unknown> = {};

    if (updates.plate_number !== undefined) {
      const plate = normalizePlate(updates.plate_number);

      if (!plate) {
        throw new Error("Plate number is required.");
      }

      if (plate !== current.plate_number) {
        const { data: duplicate, error: duplicateError } = await supabase
          .from("jeepneys")
          .select("id")
          .eq("plate_number", plate)
          .neq("id", jeepneyId)
          .maybeSingle();

        if (duplicateError) {
          throw new Error(duplicateError.message);
        }

        if (duplicate) {
          throw new Error("A jeepney with this plate number already exists.");
        }
      }

      cleanedUpdates.plate_number = plate;
    }

    if (updates.bracket !== undefined) {
      cleanedUpdates.bracket = updates.bracket;
    }

    if (updates.capacity !== undefined) {
      cleanedUpdates.capacity = updates.capacity;
    }

    if (updates.jeep_name !== undefined) {
      cleanedUpdates.jeep_name = updates.jeep_name?.trim() || null;
    }

    if (updates.image_url !== undefined) {
      cleanedUpdates.image_url = updates.image_url;
    }

    if (updates.status !== undefined) {
      cleanedUpdates.status = updates.status;
    }

    let resolvedTerminalId = current.terminal_id;
    let terminalChanged = false;

    if (updates.terminal_id !== undefined) {
      resolvedTerminalId = updates.terminal_id ?? null;

      terminalChanged = resolvedTerminalId !== current.terminal_id;

      cleanedUpdates.terminal_id = resolvedTerminalId;
    }

    if (updates.driver_id !== undefined) {
      const driverId = normalizeDriverId(updates.driver_id);

      const driver = await this.resolveDriver(driverId);

      cleanedUpdates.driver_id = driver?.id ?? null;
      cleanedUpdates.driver_name = driver?.display_name ?? null;
    } else if (updates.driver_name !== undefined) {
      cleanedUpdates.driver_name = updates.driver_name?.trim() || null;
    }

    if (Object.keys(cleanedUpdates).length > 0) {
      const { error } = await supabase
        .from("jeepneys")
        .update(cleanedUpdates)
        .eq("id", jeepneyId);

      if (error) {
        console.error("❌ Failed to update jeepney:", error);
        throw new Error(error.message);
      }
    }

    if (terminalChanged) {
      try {
        await this.syncTerminalAssignment(jeepneyId, resolvedTerminalId);
      } catch (assignmentError) {
        await supabase
          .from("jeepneys")
          .update({
            terminal_id: current.terminal_id,
          })
          .eq("id", jeepneyId);

        throw assignmentError;
      }
    }

    const updated = await this.getJeepney(jeepneyId);

    if (!updated) {
      throw new Error("Unable to retrieve updated jeepney.");
    }

    const changes = getChangedFields(current, updated);

    if (Object.keys(changes).length > 0) {
      const statusChanged = current.status !== updated.status;

      const action = statusChanged ? "status_changed" : "updated";

      const description = statusChanged
        ? `Changed ${jeepneyLabel(updated)} status from ${current.status} to ${updated.status}`
        : `Updated jeepney ${jeepneyLabel(updated)}`;

      await createActivityLogSafely(
        action,
        "jeepney",
        updated.id,
        description,
        {
          terminalId:
            updated.terminal_id != null ? String(updated.terminal_id) : null,
          jeepneyId: updated.id,
          metadata: {
            changes,
            previous: {
              jeep_name: current.jeep_name,
              plate_number: current.plate_number,
              bracket: current.bracket,
              capacity: current.capacity,
              driver_id: current.driver_id,
              driver_name: current.driver_name,
              terminal_id: current.terminal_id,
              status: current.status,
            },
            current: {
              jeep_name: updated.jeep_name,
              plate_number: updated.plate_number,
              bracket: updated.bracket,
              capacity: updated.capacity,
              driver_id: updated.driver_id,
              driver_name: updated.driver_name,
              terminal_id: updated.terminal_id,
              status: updated.status,
            },
          },
        },
      );
    }

    return updated;
  }

  static async setStatus(
    jeepneyId: string,
    status: JeepneyStatus,
  ): Promise<AdminJeepney> {
    return this.updateJeepney(jeepneyId, { status });
  }

  static async disableJeepney(jeepneyId: string) {
    const current = await this.getJeepney(jeepneyId);

    const { error: terminalError } = await supabase
      .from("terminal_jeepneys")
      .update({ is_active: false })
      .eq("jeepney_id", jeepneyId);

    if (terminalError) {
      throw new Error(terminalError.message);
    }

    const updated = await this.setStatus(jeepneyId, "inactive");

    if (current && current.status !== "inactive") {
      await createActivityLogSafely(
        "deactivated",
        "jeepney",
        jeepneyId,
        `Deactivated jeepney ${jeepneyLabel(current)}`,
        {
          terminalId:
            current.terminal_id != null ? String(current.terminal_id) : null,
          jeepneyId,
          metadata: {
            previous_status: current.status,
            new_status: "inactive",
          },
        },
      );
    }

    return updated;
  }

  static async deleteJeepney(jeepneyId: string) {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    const current = await this.getJeepney(jeepneyId);

    if (!current) {
      throw new Error("Jeepney not found.");
    }

    /*
     * Save the information before deletion because
     * the jeepney row will no longer exist afterward.
     */
    const deletedJeepneyInfo = {
      id: current.id,
      jeep_name: current.jeep_name,
      plate_number: current.plate_number,
      bracket: current.bracket,
      capacity: current.capacity,
      driver_id: current.driver_id,
      driver_name: current.driver_name,
      terminal_id: current.terminal_id,
      status: current.status,
    };

    const { error: assignmentError } = await supabase
      .from("terminal_jeepneys")
      .delete()
      .eq("jeepney_id", jeepneyId);

    if (assignmentError) {
      console.error(
        "❌ Failed to delete terminal assignment:",
        assignmentError,
      );

      throw new Error(
        `Unable to remove terminal assignment: ${assignmentError.message}`,
      );
    }

    const { error: jeepneyError } = await supabase
      .from("jeepneys")
      .delete()
      .eq("id", jeepneyId);

    if (jeepneyError) {
      console.error("❌ Failed to delete jeepney:", jeepneyError);

      const message = jeepneyError.message.toLowerCase();

      if (
        message.includes("foreign key") ||
        message.includes("violates") ||
        message.includes("referenced") ||
        message.includes("constraint")
      ) {
        throw new Error(
          "This jeepney cannot be permanently deleted because it has existing records such as trips, GPS tracking, or passenger-count history. Disable the jeepney instead to preserve its history.",
        );
      }

      throw new Error(`Unable to delete jeepney: ${jeepneyError.message}`);
    }

    const imagePath = `${jeepneyId}/profile`;

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([imagePath]);

    if (storageError) {
      console.warn(
        "⚠️ Jeepney deleted, but its image could not be removed:",
        storageError,
      );
    }

    /*
     * Do not associate jeepney_id with this log after deletion.
     * If jeepney_id is a foreign key, the deleted row would make
     * the activity log insert fail.
     */
    await createActivityLogSafely(
      "deleted",
      "jeepney",
      null,
      `Deleted jeepney ${jeepneyLabel(deletedJeepneyInfo)}`,
      {
        terminalId:
          deletedJeepneyInfo.terminal_id != null
            ? String(deletedJeepneyInfo.terminal_id)
            : null,
        jeepneyId: null,
        metadata: {
          deleted_jeepney_id: deletedJeepneyInfo.id,
          jeep_name: deletedJeepneyInfo.jeep_name,
          plate_number: deletedJeepneyInfo.plate_number,
          bracket: deletedJeepneyInfo.bracket,
          capacity: deletedJeepneyInfo.capacity,
          driver_id: deletedJeepneyInfo.driver_id,
          driver_name: deletedJeepneyInfo.driver_name,
          terminal_id: deletedJeepneyInfo.terminal_id,
          status: deletedJeepneyInfo.status,
        },
      },
    );
  }

  /*
   * Internal image upload used by addJeepney.
   *
   * We intentionally do not call updateJeepney() here because
   * that would create a second "updated jeepney" activity log
   * immediately after the "created jeepney" log.
   */
  private static async uploadJeepneyImageWithoutLog(
    jeepneyId: string,
    uri: string,
    contentType?: string,
  ): Promise<AdminJeepney> {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error("Unable to read the selected jeepney image.");
    }

    const arrayBuffer = await response.arrayBuffer();

    const filePath = `${jeepneyId}/profile`;

    const mimeType = contentType ?? getContentType(uri);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("❌ Failed to upload jeepney image:", uploadError);

      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      throw new Error("Unable to create the jeepney image URL.");
    }

    const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { data, error } = await supabase
      .from("jeepneys")
      .update({
        image_url: cacheBustedUrl,
      })
      .eq("id", jeepneyId)
      .select(JEEPNEY_COLUMNS)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as AdminJeepney;
  }

  static async uploadJeepneyImage(
    jeepneyId: string,
    uri: string,
    contentType?: string,
  ): Promise<AdminJeepney> {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error("Unable to read the selected jeepney image.");
    }

    const arrayBuffer = await response.arrayBuffer();

    const filePath = `${jeepneyId}/profile`;

    const mimeType = contentType ?? getContentType(uri);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("❌ Failed to upload jeepney image:", uploadError);

      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      throw new Error("Unable to create the jeepney image URL.");
    }

    const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

    return this.updateJeepney(jeepneyId, {
      image_url: cacheBustedUrl,
    });
  }

  static async removeJeepneyImage(jeepneyId: string) {
    const filePath = `${jeepneyId}/profile`;

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.warn("⚠️ Storage image removal failed:", storageError);
    }

    const { data, error } = await supabase
      .from("jeepneys")
      .update({
        image_url: null,
      })
      .eq("id", jeepneyId)
      .select(JEEPNEY_COLUMNS)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    /*
     * updateJeepney() detects the image_url change
     * and creates the activity log.
     */
    return data as AdminJeepney;
  }

  static subscribeToJeepneys(onChange: () => void) {
    const channelName = this.LIST_CHANNEL;

    this.removeExistingChannel(channelName);

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "jeepneys",
      },
      () => {
        onChange();
      },
    );

    channel.subscribe((status) => {
      console.log("📡 Admin jeepneys realtime:", status);
    });

    return channel;
  }

  static subscribeToJeepney(
    jeepneyId: string,
    onJeepneyChange: () => void,
    onGpsChange?: (recordedAt: string) => void,
  ) {
    if (!jeepneyId) {
      throw new Error("Jeepney ID is required.");
    }

    const channelName = `admin-jeepney-details-${jeepneyId}`;

    this.removeExistingChannel(channelName);

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "jeepneys",
        filter: `id=eq.${jeepneyId}`,
      },
      () => {
        onJeepneyChange();
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "gps_tracking",
        filter: `jeepney_id=eq.${jeepneyId}`,
      },
      (payload) => {
        const recordedAt =
          (payload.new as any)?.recorded_at ?? new Date().toISOString();

        onGpsChange?.(recordedAt);

        onJeepneyChange();
      },
    );

    channel.subscribe((status) => {
      console.log(`📡 Jeepney details realtime: ${status}`);
    });

    return channel;
  }
}

export default AdminJeepneyService;
