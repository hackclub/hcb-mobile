import { Text } from "./Text";

import { theme } from "@/styles/theme";

export default function PageTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: theme.colors.text,
        fontSize: 30,
        marginBottom: 10,
        marginTop: 35,
        fontFamily: "Bold",
      }}
    >
      {title}
    </Text>
  );
}
