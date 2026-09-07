// app/reset-password.tsx
//
// Handles the deep link Supabase sends in the password-reset email:
//   smartqs-staff://reset-password?code=...              (PKCE flow)
//   smartqs-staff://reset-password#access_token=...&...   (implicit flow)
//
// Supabase's own /auth/v1/verify endpoint already consumes the one-time
// recovery token from the email and redirects here with either a `code`
// to exchange, or an access/refresh token pair directly in the URL —
// this screen's only job is to turn that into a live session, then let
// the user set a new password.
//
// ⚠️ ADJUST THIS IMPORT: point it at wherever your Supabase client is
// created (e.g. `createClient()` call). If that client only lives inside
// AuthService, either export it from there or add the two calls below
// (`setSession` / `exchangeCodeForSession` / `updateUser`) as new
// AuthService methods and call those instead.
import { supabase } from "@/src/shared/config/supabase";

import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Check, Eye, EyeOff, Lock, ShieldCheck, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const MIN_PASSWORD_LENGTH = 8;

type ScreenState = "verifying" | "ready" | "error" | "success";

// Pulls params out of a URL whether they're in the query string (?a=b)
// or the fragment (#a=b) — Supabase can send either depending on the
// auth flow type (PKCE vs implicit), and RN's URL parsing doesn't
// handle fragments the way a browser does, so we do it by hand.
function extractUrlParams(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  const [, ...rest] = url.split(/[?#]/);
  rest.forEach((segment) => {
    segment.split("&").forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key) {
        try {
          result[decodeURIComponent(key)] = decodeURIComponent(value || "");
        } catch {
          result[key] = value || "";
        }
      }
    });
  });
  return result;
}

