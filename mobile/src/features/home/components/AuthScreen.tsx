import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { ApiError } from "../../../api/client";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../theme/theme";
import { Screen } from "../../../ui/Screen";

type AuthMode = "signin" | "signup";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const canSubmit = useMemo(() => {
    const base = form.email.trim() && form.password.length >= 8;
    if (!isSignup) return Boolean(base);

    return Boolean(
      base &&
        form.firstName.trim() &&
        form.lastName.trim() &&
        form.confirmPassword.length >= 8 &&
        form.password === form.confirmPassword
    );
  }, [form, isSignup]);

  const updateField = (field: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      if (isSignup) {
        await signup({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: "patient",
        });
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
      }
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <View style={styles.brandBar}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>P</Text>
              </View>
              <Text variant="titleMedium" style={styles.brandName}>
                Prescribe
              </Text>
            </View>

            <View style={styles.header}>
              <Text variant="headlineMedium" style={styles.title}>
                {isSignup ? "Create account" : "Welcome back"}
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                {isSignup
                  ? "Start with a patient account. You can add care details later."
                  : "Sign in to continue your care workspace."}
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              <AuthModeButton
                active={!isSignup}
                label="Sign in"
                onPress={() => {
                  setMode("signin");
                  setError(null);
                }}
              />
              <AuthModeButton
                active={isSignup}
                label="Create account"
                onPress={() => {
                  setMode("signup");
                  setError(null);
                }}
              />
            </View>

            <View style={styles.form}>
              {isSignup ? (
                <View style={styles.nameRow}>
                  <TextInput
                    activeOutlineColor={theme.colors.primary}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    contentStyle={styles.inputContent}
                    label="First name"
                    mode="outlined"
                    onChangeText={updateField("firstName")}
                    outlineColor={theme.colors.outline}
                    outlineStyle={styles.inputOutline}
                    style={styles.nameInput}
                    value={form.firstName}
                  />
                  <TextInput
                    activeOutlineColor={theme.colors.primary}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    contentStyle={styles.inputContent}
                    label="Last name"
                    mode="outlined"
                    onChangeText={updateField("lastName")}
                    outlineColor={theme.colors.outline}
                    outlineStyle={styles.inputOutline}
                    style={styles.nameInput}
                    value={form.lastName}
                  />
                </View>
              ) : null}

              <TextInput
                activeOutlineColor={theme.colors.primary}
                autoCapitalize="none"
                autoComplete="email"
                contentStyle={styles.inputContent}
                keyboardType="email-address"
                label="Email"
                mode="outlined"
                onChangeText={updateField("email")}
                outlineColor={theme.colors.outline}
                outlineStyle={styles.inputOutline}
                style={styles.input}
                textContentType="emailAddress"
                value={form.email}
              />

              <TextInput
                activeOutlineColor={theme.colors.primary}
                autoComplete={isSignup ? "new-password" : "password"}
                contentStyle={styles.inputContent}
                label="Password"
                mode="outlined"
                onChangeText={updateField("password")}
                outlineColor={theme.colors.outline}
                outlineStyle={styles.inputOutline}
                secureTextEntry
                style={styles.input}
                textContentType={isSignup ? "newPassword" : "password"}
                value={form.password}
              />

              {isSignup ? (
                <HelperText padding="none" style={styles.helperText} type="info">
                  Use at least 8 characters with a letter and number.
                </HelperText>
              ) : null}

              {isSignup ? (
                <TextInput
                  activeOutlineColor={theme.colors.primary}
                  autoComplete="new-password"
                  contentStyle={styles.inputContent}
                  label="Confirm password"
                  mode="outlined"
                  onChangeText={updateField("confirmPassword")}
                  outlineColor={theme.colors.outline}
                  outlineStyle={styles.inputOutline}
                  secureTextEntry
                  style={styles.input}
                  textContentType="newPassword"
                  value={form.confirmPassword}
                />
              ) : null}

              {isSignup && form.confirmPassword ? (
                <HelperText
                  padding="none"
                  style={styles.helperText}
                  type={form.password === form.confirmPassword ? "info" : "error"}
                >
                  {form.password === form.confirmPassword
                    ? "Passwords match"
                    : "Passwords must match"}
                </HelperText>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text variant="bodySmall" style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                contentStyle={styles.submitContent}
                disabled={!canSubmit || isSubmitting}
                loading={isSubmitting}
                mode="contained"
                onPress={submit}
                style={styles.submitButton}
              >
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type AuthModeButtonProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function AuthModeButton({ active, label, onPress }: AuthModeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && styles.segmentButtonPressed,
      ]}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getAuthError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  panel: {
    maxWidth: 430,
    width: "100%",
  },
  brandBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: 36,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: theme.colors.onSurface,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandMarkText: {
    color: theme.colors.surface,
    fontSize: 17,
    fontWeight: "700",
  },
  brandName: {
    color: theme.colors.onSurface,
    fontWeight: "700",
  },
  header: {
    gap: 8,
    marginBottom: 28,
  },
  title: {
    color: theme.colors.onSurface,
    fontWeight: "800",
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    lineHeight: 23,
  },
  segmentedControl: {
    backgroundColor: theme.colors.surfaceVariant,
    borderColor: theme.colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    padding: 3,
  },
  segmentButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderWidth: 1,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outline,
  },
  segmentButtonPressed: {
    opacity: 0.78,
  },
  segmentLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentLabelActive: {
    color: theme.colors.onSurface,
  },
  form: {
    gap: 13,
    marginTop: 24,
  },
  nameRow: {
    flexDirection: "column",
    gap: 13,
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  inputContent: {
    fontSize: 15,
    minHeight: 52,
  },
  inputOutline: {
    borderColor: theme.colors.outline,
    borderRadius: 14,
  },
  helperText: {
    color: theme.colors.onSurfaceVariant,
    marginTop: -6,
  },
  errorBox: {
    backgroundColor: theme.colors.errorContainer,
    borderColor: "rgba(220, 38, 38, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: theme.colors.onErrorContainer,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 14,
    marginTop: 4,
  },
  submitContent: {
    minHeight: 52,
  },
});
