import { RegisterDef, HistoryPoint } from "@/types/modbus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./Sparkline";
import { Pencil, Trash2, Zap, AlertTriangle } from "lucide-react";

interface RegisterCardProps {
  register: RegisterDef;
  value: number | boolean | null | undefined;
  error?: string;
  history?: HistoryPoint[];
  onEdit: (reg: RegisterDef) => void;
  onDelete: (id: string) => void;
  onWrite: (reg: RegisterDef) => void;
}

const FC_CONFIG: Record<
  string,
  { label: string; badgeClass: string; desc: string }
> = {
  holding: {
    label: "FC03",
    desc: "Holding Register",
    badgeClass:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  input: {
    label: "FC04",
    desc: "Input Register",
    badgeClass:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  coil: {
    label: "FC01",
    desc: "Coil (Bit)",
    badgeClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  discrete: {
    label: "FC02",
    desc: "Discrete Input",
    badgeClass:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

export function RegisterCard({
  register,
  value,
  error,
  history = [],
  onEdit,
  onDelete,
  onWrite,
}: RegisterCardProps) {
  const isWritable = register.type === "holding" || register.type === "coil";
  const isBoolean = register.type === "coil" || register.type === "discrete";
  const fcInfo = FC_CONFIG[register.type] || {
    label: "FC",
    desc: "",
    badgeClass: "bg-muted text-muted-foreground",
  };

  let formattedValue = "-";
  if (!error && value != null) {
    if (typeof value === "number") {
      formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(2);
    } else if (typeof value !== "boolean") {
      formattedValue = String(value);
    }
  }

  return (
    <Card className="relative overflow-hidden flex flex-col justify-between border-border/80 bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 group">
      {/* Top Section */}
      <div className="p-4 pb-2 space-y-3">
        {/* Header: Register Name & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h4
              className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[170px]"
              title={register.name}
            >
              {register.name}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${fcInfo.badgeClass}`}
                title={fcInfo.desc}
              >
                {fcInfo.label}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                addr {register.address}
              </span>
              {!isBoolean && (
                <span className="text-[11px] font-mono text-muted-foreground/75">
                  ({register.data_type})
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isWritable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWrite(register)}
                className="h-7 px-2 text-xs gap-1 font-medium text-primary hover:bg-primary/10 border-primary/30"
                title="Write value to this register"
              >
                <Zap className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                Write
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(register)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Edit register settings"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(register.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Delete register"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Center: Live Measurement Telemetry */}
        <div className="pt-1 min-h-[46px] flex items-center">
          {error ? (
            <div
              className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive w-full"
              title={error}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-mono">{error}</span>
            </div>
          ) : isBoolean ? (
            /* Boolean Relay / Coil Status Capsule */
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide border shadow-sm transition-all ${
                  value
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20"
                    : "bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    value ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
                  }`}
                />
                {value ? "ACTIVE (ON)" : "INACTIVE (OFF)"}
              </span>
            </div>
          ) : (
            /* Numeric Analog Telemetry */
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                {formattedValue}
              </span>
              {register.unit && (
                <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
                  {register.unit}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Modern Live Sparkline */}
      <div className="w-full bg-muted/20 border-t border-border/60">
        <Sparkline
          points={history}
          isBoolean={isBoolean}
          isError={Boolean(error)}
        />
      </div>
    </Card>
  );
}
