import { useMemo } from "react";
import { Dimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useOfflineSWR } from "@/lib/useOfflineSWR";
import { palette } from "@/styles/theme";

interface BalancePoint {
  date: string;
  amount: number;
}

interface BalanceChartProps {
  organizationId: string;
}

export default function BalanceChart({ organizationId }: BalanceChartProps) {
  const { data } = useOfflineSWR<BalancePoint[]>(
    `organizations/${organizationId}/balance_by_date`,
  );

  const chartWidth = Dimensions.get("window").width - 80; // account for card padding
  const chartHeight = 140;

  const { linePath, areaPath } = useMemo(() => {
    if (!data || data.length < 2) return { linePath: "", areaPath: "" };

    const amounts = data.map((p) => p.amount);
    const minVal = Math.min(...amounts);
    const maxVal = Math.max(...amounts);
    const range = maxVal - minVal || 1;

    const padding = 2; // small vertical padding
    const drawHeight = chartHeight - padding * 2;

    const points = data.map((point, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = padding + drawHeight - ((point.amount - minVal) / range) * drawHeight;
      return { x, y };
    });

    const lineD = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");

    const areaD = `${lineD} L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

    return { linePath: lineD, areaPath: areaD };
  }, [data, chartWidth, chartHeight]);

  if (!data || data.length < 2) return null;

  return (
    <View style={{ marginTop: 16, marginHorizontal: -20, marginBottom: -20 }}>
      <Svg width={chartWidth + 40} height={chartHeight} viewBox={`-20 0 ${chartWidth + 40} ${chartHeight}`}>
        <Defs>
          <LinearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.success} stopOpacity="0.4" />
            <Stop offset="1" stopColor={palette.success} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#fillGradient)" />
        <Path
          d={linePath}
          fill="none"
          stroke={palette.success}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
