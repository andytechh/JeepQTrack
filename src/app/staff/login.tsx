import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { AuthService } from "../../src/shared/services/AuthService";
import { useAuthStore } from "../../src/shared/store/authStore";

import {
  colors,
  radius,
  shadows,
  typography,
} from "@/src/shared/constants/theme";

import ClayAlert from "../../src/shared/components/clay/ClayAlert";
import ClayButton from "../../src/shared/components/clay/ClayButton";
import { ClayCard } from "../../src/shared/components/clay/ClayCard";
import OceanBackground from "../../src/shared/components/clay/OceanBackground";

// ─────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  REMEMBER_EMAIL: "remember_email",
  REMEMBER_PASSWORD: "remember_password",
  REMEMBER_ME: "remember_me",
};

// ─────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_EMAIL_LENGTH = 254;

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

class SecurityValidator {
  static validateEmail(email: string): {
    isValid: boolean;
    error?: string;
  } {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return {
        isValid: false,
        error: "Email is required.",
      };
    }

    if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      return {
        isValid: false,
        error: `Email must be less than ${MAX_EMAIL_LENGTH} characters.`,
      };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        error: "Please enter a valid email address.",
      };
    }

    return { isValid: true };
  }

  static validatePassword(password: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!password) {
      return {
        isValid: false,
        error: "Password is required.",
      };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        isValid: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      };
    }

    return { isValid: true };
  }

  static validateRole(
    role: string,
    allowedRoles: string[],
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (!role) {
      return {
        isValid: false,
        error: "Please select your staff role.",
      };
    }

    if (!allowedRoles.includes(role)) {
      return {
        isValid: false,
        error: "Invalid role selected.",
      };
    }

    return { isValid: true };
  }

  static sanitizeInput(input: string): string {
    return input.trim();
  }
}

// ─────────────────────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────────────────────

class RateLimiter {
  private attempts: Map<
    string,
    {
      count: number;
      timestamp: number;
    }
  > = new Map();

  check(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockoutTime?: number;
  } {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (!record) {
      return {
        allowed: true,
        remainingAttempts: MAX_LOGIN_ATTEMPTS,
      };
    }

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      const timeElapsed = now - record.timestamp;

      if (timeElapsed < LOCKOUT_DURATION) {
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutTime: Math.ceil((LOCKOUT_DURATION - timeElapsed) / 1000 / 60),
        };
      }

      this.attempts.delete(identifier);

      return {
        allowed: true,
        remainingAttempts: MAX_LOGIN_ATTEMPTS,
      };
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
      this.attempts.set(identifier, {
        count: 1,
        timestamp: now,
      });

      return;
    }

    if (now - record.timestamp > 3600000) {
      this.attempts.set(identifier, {
        count: 1,
        timestamp: now,
      });

      return;
    }

    record.count += 1;

    this.attempts.set(identifier, record);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// ─────────────────────────────────────────────────────────────
// ROLE ICONS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────

