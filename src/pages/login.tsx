import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import { Text, View, Pressable, Animated } from "react-native";
import { StyleSheet, SafeAreaView } from "react-native";
import { useContext, useEffect, useRef } from "react";
import AuthContext from "../auth";
import { palette } from "../theme";

const discovery = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
};

const redirectUri = makeRedirectUri({ scheme: "hcb" });

export default function Login() {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_CLIENT_ID,
      redirectUri,
      scopes: ["read", "write"],
      extraParams: {
        no_app_shell: "true",
      },
    },
    discovery
  );

  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    if (response?.type == "success") {
      fetch(`${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.EXPO_PUBLIC_CLIENT_ID,
          code: response.params.code,
          grant_type: "authorization_code",
          code_verifier: request?.codeVerifier,
          redirect_uri: redirectUri,
        }),
      })
        .then((r) => r.json())
        .then((r) => {
          setToken(r.access_token);
        });
    }
  }, [response]);

  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.Image
          source={require("../../assets/icon.png")}
          style={{
            width: 100,
            height: 100,
            marginBottom: 20,
            opacity: animation,
            transform: [
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          }}
        />
        <Text
          style={{ color: palette.muted, textAlign: "center", fontSize: 20 }}
        >
          Welcome to <Text style={{ color: palette.primary }}>HCB</Text>.
        </Text>
      </View>
      <Pressable style={styles.button} onPress={() => promptAsync()}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
    flexDirection: "column",
  },
  button: {
    backgroundColor: palette.primary,
    color: "white",
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    textAlign: "center",
    fontWeight: "400",
  },
});
