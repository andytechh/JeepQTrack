import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../config/supabase";

export type AdminStaffRole = "driver" | "dispatcher" | "admin";

const STAFF_ROLES: AdminStaffRole[] = ["driver", "dispatcher", "admin"];

export interface AdminStaffRecord {
  id: string;
  email: string;
  phone_number: string | null;
  display_name: string;
  role: AdminStaffRole;
  jeepney_id: string | null;
  jeepney_name: string | null;
  jeepney_plate_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  preferred_terminal: number | null;
  preferred_bracket: number | null;
  fcm_token: string | null;
  expo_push_token: string | null;
  push_token_type: string | null;
}

export interface CreateStaffData {
  email: string;
  password: string;
  display_name: string;
  phone_number?: string | null;
  role: AdminStaffRole;
  preferred_terminal?: number | null;
  preferred_bracket?: number | null;
  jeepney_id?: string | null;
}

export interface UpdateStaffData {
  display_name?: string;
  phone_number?: string | null;
  role?: AdminStaffRole;
  jeepney_id?: string | null;
  is_active?: boolean;
  preferred_terminal?: number | null;
  preferred_bracket?: number | null;
  avatar_url?: string | null;
}

interface AdminStaffResult {
  staff: AdminStaffRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  createStaff: (data: CreateStaffData) => Promise<AdminStaffRecord>;

  updateStaff: (
    id: string,
    updates: UpdateStaffData,
  ) => Promise<AdminStaffRecord>;

  toggleStaffActive: (
    id: string,
    isActive: boolean,
  ) => Promise<AdminStaffRecord>;

  deleteStaff: (id: string) => Promise<boolean>;
}

function isStaffRole(role: unknown): role is AdminStaffRole {
  return role === "driver" || role === "dispatcher" || role === "admin";
}

function normalizeStaff(item: any): AdminStaffRecord | null {
  if (!item || !isStaffRole(item.role)) {
    return null;
  }

  const jeepney = item.jeepneys ?? null;

  return {
    id: item.id,
    email: item.email ?? "",
    phone_number: item.phone_number ?? null,
    display_name: item.display_name ?? "",
    role: item.role,

    jeepney_id: item.jeepney_id ?? null,

    jeepney_name: jeepney?.jeep_name ?? null,

    jeepney_plate_number: jeepney?.plate_number ?? null,

    is_active: item.is_active ?? true,

    created_at: item.created_at ?? "",

    updated_at: item.updated_at ?? "",

    avatar_url: item.avatar_url ?? null,

    preferred_terminal:
      item.preferred_terminal == null ? null : Number(item.preferred_terminal),

    preferred_bracket:
      item.preferred_bracket == null ? null : Number(item.preferred_bracket),

    fcm_token: item.fcm_token ?? null,

    expo_push_token: item.expo_push_token ?? null,

    push_token_type: item.push_token_type ?? null,
  };
}

const STAFF_SELECT = `
  id,
  email,
  phone_number,
  display_name,
  role,
  jeepney_id,
  is_active,
  created_at,
  updated_at,
  avatar_url,
  preferred_terminal,
  preferred_bracket,
  fcm_token,
  expo_push_token,
  push_token_type,
  jeepneys!users_jeepney_id_fkey (
    id,
    jeep_name,
    plate_number
  )
`;

function getFunctionError(data: any, error: any): Error {
  if (data?.error) {
    return new Error(String(data.error));
  }

  if (data?.message) {
    return new Error(String(data.message));
  }

  if (error?.message) {
    return new Error(error.message);
  }

  return new Error("The staff operation could not be completed.");
}

