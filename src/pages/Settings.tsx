
import { View } from "react-native";
import Button from "../components/Button";
import { useContext } from "react";
import AuthContext from "../auth";

export default function SettingsPage({}: Props) {
  const { setToken } = useContext(AuthContext);
  return (
    <View>
      <Button onPress={() => setToken("")}>
        Log out
      </Button>
    </View>
  )
}