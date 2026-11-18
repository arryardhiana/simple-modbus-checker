import { useMemo } from "react";
import { HistoryPoint } from "@/types/modbus";

interface SparklineProps {
  points: HistoryPoint[];
  isBoolean?: boolean;
  isError?: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({
  points,
  isBoolean = false,
  isError = false,
  width = 100,
  height = 32,
}: SparklineProps) {
  const pad = 1;

  const { linePath, areaPath } = useMemo(() => {
    if (!points || points.length < 2) {
      return { linePath: "", areaPath: "" };
    }

    const values = points.map((p) => (isBoolean ? (p.v ? 1 : 0) : Number(p.v)));
    const finite = values.filter(Number.isFinite);
    if (finite.length < 2) {
      return { linePath: "", areaPath: "" };
    }

    let min = Math.min(...finite);
    let max = Math.max(...finite);
    if (min === max) {
      min -= 0.5;
      max += 0.5;
    }

    const innerW = width - 2 * pad;
    const innerH = height - 2 * pad;
    const xAt = (i: number) => pad + (i / (values.length - 1)) * innerW;
    const yAt = (v: number) => height - pad - ((v - min) / (max - min)) * innerH;

    let d = "";
    if (isBoolean) {
      for (let i = 0; i < values.length; i++) {
        const x = xAt(i).toFixed(1);
        const y = yAt(values[i]).toFixed(1);
        if (i === 0) d += `M${x} ${y}`;
        else {
          d += `L${x} ${yAt(values[i - 1]).toFixed(1)}L${x} ${y}`;
        }
      }
    } else {
      for (let i = 0; i < values.length; i++) {
        const x = xAt(i).toFixed(1);
        const y = yAt(values[i]).toFixed(1);
        d += i === 0 ? `M${x} ${y}` : `L${x} ${y}`;
      }
    }

    const baseY = (height - pad).toFixed(1);
    const area = `${d}L${xAt(values.length - 1).toFixed(1)} ${baseY}L${xAt(0).toFixed(1)} ${baseY}Z`;

    return { linePath: d, areaPath: area };
  }, [points, isBoolean, width, height]);

  if (!linePath) {
    return <div className="h-8 w-full bg-muted/20" />;
  }

  const strokeColor = isError ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const fillColor = isError
    ? "hsl(var(--destructive) / 0.12)"
    : "hsl(var(--primary) / 0.08)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-9 block overflow-visible"
      aria-hidden="true"
    >
      <path d={areaPath} fill={fillColor} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
