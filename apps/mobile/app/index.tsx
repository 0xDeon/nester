import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleConnect = () => {
    // TODO: integrate WalletConnect / Freighter deep-link
    router.push("/dashboard");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>☕</Text>
      <Text style={styles.title}>Nester</Text>
      <Text style={styles.subtitle}>
        Decentralized savings &amp; instant fiat settlements
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleConnect}>
        <Text style={styles.buttonText}>Connect Wallet</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Supports Freighter · Lobstr · WalletConnect
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0f172a" },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: "bold", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#94a3b8", textAlign: "center", marginBottom: 48, lineHeight: 24 },
  button: { backgroundColor: "#3b82f6", paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, marginBottom: 16 },
  buttonText: { color: "#ffffff", fontSize: 18, fontWeight: "600" },
  hint: { color: "#475569", fontSize: 13 },
});