interface Props {
  selectedRole?: string;
  onSelectRole?: (r: string) => void;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

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
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ───────────────────────────────────────────────────────────
  // CLAY ALERT
  // ───────────────────────────────────────────────────────────

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "error" | "success" | "warning" | "info";
    title: string;
    message: string;
  }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const rateLimiter = useRef(new RateLimiter());

  const showAlert = (
    type: "error" | "success" | "warning" | "info",
    title: string,
    message: string,
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
    });
  };

  const closeAlert = () => {
    setAlert((current) => ({
      ...current,
      visible: false,
    }));
  };

  // ───────────────────────────────────────────────────────────
  // LOAD CREDENTIALS
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      setIsLoadingCredentials(true);

      const rememberMeValue = await SecureStore.getItemAsync(
        STORAGE_KEYS.REMEMBER_ME,
      );

      const isRemembered = rememberMeValue === "true";

      if (isRemembered) {
        const savedEmail = await SecureStore.getItemAsync(
          STORAGE_KEYS.REMEMBER_EMAIL,
        );

        const savedPassword = await SecureStore.getItemAsync(
          STORAGE_KEYS.REMEMBER_PASSWORD,
        );

        if (savedEmail) {
          setEmail(savedEmail);
        }

        if (savedPassword) {
          setPassword(savedPassword);
        }

        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // SAVE CREDENTIALS
  // ───────────────────────────────────────────────────────────

  const saveCredentials = async (email: string, password: string) => {
    try {
      if (rememberMe) {
        await SecureStore.setItemAsync(STORAGE_KEYS.REMEMBER_EMAIL, email);

        await SecureStore.setItemAsync(
          STORAGE_KEYS.REMEMBER_PASSWORD,
          password,
        );

        await SecureStore.setItemAsync(STORAGE_KEYS.REMEMBER_ME, "true");
      } else {
        await clearCredentials();
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  // ───────────────────────────────────────────────────────────
  // CLEAR CREDENTIALS
  // ───────────────────────────────────────────────────────────

  const clearCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_EMAIL);

      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_PASSWORD);

      await SecureStore.deleteItemAsync(STORAGE_KEYS.REMEMBER_ME);
    } catch (error) {
      console.error("Error clearing credentials:", error);
    }
  };

  // ───────────────────────────────────────────────────────────
  // ROLE
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    setSelectedRole(initialSelectedRole);
  }, [initialSelectedRole]);

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    onSelectRole?.(roleKey);
  };

  // ───────────────────────────────────────────────────────────
  // LOGIN
  // ───────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    if (isLockedOut) {
      showAlert(
        "warning",
        "Account Temporarily Locked",
        `Too many failed attempts. Please try again in approximately ${lockoutMinutes} minutes.`,
      );

      return;
    }

    const sanitizedEmail = SecurityValidator.sanitizeInput(email);

    const sanitizedPassword = SecurityValidator.sanitizeInput(password);

    // EMAIL
    const emailValidation = SecurityValidator.validateEmail(sanitizedEmail);

    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);

      showAlert("error", "Invalid Email", emailValidation.error!);

      return;
    }

    // PASSWORD
    const passwordValidation =
      SecurityValidator.validatePassword(sanitizedPassword);

    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error!);

      showAlert("error", "Invalid Password", passwordValidation.error!);

      return;
    }

    // ROLE
    const roleValidation = SecurityValidator.validateRole(
      selectedRole,
      roles.map((role) => role.key),
    );

    if (!roleValidation.isValid) {
      showAlert("error", "Role Selection Required", roleValidation.error!);

      return;
    }

    // RATE LIMIT
    const rateCheck = rateLimiter.current.check(sanitizedEmail);

    if (!rateCheck.allowed) {
      setIsLockedOut(true);

      setLockoutMinutes(rateCheck.lockoutTime || 15);

      showAlert(
        "warning",
        "Too Many Attempts",
        `Please wait ${rateCheck.lockoutTime} minutes before trying again.`,
      );

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

      // ACCOUNT INACTIVE
      if (!user.isActive) {
        rateLimiter.current.recordAttempt(sanitizedEmail);

        showAlert(
          "warning",
          "Account Inactive",
          "Your account has been deactivated. Please contact the system administrator for assistance.",
        );

        return;
      }

      // ROLE MISMATCH
      if (selectedRole !== user.role) {
        rateLimiter.current.recordAttempt(sanitizedEmail);

        const roleName =
          roles.find((role) => role.key === user.role)?.label || user.role;

        showAlert(
          "error",
          "Role Mismatch",
          `This account is registered as ${roleName}. Please select the correct role and try again.`,
        );

        return;
      }

      // SUCCESS
      rateLimiter.current.reset(sanitizedEmail);

      setLoginAttempts(0);
      setIsLockedOut(false);

      await saveCredentials(sanitizedEmail, sanitizedPassword);

      setUser(user);

      showAlert(
        "success",
        "Welcome Back!",
        `Signed in successfully as ${user.displayName || user.role}.`,
      );

      // Keep original delayed navigation
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
      }, 800);
    } catch (error: any) {
      console.error("Login error:", error);

      rateLimiter.current.recordAttempt(sanitizedEmail);

      const newAttempts = loginAttempts + 1;

      setLoginAttempts(newAttempts);

      // LOCKOUT
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setIsLockedOut(true);
        setLockoutMinutes(15);

        showAlert(
          "warning",
          "Account Temporarily Locked",
          "Too many failed login attempts. Please wait 15 minutes before trying again.",
        );

        return;
      }

      let errorMessage = "Invalid email or password.";

      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = `Invalid email or password. ${remaining} attempt${
          remaining > 1 ? "s" : ""
        } remaining.`;
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address before logging in.";
      } else if (error.message?.toLowerCase().includes("network")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      }

      showAlert("error", "Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ───────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    const sanitizedEmail = SecurityValidator.sanitizeInput(resetEmail);

    const emailValidation = SecurityValidator.validateEmail(sanitizedEmail);

    if (!emailValidation.isValid) {
      showAlert("error", "Invalid Email", emailValidation.error!);

      return;
    }

    setIsResettingPassword(true);

    try {
      const rateCheck = rateLimiter.current.check(`reset_${sanitizedEmail}`);

      if (!rateCheck.allowed) {
        showAlert(
          "warning",
          "Too Many Requests",
          `Please wait ${rateCheck.lockoutTime} minutes before requesting another password reset.`,
        );

        return;
      }

      await AuthService.resetPassword(sanitizedEmail);

      rateLimiter.current.reset(`reset_${sanitizedEmail}`);

      setShowForgotPassword(false);
      setResetEmail("");

      showAlert(
        "success",
        "Reset Email Sent",
        "A password reset link has been sent to your email address. For security, the link will expire in 1 hour.",
      );
    } catch (error: any) {
      console.error("Password reset error:", error);

      showAlert(
        "error",
        "Reset Failed",
        error.message ||
          "Failed to send the password reset email. Please try again.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────────────────────

  if (isLoadingCredentials) {
    return (
      <OceanBackground>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingClay}>
            <View style={styles.loadingIconClay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>

            <Text style={styles.loadingText}>Preparing Staff Portal...</Text>
          </View>
        </View>
      </OceanBackground>
    );
  }

  // ───────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────

  return (
    <OceanBackground intensity={0.25}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}
          >
            {/* ─────────────────────────────────────
                HEADER
            ───────────────────────────────────── */}

            <View style={styles.header}>
              {/* Clay portal badge */}
              <View style={styles.portalBadge}>
                <View style={styles.onlineDot} />

                <Text style={styles.portalBadgeText}>STAFF PORTAL</Text>
              </View>

              <Text style={styles.title}>SmartQueue</Text>

              <Text style={styles.subtitle}>Staff Access</Text>

              <Text style={styles.routeText}>Donsol–Daraga Terminal</Text>

              {/* Decorative clay bubbles */}
              <View pointerEvents="none" style={styles.headerBubbleOne} />

              <View pointerEvents="none" style={styles.headerBubbleTwo} />
            </View>

            {/* ─────────────────────────────────────
                LOGIN CARD
            ───────────────────────────────────── */}

            <ClayCard
              padding={20}
              radiusSize="xxl"
              shadow="default"
              style={styles.loginCard}
            >
              {/* ───────────────────────────────
                  ROLE
              ─────────────────────────────── */}

              <Text style={styles.sectionLabel}>SELECT YOUR ROLE</Text>

              <View style={styles.roleContainer}>
                {roles.map((role) => {
                  const selected = selectedRole === role.key;

                  return (
                    <Pressable
                      key={role.key}
                      onPress={() => handleRoleSelect(role.key)}
                      disabled={isLoading}
                      style={({ pressed }) => [
                        styles.roleCard,
                        selected && styles.roleCardSelected,
                        pressed && styles.roleCardPressed,
                      ]}
                    >
                      {/* Top clay highlight */}
                      <View pointerEvents="none" style={styles.roleHighlight} />

                      {/* Icon */}
                      <View
                        style={[
                          styles.roleIcon,
                          selected && styles.roleIconSelected,
                        ]}
                      >
                        {role.icon}
                      </View>

                      {/* Text */}
                      <View style={styles.roleContent}>
                        <Text style={styles.roleTitle}>{role.label}</Text>

                        <Text style={styles.roleDescription}>{role.desc}</Text>
                      </View>

                      {/* Radio */}
                      <View
                        style={[
                          styles.radioOuter,
                          selected && styles.radioOuterSelected,
                        ]}
                      >
                        {selected && <View style={styles.radioInner} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* ───────────────────────────────
                  EMAIL
              ─────────────────────────────── */}

              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>EMAIL ADDRESS</Text>

                <View
                  style={[
                    styles.inputClay,
                    emailError && styles.inputClayError,
                  ]}
                >
                  {/* Highlight */}
                  <View pointerEvents="none" style={styles.inputHighlight} />

                  <View style={styles.inputIcon}>
                    <Mail
                      size={19}
                      color={emailError ? "#ef4444" : colors.primary}
                    />
                  </View>

                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);

                      if (emailError) {
                        setEmailError("");
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                  />
                </View>

                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : null}
              </View>

              {/* ───────────────────────────────
                  PASSWORD
              ─────────────────────────────── */}

              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>PASSWORD</Text>

                <View
                  style={[
                    styles.inputClay,
                    passwordError && styles.inputClayError,
                  ]}
                >
                  {/* Highlight */}
                  <View pointerEvents="none" style={styles.inputHighlight} />

                  <View style={styles.inputIcon}>
                    <Lock
                      size={19}
                      color={passwordError ? "#ef4444" : colors.primary}
                    />
                  </View>

                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);

                      if (passwordError) {
                        setPasswordError("");
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />

                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </Pressable>
                </View>

                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}
              </View>

              {/* ───────────────────────────────
                  REMEMBER / FORGOT
              ─────────────────────────────── */}

              <View style={styles.optionsRow}>
                <Pressable
                  onPress={() => setRememberMe((current) => !current)}
                  disabled={isLoading}
                  style={styles.rememberButton}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxSelected,
                    ]}
                  >
                    {rememberMe && (
                      <Svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <Path
                          d="M1 4.5L4 7.5L10 1"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    )}
                  </View>

                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowForgotPassword(true)}
                  disabled={isLoading}
                  style={styles.forgotLinkClay}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* ───────────────────────────────
                  LOGIN BUTTON
              ─────────────────────────────── */}

              <ClayButton
                title={`Sign In as ${
                  roles.find((role) => role.key === selectedRole)?.label
                }`}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                size="large"
                variant="primary"
                style={styles.loginButton}
              />

              {/* Attempts */}
              {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && (
                <View style={styles.attemptBadge}>
                  <View style={styles.attemptDot} />

                  <Text style={styles.attemptText}>
                    {MAX_LOGIN_ATTEMPTS - loginAttempts} login attempts
                    remaining
                  </Text>
                </View>
              )}
            </ClayCard>

            {/* ─────────────────────────────────────
                FOOTER
            ───────────────────────────────────── */}

            <View style={styles.footer}>
              <Text style={styles.footerText}>SmartQueue</Text>

              <Text style={styles.footerSubtext}>
                Donsol–Daraga Smart Terminal
              </Text>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

        {/* ─────────────────────────────────────────
            CLAY ALERT
        ───────────────────────────────────────── */}

        <ClayAlert
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={closeAlert}
        />

        {/* ─────────────────────────────────────────
            FORGOT PASSWORD MODAL
        ───────────────────────────────────────── */}

        {showForgotPassword && (
          <View style={styles.modalOverlay}>
            <View style={styles.forgotCard}>
              {/* Clay highlight */}
              <View pointerEvents="none" style={styles.forgotHighlight} />

              {/* Header */}
              <View style={styles.forgotHeader}>
                <View style={styles.forgotIcon}>
                  <Mail size={25} color={colors.primary} />
                </View>

                <Pressable
                  onPress={() => {
                    if (!isResettingPassword) {
                      setShowForgotPassword(false);
                      setResetEmail("");
                    }
                  }}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.forgotTitle}>Reset Password</Text>

              <Text style={styles.forgotDescription}>
                Enter your staff email address and we'll send you a secure link
                to reset your password.
              </Text>

              {/* Email */}
              <View style={styles.inputClay}>
                <View pointerEvents="none" style={styles.inputHighlight} />

                <View style={styles.inputIcon}>
                  <Mail size={19} color={colors.primary} />
                </View>

                <TextInput
                  style={styles.textInput}
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

              {/* Actions */}
              <View style={styles.modalActions}>
                <ClayButton
                  title="Cancel"
                  onPress={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  variant="secondary"
                  size="medium"
                  disabled={isResettingPassword}
                  style={styles.modalButton}
                />

                <View style={styles.modalButtonGap} />

                <ClayButton
                  title="Send Reset Link"
                  onPress={handleForgotPassword}
                  loading={isResettingPassword}
                  disabled={isResettingPassword}
                  variant="primary"
                  size="medium"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </OceanBackground>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },

  // ─────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingClay: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 220,
    paddingHorizontal: 30,
    paddingVertical: 28,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    ...shadows.clay,
  },

  loadingIconClay: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#eaf7fe",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    ...shadows.claySmall,
  },

  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.weight.medium,
  },

  // ─────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────

  header: {
    position: "relative",
    overflow: "hidden",
    minHeight: 190,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    marginBottom: -8,
  },

  portalBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
    borderRadius: radius.pill,
    backgroundColor: "rgba(14,165,233,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",

    // Clay depth
    ...shadows.claySmall,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },

  portalBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -1.2,
  },

  subtitle: {
    color: colors.primary,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  routeText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 7,
    fontWeight: "500",
  },

  headerBubbleOne: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -35,
    top: -30,
    backgroundColor: "rgba(14,165,233,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#0369a1",
    shadowOffset: {
      width: 6,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },

  headerBubbleTwo: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    right: 35,
    bottom: 8,
    backgroundColor: "rgba(34,211,238,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#0369a1",
    shadowOffset: {
      width: 5,
      height: 6,
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },

  // ─────────────────────────────────────────
  // LOGIN CARD
  // ─────────────────────────────────────────

  loginCard: {
    width: "100%",
  },

  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 9,
  },

  // ─────────────────────────────────────────
  // ROLES
  // ─────────────────────────────────────────

  roleContainer: {
    gap: 9,
    marginBottom: 20,
  },

  roleCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,

    backgroundColor: "#f8fbff",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  roleCardSelected: {
    backgroundColor: "#e9f7fe",
    borderColor: "rgba(14,165,233,0.45)",
    borderWidth: 1.5,

    // Stronger raised effect for selected role
    shadowColor: "#0284c7",
    shadowOffset: {
      width: 4,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },

  roleCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },

  roleHighlight: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  roleIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,

    backgroundColor: "#eaf7fe",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  roleIconSelected: {
    backgroundColor: "#dff4fd",

    shadowColor: "#0284c7",
    shadowOffset: {
      width: 3,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },

  roleContent: {
    flex: 1,
    marginLeft: 12,
  },

  roleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },

  roleDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  radioOuter: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,

    borderWidth: 2,
    borderColor: "#cbd5e1",

    backgroundColor: "#f1f5f9",

    ...shadows.claySmall,
  },

  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },

  // ─────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────

  inputSection: {
    marginBottom: 16,
  },

  inputClay: {
    position: "relative",
    overflow: "hidden",
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,

    borderRadius: radius.xl,

    backgroundColor: "#f4f9fd",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  inputClayError: {
    borderWidth: 1.5,
    borderColor: "#ef4444",
    backgroundColor: "#fff8f8",
  },

  inputHighlight: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 2,
  },

  inputIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,

    backgroundColor: "#e7f5fc",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",

    marginRight: 8,

    ...shadows.claySmall,
  },

  textInput: {
    flex: 1,
    minHeight: 45,
    padding: 0,

    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },

  eyeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,

    backgroundColor: "#edf5f9",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",

    ...shadows.claySmall,
  },

  fieldError: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
    marginLeft: 4,
  },

  // ─────────────────────────────────────────
  // OPTIONS
  // ─────────────────────────────────────────

  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  rememberButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  checkbox: {
    width: 21,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,

    backgroundColor: "#e2e8f0",

    borderWidth: 1.5,
    borderColor: "#cbd5e1",

    ...shadows.claySmall,
  },

  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,

    shadowColor: colors.primary,
    shadowOffset: {
      width: 2,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  rememberText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  forgotLinkClay: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.pill,

    backgroundColor: "rgba(14,165,233,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },

  forgotText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },

  // ─────────────────────────────────────────
  // LOGIN BUTTON
  // ─────────────────────────────────────────

  loginButton: {
    width: "100%",
  },

  // ─────────────────────────────────────────
  // ATTEMPTS
  // ─────────────────────────────────────────

  attemptBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,

    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 12,

    borderRadius: radius.pill,

    backgroundColor: "#f8fafc",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  attemptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },

  attemptText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },

  // ─────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────

  footer: {
    alignItems: "center",
    paddingTop: 18,
  },

  footerText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },

  footerSubtext: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  // ─────────────────────────────────────────
  // MODAL OVERLAY
  // ─────────────────────────────────────────

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    alignItems: "center",
    justifyContent: "center",

    padding: 20,

    backgroundColor: "rgba(15,23,42,0.48)",

    zIndex: 100,
  },

  // ─────────────────────────────────────────
  // FORGOT PASSWORD CLAY CARD
  // ─────────────────────────────────────────

  forgotCard: {
    width: "100%",
    maxWidth: 400,

    position: "relative",
    overflow: "hidden",

    padding: 22,

    borderRadius: radius.xxl,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.clay,
  },

  forgotHighlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 3,

    backgroundColor: "rgba(255,255,255,0.98)",

    borderRadius: 3,
  },

  forgotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  forgotIcon: {
    width: 52,
    height: 52,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 18,

    backgroundColor: "#e7f5fc",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  modalClose: {
    width: 36,
    height: 36,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 18,

    backgroundColor: "#f1f5f9",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",

    ...shadows.claySmall,
  },

  modalCloseText: {
    color: "#64748b",
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "400",
  },

  forgotTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 7,
  },

  forgotDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 18,
  },

  modalButton: {
    flex: 1,
  },

  modalButtonGap: {
    width: 10,
  },
});

export default StaffLoginScreen;
