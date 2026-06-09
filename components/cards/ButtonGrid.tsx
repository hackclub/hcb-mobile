import { cloneElement, isValidElement, ReactElement } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

export default function ButtonGrid({ buttons }: { buttons: ReactElement[] }) {
  if (buttons.length === 0) return null;

  const rows: ReactElement[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  return (
    <View style={{ marginBottom: 20, gap: 15 }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: 15 }}>
          {row.map((button) => {
            if (!isValidElement<{ style?: StyleProp<ViewStyle> }>(button)) {
              return null;
            }
            return cloneElement(button, {
              style: [button.props.style, { flex: 1 }],
            });
          })}
        </View>
      ))}
    </View>
  );
}
