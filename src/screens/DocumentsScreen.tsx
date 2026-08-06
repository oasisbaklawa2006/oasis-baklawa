import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Documents">;
type DocType = "Tax Invoice" | "Pro-Forma" | "Transport LR/Bilty";

interface DocumentRow {
  id: string;
  type: DocType;
  reference: string;
  date: string;
}

const SAMPLE_DOCS: DocumentRow[] = [
  { id: "1", type: "Tax Invoice", reference: "INV-2026-0142", date: "2026-08-01" },
  { id: "2", type: "Pro-Forma", reference: "PF-2026-0089", date: "2026-07-28" },
  { id: "3", type: "Transport LR/Bilty", reference: "LR-2026-0231", date: "2026-08-02" },
];

export function DocumentsScreen({}: Props) {
  const [filter, setFilter] = useState<DocType | "All">("All");
  const filtered = useMemo(() => (filter === "All" ? SAMPLE_DOCS : SAMPLE_DOCS.filter((d) => d.type === filter)), [filter]);

  return (
    <Screen title="Documents" subtitle="Invoices · Pro-Forma · Transport copies" scroll={false}>
      <View style={styles.tabs}>
        {(["All", "Tax Invoice", "Pro-Forma", "Transport LR/Bilty"] as (DocType | "All")[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, filter === t && styles.tabActive]} onPress={() => setFilter(t)}>
            <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{item.reference}</Text>
              <Text style={styles.rowMeta}>
                {item.type} · {item.date}
              </Text>
            </View>
            <Text style={styles.download}>Download</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No documents</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F0DED0" },
  tabActive: { backgroundColor: "#7A1B2B" },
  tabText: { fontSize: 11, color: "#7A1B2B", fontWeight: "600" },
  tabTextActive: { color: "#FFF" },
  list: { paddingVertical: 12, gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0DED0" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#3A2A22" },
  rowMeta: { fontSize: 11, color: "#8A6B5C", marginTop: 2 },
  download: { fontSize: 12, color: "#7A1B2B", fontWeight: "700" },
  empty: { fontSize: 13, color: "#8A6B5C", textAlign: "center", paddingVertical: 20 },
});
