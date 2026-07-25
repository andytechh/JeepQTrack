// app/staff/login.tsx - With Secure Store
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronRight, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import Toast from "react-native-toast-message";
import { AuthService } from "../../src/shared/services/AuthService";
import { useAuthStore } from "../../src/shared/store/authStore";

// ─── Constants ──────────────────────────────────────────────────────
const STORAGE_KEYS = {
  REMEMBER_EMAIL: "remember_email",
  REMEMBER_PASSWORD: "remember_password",
  REMEMBER_ME: "remember_me",
};

// ─── Security Constants ───────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 254;

// ─── Validation Utilities ────────────────────────────────────────────
class SecurityValidator {
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { isValid: false, error: "Email is required" };
    }
    if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      return {
        isValid: false,
        error: `Email must be less than ${MAX_EMAIL_LENGTH} characters`,
      };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: "Please enter a valid email address" };
    }
    return { isValid: true };
  }

  static validatePassword(password: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!password) {
      return { isValid: false, error: "Password is required" };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        isValid: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      };
    }
    return { isValid: true };
  }

  static validateRole(
    role: string,
    allowedRoles: string[],
  ): { isValid: boolean; error?: string } {
    if (!role) {
      return { isValid: false, error: "Role is required" };
    }
    if (!allowedRoles.includes(role)) {
      return { isValid: false, error: "Invalid role selected" };
    }
    return { isValid: true };
  }

  static sanitizeInput(input: string): string {
    return input.trim();
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────────
class RateLimiter {
  private attempts: Map<string, { count: number; timestamp: number }> =
    new Map();

  check(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockoutTime?: number;
  } {
    const record = this.attempts.get(identifier);
    const now = Date.now();
    if (!record) {
      return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
    }
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      const timeElapsed = now - record.timestamp;
      if (timeElapsed < LOCKOUT_DURATION) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutTime: Math.ceil((LOCKOUT_DURATION - timeElapsed) / 1000 / 60),
        };
      } else {
        this.attempts.delete(identifier);
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS };
      }
    }
    return {
      allowed: true,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - record.count,
    };
  }

  recordAttempt(identifier: string): void {
    const record = this.attempts.get(identifier);
    const now = Date.now();
    if (!record) {
      this.attempts.set(identifier, { count: 1, timestamp: now });
    } else {
      if (now - record.timestamp > 3600000) {
        this.attempts.set(identifier, { count: 1, timestamp: now });
      } else {
        record.count += 1;
        this.attempts.set(identifier, record);
      }
    }
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// ─── Role Icons ──────────────────────────────────────────────────────
const RoleIcons = {
  driver: (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Rect
        x="2"
        y="8"
        width="22"
        height="12"
        rx="4"
        fill="#0ea5e9"
        opacity="0.9"
      />
      <Rect
        x="3"
        y="9"
        width="10"
        height="5"
        rx="2"
        fill="rgba(255,255,255,0.5)"
      />
      <Circle cx="7" cy="21" r="3" fill="#0369a1" />
      <Circle cx="21" cy="21" r="3" fill="#0369a1" />
      <Rect
        x="21"
        y="10"
        width="5"
        height="8"
        rx="2"
        fill="#0369a1"
        opacity="0.5"
      />
    </Svg>
  ),
  dispatcher: (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Rect
        x="3"
        y="4"
        width="22"
        height="16"
        rx="4"
        fill="#0ea5e9"
        opacity="0.9"
      />
      <Rect
        x="5"
        y="6"
        width="14"
        height="10"
        rx="2"
        fill="rgba(255,255,255,0.3)"
      />
      <Line
        x1="5"
        y1="10"
        x2="19"
        y2="10"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
      <Line
        x1="5"
        y1="13"
        x2="15"
        y2="13"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
      <Rect
        x="10"
        y="20"
        width="8"
        height="4"
        rx="2"
        fill="#0369a1"
        opacity="0.6"
      />
      <Rect
        x="6"
        y="24"
        width="16"
        height="2"
        rx="1"
        fill="#0369a1"
        opacity="0.4"
      />
    </Svg>
  ),
  admin: (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="10" r="5" fill="#0ea5e9" opacity="0.9" />
      <Path
        d="M5 24 C5 18.5 9 15 14 15 C19 15 23 18.5 23 24"
        fill="#0369a1"
        opacity="0.7"
      />
      <Circle cx="22" cy="8" r="4" fill="#22d3ee" />
      <Path
        d="M20.5 8 L21.5 9 L24 6.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  ),
};

const roles = [
  {
    key: "driver",
    label: "Driver",
    icon: RoleIcons.driver,
    desc: "Operate GPS & passenger count",
  },
  {
    key: "dispatcher",
    label: "Dispatcher",
    icon: RoleIcons.dispatcher,
    desc: "Manage queue & terminal",
  },
  {
    key: "admin",
    label: "Administrator",
    icon: RoleIcons.admin,
    desc: "Full system access",
  },
];

// ─── Main Component ──────────────────────────────────────────────────
interface Props {
  selectedRole?: string;
  onSelectRole?: (r: string) => void;
}

const StaffLoginScreen: React.FC<Props> = ({
  selectedRole: initialSelectedRole = "driver",
  onSelectRole,
}) => {
  const { setUser } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState(initialSelectedRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  const rateLimiter = useRef(new RateLimiter());
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

  // ─── Load Saved Credentials from Secure Store ──────────────────────
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      setIsLoadingCredentials(true);

      // Check if remember me was enabled
      const rememberMeValue = await SecureStore.getItemAsync(
        STORAGE_KEYS.REMEMBER_ME,
      );
      const isRemembered = rememberMeValue === "true";

      if (isRemembered) {
        // Load saved email and password from secure storage
        const savedEmail = await SecureStore.getItemAsync(
          STORAGE_KEYS.REMEMBER_EMAIL,
        );
        const savedPassword = await SecureStore.getItemAsync(
          STORAGE_KEYS.REMEMBER_PASSWORD,
        );

        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  // ─── Save Credentials to Secure Store ─────────────────────────────
  const saveCredentials = async (email: string, password: string) => {
    try {
      if (rememberMe) {
        // Save all credentials securely
        await SecureStore.setItemAsync(STORAGE_KEYS.REMEMBER_EMAIL, email);
        await SecureStore.setItemAsync(
          STORAGE_KEYS.REMEMBER_PASSWORD,
          password,
        );
        await SecureStore.setItemAsync(STORAGE_KEYS.REMEMBER_ME, "true");
      } else {
        // Clear saved credentials
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_EMAIL);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_PASSWORD);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_ME);
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  // ─── Clear Credentials ────────────────────────────────────────────
  const clearCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_EMAIL);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_PASSWORD);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_ME);
    } catch (error) {
      console.error("Error clearing credentials:", error);
    }
  };

  useEffect(() => {
    setSelectedRole(initialSelectedRole);
  }, [initialSelectedRole]);

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    if (onSelectRole) {
      onSelectRole(roleKey);
    }
  };

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    if (isLockedOut) {
      Toast.show({
        type: "error",
        text1: "Account Locked",
        text2: `Please try again in ${lockoutMinutes} minutes.`,
      });
      return;
    }

    const sanitizedEmail = SecurityValidator.sanitizeInput(email);
    const sanitizedPassword = SecurityValidator.sanitizeInput(password);

    const emailValidation = SecurityValidator.validateEmail(sanitizedEmail);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: emailValidation.error,
      });
      return;
    }

    const passwordValidation =
      SecurityValidator.validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error!);
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: passwordValidation.error,
      });
      return;
    }

    const roleValidation = SecurityValidator.validateRole(
      selectedRole,
      roles.map((r) => r.key),
    );
    if (!roleValidation.isValid) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: roleValidation.error,
      });
      return;
    }

    const rateCheck = rateLimiter.current.check(sanitizedEmail);
    if (!rateCheck.allowed) {
      setIsLockedOut(true);
      setLockoutMinutes(rateCheck.lockoutTime || 15);
      Toast.show({
        type: "error",
        text1: "Too Many Attempts",
        text2: `Please wait ${rateCheck.lockoutTime} minutes before trying again.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = await AuthService.login({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (!user || !user.uid || !user.email) {
        throw new Error("Invalid user data received");
      }

      if (!user.isActive) {
        Toast.show({
          type: "error",
          text1: "Account Inactive",
          text2: "Your account has been deactivated. Please contact support.",
        });
        rateLimiter.current.recordAttempt(sanitizedEmail);
        setIsLoading(false);
        return;
      }

      if (selectedRole !== user.role) {
        Toast.show({
          type: "error",
          text1: "Role Mismatch",
          text2: `This account is registered as a ${user.role}. Please select the correct role.`,
        });
        rateLimiter.current.recordAttempt(sanitizedEmail);
        setIsLoading(false);
        return;
      }

      rateLimiter.current.reset(sanitizedEmail);
      setLoginAttempts(0);
      setIsLockedOut(false);

      // ✅ Save credentials securely if remember me is checked
      await saveCredentials(sanitizedEmail, sanitizedPassword);

      setUser(user);

      Toast.show({
        type: "success",
        text1: "Welcome back!",
        text2: `Signed in as ${user.displayName || user.role}`,
        visibilityTime: 3000,
      });

      setTimeout(() => {
        if (user.role === "driver") {
          router.replace("/staff/(driver)" as any);
        } else if (user.role === "dispatcher") {
          router.replace("/staff/(dispatcher)" as any);
        } else if (user.role === "admin") {
          router.replace("/staff/(admin)" as any);
        } else {
          router.replace("/staff/(driver)" as any);
        }
      }, 500);
    } catch (error: any) {
      console.error("Login error:", error);

      rateLimiter.current.recordAttempt(sanitizedEmail);
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setIsLockedOut(true);
        setLockoutMinutes(15);
        Toast.show({
          type: "error",
          text1: "Account Locked",
          text2: "Too many failed attempts. Please try again in 15 minutes.",
        });
        setIsLoading(false);
        return;
      }

      let errorMessage = "Invalid email or password.";
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = `Invalid email or password. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`;
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address before logging in.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      }

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const sanitizedEmail = SecurityValidator.sanitizeInput(resetEmail);
    const emailValidation = SecurityValidator.validateEmail(sanitizedEmail);
    if (!emailValidation.isValid) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: emailValidation.error,
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const rateCheck = rateLimiter.current.check(`reset_${sanitizedEmail}`);
      if (!rateCheck.allowed) {
        Toast.show({
          type: "error",
          text1: "Too Many Requests",
          text2: `Please wait ${rateCheck.lockoutTime} minutes before requesting another reset.`,
        });
        setIsResettingPassword(false);
        return;
      }

      await AuthService.resetPassword(sanitizedEmail);
      rateLimiter.current.reset(`reset_${sanitizedEmail}`);

      Toast.show({
        type: "success",
        text1: "Password Reset Email Sent",
        text2: "The link will expire in 1 hour for security reasons.",
        visibilityTime: 4000,
      });

      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to send password reset email.",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────
  if (isLoadingCredentials) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8fbff",
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 12, color: "#94a3b8" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fbff" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />

      {/* Header - Fixed height */}
      <LinearGradient
        colors={["#0a1628", "#0c4a6e", "#0369a1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          height: 220,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -80,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: 120,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 40,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: 90,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 60,
            right: 40,
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(14,165,233,0.15)",
          }}
        />

        <View
          style={{
            paddingTop: 50,
            paddingHorizontal: 28,
            position: "relative",
            zIndex: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(14,165,233,0.2)",
              borderWidth: 1,
              borderColor: "rgba(14,165,233,0.3)",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              alignSelf: "flex-start",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#22c55e",
              }}
            />
            <Text
              style={{
                color: "#22d3ee",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.1,
                textTransform: "uppercase",
              }}
            >
              Staff Portal
            </Text>
          </View>
          <Text
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: "800",
              letterSpacing: -0.78,
              lineHeight: 28,
            }}
          >
            SmartQueue{"\n"}Staff Access
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Donsol–Daraga Terminal
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: -1,
            left: 0,
            right: 0,
            width: "100%",
          }}
        >
          <Svg
            viewBox="0 0 390 120"
            style={{ width: "100%", height: 50 }}
            preserveAspectRatio="none"
          >
            <Path
              d="M0,60 C80,100 160,20 240,60 C320,100 360,40 390,60 L390,120 L0,120 Z"
              fill="#f8fbff"
            />
          </Svg>
        </View>
      </LinearGradient>

      {/* Form with KeyboardAwareScrollView */}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: "#f8fbff" }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={Platform.OS === "ios" ? 20 : 0}
        enableOnAndroid={true}
        keyboardOpeningTime={0}
      >
        {/* Role selector */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#94a3b8",
              letterSpacing: 0.96,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Select Your Role
          </Text>
          <View style={{ gap: 8 }}>
            {roles.map((role) => {
              const isSelected = selectedRole === role.key;
              return (
                <TouchableOpacity
                  key={role.key}
                  onPress={() => handleRoleSelect(role.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected
                      ? "rgba(14,165,233,0.06)"
                      : "white",
                    borderWidth: 2,
                    borderColor: isSelected
                      ? "#0ea5e9"
                      : "rgba(14,165,233,0.1)",
                    borderRadius: 16,
                    shadowColor: isSelected ? "#0ea5e9" : "#000",
                    shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                    shadowOpacity: isSelected ? 0.12 : 0.04,
                    shadowRadius: isSelected ? 16 : 6,
                    elevation: isSelected ? 4 : 2,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: isSelected
                        ? "rgba(14,165,233,0.1)"
                        : "#f0f9ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {role.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#0f172a",
                      }}
                    >
                      {role.label}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}
                    >
                      {role.desc}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? "#0ea5e9" : "#cbd5e1",
                      backgroundColor: isSelected ? "#0ea5e9" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "white",
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Email input */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#94a3b8",
              letterSpacing: 0.96,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Email Address
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(14,165,233,0.04)",
              borderWidth: emailError ? 2 : 1.5,
              borderColor: emailError ? "#ef4444" : "rgba(14,165,233,0.12)",
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Mail size={20} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: "#0f172a", padding: 0 }}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>
          {emailError && (
            <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
              {emailError}
            </Text>
          )}
        </View>

        {/* Password input */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#94a3b8",
              letterSpacing: 0.96,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(14,165,233,0.04)",
              borderWidth: passwordError ? 2 : 1.5,
              borderColor: passwordError ? "#ef4444" : "rgba(14,165,233,0.12)",
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <Lock size={20} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: "#0f172a", padding: 0 }}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={20} color="#94a3b8" />
              ) : (
                <Eye size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>
          {passwordError && (
            <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
              {passwordError}
            </Text>
          )}
        </View>

        {/* Remember me & Forgot password */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                backgroundColor: rememberMe ? "#0ea5e9" : "#e2e8f0",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: rememberMe ? 0 : 2,
                borderColor: "#cbd5e1",
              }}
            >
              {rememberMe && (
                <Svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <Path
                    d="M1 4L4 7L9 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "500" }}>
              Remember me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowForgotPassword(true)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 13, color: "#22d3ee", fontWeight: "600" }}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign in button */}
        <TouchableOpacity
          style={{
            width: "100%",
            paddingVertical: 16,
            backgroundColor: isLoading ? "#94a3b8" : "#0284c7",
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: "#0ea5e9",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 6,
          }}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                Sign In as {roles.find((r) => r.key === selectedRole)?.label}
              </Text>
              <ChevronRight size={18} color="white" />
            </>
          )}
        </TouchableOpacity>

        {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && (
          <Text
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 12,
              marginTop: 12,
            }}
          >
            {MAX_LOGIN_ATTEMPTS - loginAttempts} attempts remaining
          </Text>
        )}
      </KeyboardAwareScrollView>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              Reset Password
            </Text>
            <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(14,165,233,0.04)",
                borderWidth: 1.5,
                borderColor: "rgba(14,165,233,0.12)",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: 16,
              }}
            >
              <Mail size={20} color="#94a3b8" />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: "#0f172a",
                  padding: 0,
                }}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isResettingPassword}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#e2e8f0",
                  alignItems: "center",
                }}
                onPress={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                disabled={isResettingPassword}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#0284c7",
                  alignItems: "center",
                }}
                onPress={handleForgotPassword}
                disabled={isResettingPassword}
                activeOpacity={0.7}
              >
                {isResettingPassword ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default StaffLoginScreen;
