import { useId, useMemo } from "react";
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
  width = 240,
  height = 42,
}: SparklineProps) {
  const gradientId = useId();
  const pad = 2;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    if (!points || points.length < 2) {
      return { linePath: "", areaPath: "", lastPoint: null };
    }

    const values = points.map((p) => (isBoolean ? (p.v ? 1 : 0) : Number(p.v)));
    const finite = values.filter(Number.isFinite);
    if (finite.length < 2) {
      return { linePath: "", areaPath: "", lastPoint: null };
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

    const lastX = xAt(values.length - 1);
    const lastY = yAt(values[values.length - 1]);
    const baseY = (height - pad).toFixed(1);
    const area = `${d}L${lastX.toFixed(1)} ${baseY}L${xAt(0).toFixed(1)} ${baseY}Z`;

    return {
      linePath: d,
      areaPath: area,
      lastPoint: { x: lastX, y: lastY },
    };
  }, [points, isBoolean, width, height]);

  if (!linePath) {
    return (
      <div className="h-10 w-full flex items-center justify-center text-[10px] text-muted-foreground/40 font-mono">
        Waiting for stream...
      </div>
    );
  }

  const strokeColor = isError
    ? "hsl(var(--destructive))"
    : isBoolean
    ? "#10b981"
    : "hsl(var(--primary))";

  return (
    <div className="relative w-full h-11 overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full block overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={strokeColor}
              stopOpacity={isError ? "0.3" : "0.22"}
            />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath curve */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Crisp telemetry curve */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Live Pulse Beacon on Latest Point */}
        {lastPoint && (
          <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
            <circle
              r="4"
              fill={strokeColor}
              opacity="0.25"
              className="animate-ping"
            />
            <circle r="2.5" fill={strokeColor} />
            <circle r="1" fill="#ffffff" />
          </g>
        )}
      </svg>
    </div>
  );
}
