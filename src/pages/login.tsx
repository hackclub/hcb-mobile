import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  DiscoveryDocument,
} from "expo-auth-session";
import { useContext, useEffect, useRef, useState } from "react";
import { Text, View, Animated, StyleSheet, SafeAreaView } from "react-native";

import AuthContext from "../auth";
import Button from "../components/Button";
import { palette } from "../theme";

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
};
const clientId = process.env.EXPO_PUBLIC_CLIENT_ID!;

const redirectUri = makeRedirectUri({ scheme: "hcb" });

export default function Login() {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ["read", "write"],
      extraParams: {
        no_app_shell: "true",
      },
    },
    discovery,
  );

  const [loading, setLoading] = useState(false);

  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    if (response?.type == "success") {
      setLoading(true);
      exchangeCodeAsync(
        {
          clientId,
          redirectUri,
          code: response.params.code,
          extraParams: { code_verifier: request!.codeVerifier! },
        },
        discovery,
      )
        .then((r) => setToken(r.accessToken))
        .catch(() => setLoading(false));
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

      <View style={{ marginBottom: 30 }}>
        <Button
          onPress={() => promptAsync()}
          loading={loading}
          style={{ marginHorizontal: 20 }}
        >
          Log in
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
    flexDirection: "column",
  },
});
