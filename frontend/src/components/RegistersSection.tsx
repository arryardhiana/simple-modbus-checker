import { RegisterDef, HistoryPoint } from "@/types/modbus";
import { RegisterCard } from "./RegisterCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Gauge, Activity } from "lucide-react";

interface RegistersSectionProps {
  registers: RegisterDef[];
  values: Record<string, number | boolean | null>;
  errors: Record<string, string>;
  history: Record<string, HistoryPoint[]>;
  onAdd: () => void;
  onEdit: (reg: RegisterDef) => void;
  onDelete: (id: string) => void;
  onWrite: (reg: RegisterDef) => void;
}

export function RegistersSection({
  registers,
  values,
  errors,
  history,
  onAdd,
  onEdit,
  onDelete,
  onWrite,
}: RegistersSectionProps) {
  return (
    <Card className="border-border/80 bg-card/90 shadow-sm rounded-xl overflow-hidden">
      {/* Header with Lumen Serif & Lowercase */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <CardTitle className="font-serif text-2xl font-normal tracking-tight lowercase">
                registers
              </CardTitle>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 lowercase">
                {registers.length} channels
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono lowercase">
              <Activity className="h-3 w-3 text-primary" />
              <span>1 hz cycle</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onAdd}
            className="h-8 rounded-full px-4 gap-1.5 text-xs font-medium lowercase shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            add register
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {registers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Gauge className="h-6 w-6" />
            </div>
            <h4 className="font-serif text-lg font-normal lowercase text-foreground">
              no registers configured
            </h4>
            <p className="text-xs text-muted-foreground font-mono mt-1 mb-4 max-w-sm lowercase">
              define holding registers, analog inputs or digital coils to stream data.
            </p>
            <Button
              size="sm"
              onClick={onAdd}
              className="gap-1.5 text-xs font-medium rounded-full lowercase"
            >
              <Plus className="h-3.5 w-3.5" />
              add first register
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {registers.map((reg) => (
              <RegisterCard
                key={reg.id}
                register={reg}
                value={values[reg.id]}
                error={errors[reg.id]}
                history={history[reg.id]}
                onEdit={onEdit}
                onDelete={onDelete}
                onWrite={onWrite}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
