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
    label: "fc03",
    desc: "holding register",
    badgeClass:
      "bg-primary/10 text-primary border-primary/20",
  },
  input: {
    label: "fc04",
    desc: "input register",
    badgeClass:
      "bg-secondary text-foreground border-border/80",
  },
  coil: {
    label: "fc01",
    desc: "coil (bit)",
    badgeClass:
      "bg-accent/15 text-accent border-accent/25",
  },
  discrete: {
    label: "fc02",
    desc: "discrete input",
    badgeClass:
      "bg-muted text-muted-foreground border-border/60",
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
    label: "fc",
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
    <Card className="relative overflow-hidden flex flex-col justify-between border-border/80 bg-card/90 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 group rounded-xl">
      {/* Top Section */}
      <div className="p-4 pb-2.5 space-y-3">
        {/* Header: Register Name & Actions in Lumen Serif */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h4
              className="font-serif text-lg font-normal tracking-tight text-foreground lowercase truncate max-w-[170px]"
              title={register.name}
            >
              {register.name}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border lowercase ${fcInfo.badgeClass}`}
                title={fcInfo.desc}
              >
                {fcInfo.label}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground lowercase">
                addr {register.address}
              </span>
              {!isBoolean && (
                <span className="text-[11px] font-mono text-muted-foreground/70 lowercase">
                  ({register.data_type})
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isWritable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWrite(register)}
                className="h-7 px-2.5 rounded-full text-xs gap-1 font-medium lowercase text-primary hover:bg-primary/10 border-primary/30"
                title="Write value to this register"
              >
                <Zap className="h-3 w-3 text-primary fill-primary/20" />
                write
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(register)}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              title="Edit register settings"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(register.id)}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
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
              className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive w-full"
              title={error}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-mono">{error}</span>
            </div>
          ) : isBoolean ? (
            /* Boolean Relay / Coil Status Capsule */
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide border shadow-xs transition-all lowercase ${
                  value
                    ? "bg-primary/15 text-primary border-primary/35 ring-1 ring-primary/20"
                    : "bg-muted/70 text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    value ? "bg-primary animate-pulse" : "bg-muted-foreground/60"
                  }`}
                />
                {value ? "active (on)" : "inactive (off)"}
              </span>
            </div>
          ) : (
            /* Numeric Analog Telemetry with Lumen font */
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-normal tracking-tight font-serif tabular-nums text-foreground">
                {formattedValue}
              </span>
              {register.unit && (
                <span className="px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-mono border border-border/50 lowercase">
                  {register.unit}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Live Sparkline with Lumen Brass / Cool Trace */}
      <div className="w-full bg-muted/15 border-t border-border/60">
        <Sparkline
          points={history}
          isBoolean={isBoolean}
          isError={Boolean(error)}
        />
      </div>
    </Card>
  );
}