function validateEmail(email: string): string | null {
  const value = email.trim().toLowerCase();

  if (!value) {
    return "Email is required.";
  }

  if (value.length > 254) {
    return "Email is too long.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return "Please enter a valid email address.";
  }

  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (password.length > 72) {
    return "Password must not exceed 72 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  return null;
}

function validateName(name: string): string | null {
  const value = name.trim();

  if (!value) {
    return "Display name is required.";
  }

  if (value.length < 2) {
    return "Display name must be at least 2 characters.";
  }

  if (value.length > 100) {
    return "Display name must not exceed 100 characters.";
  }

  return null;
}

function validatePhone(phone: string): string | null {
  const value = phone.trim();

  if (!value) {
    return null;
  }

  const normalized = value.replace(/[\s()-]/g, "");

  if (!/^\+?[0-9]{10,15}$/.test(normalized)) {
    return "Please enter a valid phone number.";
  }

  return null;
}

function validateRole(role: AdminStaffRole): string | null {
  if (!isStaffRole(role)) {
    return "Please select a valid staff role.";
  }

  return null;
}

function validateOptionalNumber(
  value: number | null | undefined,
  label: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value)) {
    return `${label} must be a whole number.`;
  }

  if (value < 1) {
    return `${label} must be greater than 0.`;
  }

  return null;
}

function validateCreateStaff(data: CreateStaffData): string | null {
  const emailError = validateEmail(data.email);

  if (emailError) {
    return emailError;
  }

  const passwordError = validatePassword(data.password);

  if (passwordError) {
    return passwordError;
  }

  const nameError = validateName(data.display_name);

  if (nameError) {
    return nameError;
  }

  const phoneError = validatePhone(data.phone_number ?? "");

  if (phoneError) {
    return phoneError;
  }

  const roleError = validateRole(data.role);

  if (roleError) {
    return roleError;
  }

  const terminalError = validateOptionalNumber(
    data.preferred_terminal,
    "Preferred terminal",
  );

  if (terminalError) {
    return terminalError;
  }

  const bracketError = validateOptionalNumber(
    data.preferred_bracket,
    "Preferred bracket",
  );

  if (bracketError) {
    return bracketError;
  }

  return null;
}

