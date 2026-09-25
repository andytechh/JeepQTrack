// app/reset-password.tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "../src/shared/config/supabase";
import { AuthService } from "../src/shared/services/AuthService";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (params.error) {
        Toast.show({
          type: "error",
          text1: "Link expired",
          text2: params.error_description || "Please request a new reset link.",
        });
        router.replace("/staff/login" as any);
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (error) {
          Toast.show({
            type: "error",
            text1: "Invalid or expired link",
            text2: error.message,
          });
          router.replace("/staff/login" as any);
          return;
        }
        setSessionReady(true);
      } else {
        Toast.show({
          type: "error",
          text1: "Invalid link",
          text2: "Please request a new password reset email.",
        });
        router.replace("/staff/login" as any);
      }
    })();
  }, [params.code, params.error]);

  const handleSubmit = async () => {
    if (password.length < 8) {
      Toast.show({
        type: "error",
        text1: "Password too short",
        text2: "Must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      Toast.show({ type: "error", text1: "Passwords don't match" });
      return;
    }

    setLoading(true);
    try {
      await AuthService.updatePassword(password);
      Toast.show({
        type: "success",
        text1: "Password updated",
        text2: "Please sign in with your new password.",
      });
      // Sign out so the user re-authenticates cleanly with the new password
      await AuthService.signOut();
      router.replace("/staff/login" as any);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't update password",
        text2: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#EAF7FF",
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>
          Verifying your reset link...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#EAF7FF",
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
        Set a new password
      </Text>
      <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        Choose a password with at least 8 characters.
      </Text>

      <TextInput
        secureTextEntry
        placeholder="New password"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        style={{
          backgroundColor: "white",
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          fontSize: 14,
          color: "#0f172a",
        }}
      />
      <TextInput
        secureTextEntry
        placeholder="Confirm new password"
        placeholderTextColor="#94a3b8"
        value={confirm}
        onChangeText={setConfirm}
        style={{
          backgroundColor: "white",
          borderRadius: 14,
          padding: 14,
          marginBottom: 24,
          fontSize: 14,
          color: "#0f172a",
        }}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#94A3B8" : "#0EA5E9",
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: "center",
        }}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
            Update Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
