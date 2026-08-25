import { StyleSheet, Text, View } from "react-native";
import type { VisitStatus } from "@vgrm/shared";

const CONFIG: Record<VisitStatus, { label: string; bg: string; fg: string }> = {
  pendente: { label: "Pendente", bg: "#e2e8f0", fg: "#475569" },
  check_in: { label: "Em andamento", bg: "#fef3c7", fg: "#b45309" },
  check_out: { label: "Concluída", bg: "#d1fae5", fg: "#047857" },
  cancelada: { label: "Cancelada", bg: "#fee2e2", fg: "#b91c1c" },
};

export function StatusPill({ status }: { status: VisitStatus }) {
  const c = CONFIG[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "600" },
});