export function useAdminStaff(): AdminStaffResult {
  const [staff, setStaff] = useState<AdminStaffRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const channelNameRef = useRef(
    `admin-staff-management-${Math.random().toString(36).slice(2, 10)}`,
  );

  const loadStaff = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select(STAFF_SELECT)
        .in("role", STAFF_ROLES)
        .order("display_name", {
          ascending: true,
        });

      if (fetchError) {
        throw fetchError;
      }

      const normalized = (data ?? [])
        .map(normalizeStaff)
        .filter((item): item is AdminStaffRecord => item !== null);

      if (mountedRef.current) {
        setStaff(normalized);
      }
    } catch (err: any) {
      console.error("Failed to load admin staff:", err);

      if (mountedRef.current) {
        setError(err?.message ?? "Unable to load staff management data.");

        setStaff([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void loadStaff(false);

    return () => {
      mountedRef.current = false;
    };
  }, [loadStaff]);

  useEffect(() => {
    let active = true;

    const oldChannel = channelRef.current;

    if (oldChannel) {
      void supabase.removeChannel(oldChannel);

      channelRef.current = null;
    }

    const channelName = channelNameRef.current;

    const channel = supabase.channel(channelName);

    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "users",
      },
      () => {
        if (!active) {
          return;
        }

        void loadStaff(true);
      },
    );

    channel.subscribe();

    return () => {
      active = false;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadStaff]);

  const refresh = useCallback(async () => {
    await loadStaff(true);
  }, [loadStaff]);

  /*
   * CREATE STAFF
   *
   * Auth user + public.users profile
   * are created by the Edge Function.
   */
  const createStaff = useCallback(
    async (data: CreateStaffData): Promise<AdminStaffRecord> => {
      const validationError = validateCreateStaff(data);

      if (validationError) {
        throw new Error(validationError);
      }

      const { data: result, error: functionError } =
        await supabase.functions.invoke("admin-staff", {
          body: {
            action: "create",

            email: data.email.trim().toLowerCase(),

            password: data.password,

            display_name: data.display_name.trim(),

            phone_number: data.phone_number?.trim() || null,

            role: data.role,

            preferred_terminal: data.preferred_terminal ?? null,

            preferred_bracket: data.preferred_bracket ?? null,

            jeepney_id: data.jeepney_id ?? null,
          },
        });

      if (functionError || result?.success === false) {
        throw getFunctionError(result, functionError);
      }

      const created = normalizeStaff(result?.staff);

      if (!created) {
        throw new Error(
          "Staff was created, but the returned staff profile is invalid.",
        );
      }

      setStaff((current) => {
        const exists = current.some((member) => member.id === created.id);

        if (exists) {
          return current.map((member) =>
            member.id === created.id ? created : member,
          );
        }

        return [...current, created].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        );
      });

      return created;
    },
    [],
  );

  /*
   * UPDATE STAFF
   */
  const updateStaff = useCallback(
    async (id: string, updates: UpdateStaffData): Promise<AdminStaffRecord> => {
      if (!id) {
        throw new Error("Staff ID is required.");
      }

      if (updates.display_name !== undefined && !updates.display_name.trim()) {
        throw new Error("Display name is required.");
      }

      if (
        updates.display_name !== undefined &&
        updates.display_name.trim().length < 2
      ) {
        throw new Error("Display name must be at least 2 characters.");
      }

      if (updates.phone_number !== undefined) {
        const phoneError = validatePhone(updates.phone_number ?? "");

        if (phoneError) {
          throw new Error(phoneError);
        }
      }

      if (updates.role !== undefined && !isStaffRole(updates.role)) {
        throw new Error("Invalid staff role.");
      }

      const { data: result, error: functionError } =
        await supabase.functions.invoke("admin-staff", {
          body: {
            action: "update",
            id,
            ...updates,
          },
        });

      if (functionError || result?.success === false) {
        throw getFunctionError(result, functionError);
      }

      const updated = normalizeStaff(result?.staff);

      if (!updated) {
        throw new Error(
          "The staff profile was updated, but the returned data is invalid.",
        );
      }

      setStaff((current) =>
        current.map((member) => (member.id === id ? updated : member)),
      );

      return updated;
    },
    [],
  );

  /*
   * ACTIVATE / DEACTIVATE
   */
  const toggleStaffActive = useCallback(
    async (id: string, isActive: boolean): Promise<AdminStaffRecord> => {
      if (!id) {
        throw new Error("Staff ID is required.");
      }

      const { data: result, error: functionError } =
        await supabase.functions.invoke("admin-staff", {
          body: {
            action: "toggle_active",

            id,

            is_active: isActive,
          },
        });

      if (functionError || result?.success === false) {
        throw getFunctionError(result, functionError);
      }

      const updated = normalizeStaff(result?.staff);

      if (!updated) {
        throw new Error(
          "The account status was changed, but the updated staff profile could not be loaded.",
        );
      }

      if (updated.is_active !== isActive) {
        throw new Error(
          `Supabase returned an incorrect account status. Expected ${isActive ? "active" : "inactive"}, but received ${updated.is_active ? "active" : "inactive"}.`,
        );
      }

      setStaff((current) =>
        current.map((member) => (member.id === id ? updated : member)),
      );

      return updated;
    },
    [],
  );

  /*
   * DELETE
   */
  const deleteStaff = useCallback(async (id: string): Promise<boolean> => {
    if (!id) {
      throw new Error("Staff ID is required.");
    }

    const { data: result, error: functionError } =
      await supabase.functions.invoke("admin-staff", {
        body: {
          action: "delete",
          id,
        },
      });

    if (functionError || result?.success === false) {
      throw getFunctionError(result, functionError);
    }

    setStaff((current) => current.filter((member) => member.id !== id));

    return true;
  }, []);

  return {
    staff,
    loading,
    refreshing,
    error,
    refresh,
    createStaff,
    updateStaff,
    toggleStaffActive,
    deleteStaff,
  };
}
