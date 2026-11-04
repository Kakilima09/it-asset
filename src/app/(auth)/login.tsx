import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors, radius, spacing } from "@/lib/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Gagal masuk. Silakan coba lagi.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons
                name="hardware-chip-outline"
                size={30}
                color="#ffffff"
              />
            </View>
            <View>
              <AppText variant="heading">IT Asset PM</AppText>
              <AppText variant="caption">
                Manajemen aset & pemeliharaan IT
              </AppText>
            </View>
          </View>

          <View style={styles.header}>
            <AppText variant="title">Selamat datang kembali</AppText>
            <AppText variant="caption" style={styles.headerCaption}>
              Masuk dengan akun perusahaan Anda untuk melanjutkan.
            </AppText>
          </View>

          <Card style={styles.card}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="nama@perusahaan.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!submitting}
            />
            <Input
              label="Kata sandi"
              value={password}
              onChangeText={setPassword}
              placeholder="Masukkan kata sandi"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.danger}
                />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : null}

            <Button title="Masuk" onPress={handleSubmit} loading={submitting} />
          </Card>

          <View style={styles.footer}>
            <AppText variant="caption" style={styles.footerText}>
              2026 @ IT Indovisual
            </AppText>
            {/* {__DEV__ ? (
              // <AppText variant="caption" style={styles.footerText}>
              //   API: {API_URL}
              //   {IS_USING_DEFAULT_API_URL ? ' (default emulator)' : ''}
              // </AppText>
            ) : null} */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.xl,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { gap: spacing.xs },
  headerCaption: { maxWidth: 320 },
  card: { gap: spacing.lg },
  passwordToggle: { padding: spacing.xs },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  footer: { gap: spacing.xs, alignItems: "center" },
  footerText: { textAlign: "center" },
});
