import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Store, Visit } from "@vgrm/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { StatusPill } from "@/components/status-pill";

type VisitRow = Visit & { store: Store };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function MinhasRotasScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date] = useState(todayISO());

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("visits")
      .select("*, store:stores(*)")
      .eq("assigned_to", profile.id)
      .eq("scheduled_date", date)
      .order("created_at", { ascending: true })
      .returns<VisitRow[]>();
    setVisits(data ?? []);
    setLoading(false);
  }, [profile, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Olá, {profile?.full_name?.split(" ")[0]}</Text>
          <Text style={styles.date}>
            {new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor="#2563eb" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/visita/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.storeName}>{item.store?.name}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.address}>{item.store?.address}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>Nenhuma visita para hoje.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  hello: { color: "#fff", fontSize: 18, fontWeight: "600" },
  date: { color: "#94a3b8", marginTop: 2, textTransform: "capitalize" },
  logout: { color: "#f87171", fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storeName: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  address: { color: "#64748b", fontSize: 13 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 40 },
});
