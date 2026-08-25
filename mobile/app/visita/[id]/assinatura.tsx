import { useRef, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system";
import SignatureScreen, { type SignatureViewRef } from "react-native-signature-canvas";
import { uploadVisitSignature } from "@/lib/media";

export default function AssinaturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ref = useRef<SignatureViewRef>(null);

  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleOK(dataUrl: string) {
    if (!signerName.trim()) {
      Alert.alert("Informe o nome", "Digite o nome do responsável pela loja.");
      return;
    }

    try {
      setSaving(true);
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const tmpPath = `${FileSystem.cacheDirectory}assinatura-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(tmpPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await uploadVisitSignature(id, tmpPath, signerName.trim(), signerDocument.trim() || null);

      router.back();
    } catch (err: any) {
      Alert.alert("Erro ao salvar assinatura", err.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Assinatura" }} />
      <Text style={styles.label}>Nome do responsável pela loja</Text>
      <TextInput
        style={styles.input}
        value={signerName}
        onChangeText={setSignerName}
        placeholder="Ex.: Maria da Silva"
      />
      <Text style={styles.label}>Documento (opcional)</Text>
      <TextInput
        style={styles.input}
        value={signerDocument}
        onChangeText={setSignerDocument}
        placeholder="CPF ou crachá"
      />

      <Text style={styles.hint}>Assine no quadro abaixo</Text>
      <View style={styles.padWrapper}>
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onEmpty={() => Alert.alert("Assinatura vazia", "Desenhe a assinatura antes de confirmar.")}
          descriptionText=""
          webStyle="body,html{margin:0;padding:0;} .m-signature-pad--footer{display:none;}"
        />
      </View>

      <View style={styles.actions}>
        <Text style={styles.actionBtn} onPress={() => ref.current?.clearSignature()}>
          Limpar
        </Text>
        <Text
          style={[styles.actionBtn, styles.confirm]}
          onPress={() => !saving && ref.current?.readSignature()}
        >
          {saving ? "Salvando..." : "Confirmar"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  label: { fontSize: 12, color: "#475569", marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hint: { marginTop: 16, marginBottom: 6, fontSize: 12, color: "#475569" },
  padWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  actionBtn: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    fontWeight: "600",
    marginRight: 8,
    overflow: "hidden",
  },
  confirm: { backgroundColor: "#2563eb", color: "#fff", marginRight: 0 },
});