export default function ResetPasswordScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("verifying");
  const [errorMessage, setErrorMessage] = useState(
    "This reset link is invalid or has expired.",
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  // Reactively gives us the URL that launched (or re-focused) the app,
  // covering both cold-start and already-running cases.
  const incomingUrl = Linking.useLinkingURL();

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e?.endCoordinates?.height ?? 0),
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    establishSession();
    // Fallback: some Supabase client configs emit this event once the
    // session from the recovery link is picked up internally.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setScreenState("ready");
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingUrl]);

  const establishSession = async () => {
    try {
      // Already signed in via a valid recovery session from a previous
      // render of this effect (e.g. the auth-state-change listener beat us).
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        setScreenState("ready");
        return;
      }

      const url = incomingUrl ?? (await Linking.getInitialURL());
      if (!url) {
        setScreenState("error");
        return;
      }

      const params = extractUrlParams(url);

      if (params.error || params.error_description) {
        setErrorMessage(
          params.error_description?.replace(/\+/g, " ") ||
            "This reset link is invalid or has expired.",
        );
        setScreenState("error");
        return;
      }

      if (params.access_token && params.refresh_token) {
        // Implicit flow
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
        setScreenState("ready");
        return;
      }

      if (params.code) {
        // PKCE flow
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (error) throw error;
        setScreenState("ready");
        return;
      }

      // Nothing usable in the URL — link was likely already used, or
      // opened outside the flow that generated it.
      setScreenState("error");
    } catch (err: any) {
      console.error("Reset link verification error:", err);
      setErrorMessage(
        err?.message || "This reset link is invalid or has expired.",
      );
      setScreenState("error");
    }
  };

  const scrollFieldIntoView = (inputRef: React.RefObject<TextInput | null>) => {
    setTimeout(
      () => {
        if (!inputRef.current) return;
        inputRef.current.measureInWindow((x, y, width, height) => {
          const screenHeight = Dimensions.get("window").height;
          const kbHeight =
            keyboardHeight || (Platform.OS === "ios" ? 300 : 250);
          const visibleBottom = screenHeight - kbHeight - 24;
          const inputBottom = y + height;
          if (inputBottom > visibleBottom) {
            const delta = inputBottom - visibleBottom;
            scrollRef.current?.scrollTo({
              y: Math.max(scrollOffsetY.current + delta, 0),
              animated: true,
            });
          }
        });
      },
      Platform.OS === "ios" ? 260 : 120,
    );
  };

  const validate = () => {
    let valid = true;
    setPasswordError("");
    setConfirmError("");

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      valid = false;
    }
    return valid;
  };

  const handleSetNewPassword = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Recovery sessions are meant to be short-lived — sign out and
      // require a normal sign-in with the new password.
      await supabase.auth.signOut();

      setScreenState("success");
      Toast.show({
        type: "success",
        text1: "Password Updated",
        text2: "You can now sign in with your new password.",
      });
    } catch (err: any) {
      console.error("Update password error:", err);
      Toast.show({
        type: "error",
        text1: "Couldn't Update Password",
        text2: err?.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => router.replace("/staff/login" as any);

  // ─── Verifying ────────────────────────────────────────────────
  if (screenState === "verifying") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fbff" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fbff" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ marginTop: 16, color: "#64748b", fontSize: 14 }}>
            Verifying your reset link...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (screenState === "error") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fbff" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fbff" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(239,68,68,0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <X size={28} color="#ef4444" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Link Invalid or Expired
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 20,
            }}
          >
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 14,
              paddingHorizontal: 28,
              backgroundColor: "#0284c7",
              borderRadius: 14,
            }}
            onPress={goToLogin}
            activeOpacity={0.8}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Success ──────────────────────────────────────────────────
  if (screenState === "success") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fbff" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fbff" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(34,197,94,0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Check size={28} color="#22c55e" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Password Updated
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 20,
            }}
          >
            Your password has been changed successfully. Sign in with your new
            password to continue.
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 14,
              paddingHorizontal: 28,
              backgroundColor: "#0284c7",
              borderRadius: 14,
            }}
            onPress={goToLogin}
            activeOpacity={0.8}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Go to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Ready: set a new password ──────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fbff" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1628" />

      <LinearGradient
        colors={["#0a1628", "#0c4a6e", "#0369a1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 28 }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: "rgba(14,165,233,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={24} color="#22d3ee" />
        </View>
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "800",
            letterSpacing: -0.6,
          }}
        >
          Set a New Password
        </Text>
        <Text
          style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 6 }}
        >
          Choose a strong password you haven't used before.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
          }}
        >
          {/* New password */}
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
              New Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(14,165,233,0.04)",
                borderWidth: passwordError ? 2 : 1.5,
                borderColor: passwordError
                  ? "#ef4444"
                  : "rgba(14,165,233,0.12)",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Lock size={20} color="#94a3b8" />
              <TextInput
                ref={passwordInputRef}
                style={{ flex: 1, fontSize: 14, color: "#0f172a", padding: 0 }}
                placeholder="Enter new password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                onFocus={() => scrollFieldIntoView(passwordInputRef)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmInputRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#94a3b8" />
                ) : (
                  <Eye size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
            {!!passwordError && (
              <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                {passwordError}
              </Text>
            )}
          </View>

          {/* Confirm password */}
          <View style={{ marginBottom: 24 }}>
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
              Confirm Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(14,165,233,0.04)",
                borderWidth: confirmError ? 2 : 1.5,
                borderColor: confirmError ? "#ef4444" : "rgba(14,165,233,0.12)",
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Lock size={20} color="#94a3b8" />
              <TextInput
                ref={confirmInputRef}
                style={{ flex: 1, fontSize: 14, color: "#0f172a", padding: 0 }}
                placeholder="Re-enter new password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError("");
                }}
                onFocus={() => scrollFieldIntoView(confirmInputRef)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleSetNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#94a3b8" />
                ) : (
                  <Eye size={20} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
            {!!confirmError && (
              <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                {confirmError}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={{
              width: "100%",
              paddingVertical: 16,
              backgroundColor: isSubmitting ? "#94a3b8" : "#0284c7",
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0ea5e9",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 6,
            }}
            onPress={handleSetNewPassword}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
