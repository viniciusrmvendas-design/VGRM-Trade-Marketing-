import { useCallback, useState } from "react";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { PhotoKind, Store, Visit, VisitPhoto, VisitSignature } from "@vgrm/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCurrentCoords, LocationPermissionError } from "@/lib/location";
import { signedUrl, uploadVisitPhoto } from "@/lib/media";
import { StatusPill } from "@/components/status-pill";

type VisitFull = Visit & { store: Store };
type PhotoWithUrl = VisitPhoto & { url: string | null };

export default function VisitaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();

  const [visit, setVisit] = useState<VisitFull | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [signature, setSignature] = useState<VisitSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: v }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("visits").select("*, store:stores(*)").eq("id", id).single<VisitFull>(),
      supabase.from("visit_photos").select("*").eq("visit_id", id).returns<VisitPhoto[]>(),
      supabase
        .from("visit_signatures")
        .select("*")
        .eq("visit_id", id)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle<VisitSignature>(),
    ]);

    setVisit(v ?? null);
    setSignature(s ?? null);

    const withUrls = await Promise.all(
      (p ?? []).map(async (photo) => ({ ...photo, url: await signedUrl(photo.storage_path) }))
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCheckIn() {
    try {
      setBusy("checkin");
      const { lat, lng } = await getCurrentCoords();
      const { error } = await supabase.rpc("register_check_in", {
        p_visit_id: id,
        p_lat: lat,
        p_lng: lng,
      });
      if (error) throw error;
      await load();
    } catch (err: any) {
      const msg = err instanceof LocationPermissionError ? err.message : err.message ?? String(err);
      Alert.alert("Não foi possível fazer check-in", msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleCheckOut() {
    try {
      setBusy("checkout");
      const { lat, lng } = await getCurrentCoords();
      const { error } = await supabase.rpc("register_check_out", {
        p_visit_id: id,
        p_lat: lat,
        p_lng: lng,
      });
      if (error) throw error;
      await load();
      Alert.alert("Visita concluída", "Check-out registrado com sucesso.");
    } catch (err: any) {
      const msg = err instanceof LocationPermissionError ? err.message : err.message ?? String(err);
      Alert.alert("Não foi possível concluir a visita", msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleAddPhoto(kind: PhotoKind) {
    if (!profile) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Autorize o uso da câmera para tirar a foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;

    try {
      setBusy(`foto-${kind}`);
      await uploadVisitPhoto(id, kind, result.assets[0].uri, profile.id);
      await load();
    } catch (err: any) {
      Alert.alert("Erro ao enviar foto", err.message ?? String(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading || !visit) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  const before = photos.filter((p) => p.kind === "antes");
  const after = photos.filter((p) => p.kind === "depois");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${visit.store.lat},${visit.store.lng}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: visit.store.name }} />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.storeName}>{visit.store.name}</Text>
          <StatusPill status={visit.status} />
        </View>
        <Text style={styles.address}>{visit.store.address}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.link}>Abrir no mapa</Text>
        </TouchableOpacity>
      </View>

      {visit.status === "pendente" && (
        <TouchableOpacity
          style={[styles.primaryBtn, busy === "checkin" && styles.btnDisabled]}
          onPress={handleCheckIn}
          disabled={busy === "checkin"}
        >
          <Text style={styles.primaryBtnText}>
            {busy === "checkin" ? "Verificando localização..." : "Fazer check-in"}
          </Text>
        </TouchableOpacity>
      )}

      {visit.status !== "pendente" && (
        <>
          <PhotoSection
            title="Fotos - antes"
            photos={before}
            onAdd={() => handleAddPhoto("antes")}
            busy={busy === "foto-antes"}
            disabled={visit.status === "check_out"}
          />
          <PhotoSection
            title="Fotos - depois"
            photos={after}
            onAdd={() => handleAddPhoto("depois")}
            busy={busy === "foto-depois"}
            disabled={visit.status === "check_out"}
          />

          {visit.store.allows_order && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push(`/visita/${id}/pedido`)}
            >
              <Text style={styles.secondaryBtnText}>Lançar pedido</Text>
            </TouchableOpacity>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assinatura do responsável</Text>
            {signature ? (
              <Text style={styles.signatureInfo}>
                Coletada de {signature.signer_name} às{" "}
                {new Date(signature.signed_at).toLocaleTimeString("pt-BR")}
              </Text>
            ) : (
              <Text style={styles.signatureInfo}>Ainda não coletada.</Text>
            )}
            {visit.status === "check_in" && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push(`/visita/${id}/assinatura`)}
              >
                <Text style={styles.secondaryBtnText}>
                  {signature ? "Coletar nova assinatura" : "Coletar assinatura"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {visit.status === "check_in" && (
            <TouchableOpacity
              style={[styles.primaryBtn, busy === "checkout" && styles.btnDisabled]}
              onPress={handleCheckOut}
              disabled={busy === "checkout"}
            >
              <Text style={styles.primaryBtnText}>
                {busy === "checkout" ? "Finalizando..." : "Finalizar visita (check-out)"}
              </Text>
            </TouchableOpacity>
          )}

          {visit.status === "check_out" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Visita concluída</Text>
              <Text style={styles.signatureInfo}>
                Check-in: {new Date(visit.check_in_at!).toLocaleString("pt-BR")}
              </Text>
              <Text style={styles.signatureInfo}>
                Check-out: {new Date(visit.check_out_at!).toLocaleString("pt-BR")}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function PhotoSection({
  title,
  photos,
  onAdd,
  busy,
  disabled,
}: {
  title: string;
  photos: PhotoWithUrl[];
  onAdd: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.photoGrid}>
        {photos.map(
          (p) => p.url && <Image key={p.id} source={{ uri: p.url }} style={styles.photo} />
        )}
      </View>
      {!disabled && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onAdd} disabled={busy}>
          <Text style={styles.secondaryBtnText}>{busy ? "Enviando..." : "+ Tirar foto"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storeName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  address: { color: "#64748b" },
  link: { color: "#2563eb", marginTop: 4 },
  sectionTitle: { fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  signatureInfo: { color: "#64748b", fontSize: 13 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 84, height: 84, borderRadius: 8, backgroundColor: "#e2e8f0" },
  primaryBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 16 },
  primaryBtnText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: "#2563eb", textAlign: "center", fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
});
