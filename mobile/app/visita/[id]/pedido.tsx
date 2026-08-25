import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Product, Visit } from "@vgrm/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type CartItem = { product: Product; qty: string };

export default function PedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("name")
      .returns<Product[]>()
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  function setQty(product: Product, qty: string) {
    setCart((prev) => ({ ...prev, [product.id]: { product, qty } }));
  }

  const items = Object.values(cart).filter((c) => Number(c.qty) > 0);
  const total = items.reduce((sum, c) => sum + Number(c.qty) * c.product.price, 0);

  async function handleSave() {
    if (!profile) return;
    if (!items.length) {
      Alert.alert("Pedido vazio", "Informe a quantidade de ao menos um produto.");
      return;
    }

    setSaving(true);

    const { data: visit } = await supabase
      .from("visits")
      .select("store_id")
      .eq("id", id)
      .single<Pick<Visit, "store_id">>();

    if (!visit) {
      setSaving(false);
      Alert.alert("Erro", "Visita não encontrada.");
      return;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        visit_id: id,
        store_id: visit.store_id,
        created_by: profile.id,
        status: "enviado",
        total_amount: total,
      })
      .select()
      .single();

    if (orderError || !order) {
      setSaving(false);
      Alert.alert("Erro ao salvar pedido", orderError?.message);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((c) => ({
        order_id: order.id,
        product_id: c.product.id,
        description: c.product.name,
        qty: Number(c.qty),
        unit_price: c.product.price,
      }))
    );

    setSaving(false);

    if (itemsError) {
      Alert.alert("Erro ao salvar itens do pedido", itemsError.message);
      return;
    }

    Alert.alert("Pedido lançado", `Total: R$ ${total.toFixed(2)}`);
    router.back();
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Lançar pedido" }} />

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>Nenhum produto disponível no catálogo.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
            </View>
            <TextInput
              style={styles.qtyInput}
              keyboardType="numeric"
              placeholder="0"
              value={cart[item.id]?.qty ?? ""}
              onChangeText={(v) => setQty(item, v)}
            />
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Salvando..." : "Salvar pedido"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  productName: { fontWeight: "600", color: "#0f172a" },
  productPrice: { color: "#64748b", fontSize: 12, marginTop: 2 },
  qtyInput: {
    width: 60,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    backgroundColor: "#fff",
  },
  total: { fontWeight: "600", fontSize: 16, marginBottom: 10 },
  saveBtn: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 14 },
  saveBtnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
