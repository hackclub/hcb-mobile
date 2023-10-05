import { Image } from "expo-image";
import {
  StyleProp,
  Text,
  View,
  StyleSheet,
  ImageStyle,
  ViewStyle,
} from "react-native";

import User from "../lib/types/User";
import { userColor, userInitials } from "../lib/userUtils";

export default function UserAvatar({
  user,
  size = 25,
  style,
}: {
  user: User;
  size?: number;
} & { style?: StyleProp<ImageStyle> & StyleProp<ViewStyle> }) {
  if (user.avatar) {
    return (
      <Image
        source={user.avatar}
        placeholder={require("../../assets/placeholder.png")}
        cachePolicy="disk"
        style={StyleSheet.compose(
          { width: size, height: size, borderRadius: 400 },
          style,
        )}
      />
    );
  } else {
    return (
      <View
        style={StyleSheet.compose(
          {
            width: size,
            height: size,
            backgroundColor: userColor(user.id),
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        )}
      >
        <Text style={{ color: "white", fontSize: size * 0.5 }}>
          {userInitials(user.name)}
        </Text>
      </View>
    );
  }
}
