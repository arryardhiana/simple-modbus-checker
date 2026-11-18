import { RegisterDef, HistoryPoint } from "@/types/modbus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkline } from "./Sparkline";
import { Pencil, Trash2, Zap, AlertCircle } from "lucide-react";

interface RegisterCardProps {
  register: RegisterDef;
  value: number | boolean | null | undefined;
  error?: string;
  history?: HistoryPoint[];
  onEdit: (reg: RegisterDef) => void;
  onDelete: (id: string) => void;
  onWrite: (reg: RegisterDef) => void;
}

const FC_LABEL: Record<string, string> = {
  holding: "FC03",
  input: "FC04",
  coil: "FC01",
  discrete: "FC02",
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
  const fc = FC_LABEL[register.type] || "";

  let displayValue = "-";
  if (!error && value != null) {
    if (typeof value === "boolean") {
      displayValue = value ? "ON" : "OFF";
    } else if (typeof value === "number") {
      displayValue = Number.isInteger(value) ? String(value) : value.toFixed(2);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <Card className="relative overflow-hidden flex flex-col justify-between transition-all hover:border-foreground/30 group">
      <div className="p-4 space-y-2">
        {/* Top Header / Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium leading-none truncate max-w-[170px]" title={register.name}>
              {register.name}
            </h4>
            <p className="text-[11px] text-muted-foreground font-mono">
              {fc} · addr {register.address} {!isBoolean && `· ${register.data_type}`}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            {isWritable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWrite(register)}
                className="h-6 px-2 text-[11px] font-normal gap-1 text-primary hover:bg-primary/10"
                title="Write to register"
              >
                <Zap className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                Write
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(register)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Edit register"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(register.id)}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              title="Delete register"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Value Display */}
        <div className="pt-2">
          {error ? (
            <div className="flex items-center gap-1.5 text-destructive text-sm" title={error}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-mono">{error}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-semibold tracking-tight font-mono ${
                  isBoolean
                    ? value
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {displayValue}
              </span>
              {register.unit && !isBoolean && (
                <span className="text-xs text-muted-foreground font-medium">
                  {register.unit}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sparkline Visualizer */}
      <div className="w-full bg-muted/15 border-t">
        <Sparkline points={history} isBoolean={isBoolean} isError={Boolean(error)} />
      </div>
    </Card>
  );
}
