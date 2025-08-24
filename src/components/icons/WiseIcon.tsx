import Svg, { Path } from "react-native-svg";

export default function WiseIcon({
  size = 32,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
      <Path d="M10.488 11.6757L4 19.2567H15.585L16.886 15.6807H11.922L14.955 12.1737L14.965 12.0817L12.993 8.6867H21.866L14.988 27.6117H19.694L28 4.8017H6.543L10.488 11.6757Z"></Path>
    </Svg>
  );
}
