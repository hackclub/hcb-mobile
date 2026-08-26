import { Image, Platform, StyleSheet, View } from "react-native";

import { splashBackgroundColor } from "@/styles/theme";

const ANDROID_SPLASH_LOGO_DP = 288;

export default function AppSplash() {
  return (
    <View style={styles.container}>
      {Platform.OS === "ios" ? (
        <Image
          source={require("../../assets/splash-ios.png")}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      ) : (
        <Image
          source={require("../../assets/splash-android.png")}
          style={styles.androidLogo}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: splashBackgroundColor,
  },
  androidLogo: {
    width: ANDROID_SPLASH_LOGO_DP,
    height: ANDROID_SPLASH_LOGO_DP,
  },
});
