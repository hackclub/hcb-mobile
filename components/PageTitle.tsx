import { Text } from "./Text";

export default function PageTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
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
