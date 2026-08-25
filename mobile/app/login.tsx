import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("E-mail ou senha inválidos.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>VGRM Trade Marketing</Text>
      <Text style={styles.subtitle}>Entre com sua conta</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading || !email || !password}
      >
        <Text style={styles.buttonText}>{loading ? "Entrando..." : "Entrar"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "600", textAlign: "center" },
  subtitle: { color: "#94a3b8", textAlign: "center", marginTop: 4, marginBottom: 32 },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  error: { color: "#f87171", marginBottom: 12, textAlign: "center" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
