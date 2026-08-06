import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { supabase } from "@/lib/supabase";
import type { PublishedProduct } from "@/types/database.types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const ANNOUNCEMENTS = [
  "Diwali festive gift boxes now open for pre-order",
  "New winter dry-fruit range launched",
  "Free logistics on orders above ₹50,000",
];

export function HomeScreen({ navigation }: Props) {
  const [bestSellers, setBestSellers] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("published_products_v1");
      setBestSellers((data ?? []).slice(0, 8));
      setLoading(false);
    })();
  }, []);

  return (
    <Screen title="Oasis Baklawa" subtitle="Handcrafted sweets, wholesale trade">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Artisan Baklawa, Made Fresh Daily</Text>
      </View>

      <View style={styles.marquee}>
        {ANNOUNCEMENTS.map((a) => (
          <Text key={a} style={styles.marqueeText}>
            📣 {a}
          </Text>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Best Sellers</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={bestSellers}
        keyExtractor={(item) => item.product_id}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No products yet</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Catalogue")}>
            <Image
              source={item.hero_image_url ? { uri: item.hero_image_url } : undefined}
              style={styles.cardImage}
            />
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.product_name}
            </Text>
            <Text style={styles.cardMeta}>{item.pack_size ?? item.primary_uom}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>Festive Collections</Text>
      <View style={styles.festiveRow}>
        {["Diwali Gift Boxes", "Wedding Trays", "Corporate Hampers"].map((label) => (
          <TouchableOpacity key={label} style={styles.festiveCard} onPress={() => navigation.navigate("Catalogue")}>
            <Text style={styles.festiveText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 140, borderRadius: 16, backgroundColor: "#7A1B2B", justifyContent: "flex-end", padding: 16, marginTop: 16 },
  heroTitle: { color: "#FFF8F2", fontSize: 18, fontWeight: "700" },
  marquee: { marginTop: 16, gap: 4 },
  marqueeText: { fontSize: 12, color: "#8A6B5C" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#3A2A22", marginTop: 24, marginBottom: 12 },
  card: { width: 130, marginRight: 12 },
  cardImage: { width: 130, height: 100, borderRadius: 10, backgroundColor: "#F0DED0" },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#3A2A22", marginTop: 6 },
  cardMeta: { fontSize: 11, color: "#8A6B5C" },
  empty: { fontSize: 13, color: "#8A6B5C" },
  festiveRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  festiveCard: { flexGrow: 1, backgroundColor: "#F0DED0", borderRadius: 10, paddingVertical: 20, paddingHorizontal: 12, alignItems: "center" },
  festiveText: { fontSize: 12, fontWeight: "600", color: "#7A1B2B", textAlign: "center" },
});
