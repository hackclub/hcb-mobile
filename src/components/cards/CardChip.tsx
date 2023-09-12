import Svg, { Rect, Mask, G } from "react-native-svg";

export default function CardChip() {
  return (
    <Svg width="49" height="33" fill="none" viewBox="0 0 197 131">
      <Mask
        id="mask0"
        width="197"
        height="131"
        x="0"
        y="0"
        mask-type="alpha"
        maskUnits="userSpaceOnUse"
      >
        <Rect width="197" height="131" fill="#D1CAB9" rx="26" />
      </Mask>
      <G mask="url(#mask0)">
        <Rect width="197" height="131" fill="#D1CAB9" rx="26" />
        <Rect
          width="128.206"
          height="75"
          x="-57"
          y="26"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
        />
        <Rect
          width="128.206"
          height="75"
          x="252.206"
          y="104"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
          transform="rotate(-180 252.206 104)"
        />
        <Rect
          width="77.206"
          height="50"
          x="-6"
          y="-3"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
        />
        <Rect
          width="77.206"
          height="50"
          x="201.206"
          y="133"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
          transform="rotate(-180 201.206 133)"
        />
        <Rect
          width="77.206"
          height="50"
          x="-6"
          y="83"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
        />
        <Rect
          width="77.206"
          height="50"
          x="201.206"
          y="47"
          fill="#D1CAB9"
          stroke="#6F6666"
          stroke-width="4"
          rx="24"
          transform="rotate(-180 201.206 47)"
        />
      </G>
    </Svg>
  );
}
