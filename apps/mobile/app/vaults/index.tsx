import { View, Text, FlatList, StyleSheet } from "react-native";

const VAULTS = [
  { id: "1", name: "Conservative Vault", apy: "6-8%", risk: "Low", lock: "None" },
  { id: "2", name: "Balanced Vault", apy: "8-12%", risk: "Medium", lock: "7 days" },
  { id: "3", name: "Growth Vault", apy: "12-18%", risk: "Higher", lock: "30 days" },
];

export default function VaultsScreen() {
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={VAULTS}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.heading}>Available Vaults</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.row}>
            <Text style={styles.apy}>{item.apy} APY</Text>
            <Text style={styles.risk}>{item.risk} risk</Text>
          </View>
          <Text style={styles.lock}>Lock period: {item.lock}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: "bold", color: "#ffffff", marginBottom: 20 },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 12 },
  name: { color: "#ffffff", fontSize: 17, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  apy: { color: "#22c55e", fontSize: 15, fontWeight: "bold" },
  risk: { color: "#94a3b8", fontSize: 14 },
  lock: { color: "#64748b", fontSize: 12 },
});