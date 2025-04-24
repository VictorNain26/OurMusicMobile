import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import AzuracastPlayer from "@/components/AzuracastPlayer";
import { authClient } from "@/lib/auth-client";

export default function HomeScreen() {
  const { data: session, refetch } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleAuth = async () => {
    if (mode === "login") {
      await authClient.signIn.email({ email, password });
    } else {
      await authClient.signUp.email({ email, password });
    }
    refetch(); // Refresh session after login/register
  };

  return (
    <View style={styles.container}>
      {session?.user ? (
        <>
          <Text style={styles.welcome}>Bienvenue, {session.user.email}</Text>
          <AzuracastPlayer />
        </>
      ) : (
        <>
          <Text style={styles.title}>{mode === "login" ? "Connexion" : "Inscription"}</Text>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <Button title={mode === "login" ? "Se connecter" : "S'inscrire"} onPress={handleAuth} />
          <Text style={styles.toggle} onPress={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Créer un compte" : "Déjà un compte ? Se connecter"}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  input: {
    width: "80%",
    borderBottomWidth: 1,
    marginBottom: 15,
    padding: 8,
  },
  toggle: {
    marginTop: 10,
    color: "#0a7ea4",
    textDecorationLine: "underline",
  },
  welcome: {
    fontSize: 20,
    marginBottom: 20,
  },
});
