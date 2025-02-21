import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  DiscoveryDocument,
} from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Animated,
  SafeAreaView,
  useColorScheme,
} from "react-native";

import AuthContext from "../auth";
import Button from "../components/Button";
import { lightTheme, palette, theme as darkTheme } from "../theme";

export const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/token`,
  revocationEndpoint: `${process.env.EXPO_PUBLIC_API_BASE}/oauth/revoke`,
};
const clientId = process.env.EXPO_PUBLIC_CLIENT_ID!;

const redirectUri = makeRedirectUri({ scheme: "hcb" });

export default function Login() {
  const scheme = useColorScheme();
  const theme = scheme == "dark" ? darkTheme : lightTheme;

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ["read", "write"],
      extraParams: {
        no_app_shell: "true",
        theme: scheme || "",
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
        .then((r) => {
          setToken(r.accessToken);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        })
        .catch(() => setLoading(false));
    }
  }, [response, request, setToken]);

  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  return (
    <SafeAreaView
      style={{
        backgroundColor: theme.colors.background,
        flex: 1,
        flexDirection: "column",
      }}
    >
      <View
        style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.Image
          source={scheme == "dark" ? require("../../assets/icon.png") : require("../../assets/icon-light.png")}
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
