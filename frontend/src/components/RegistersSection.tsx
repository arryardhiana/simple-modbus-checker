import { RegisterDef, HistoryPoint } from "@/types/modbus";
import { RegisterCard } from "./RegisterCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Cpu } from "lucide-react";

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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">Registers</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              ({registers.length})
            </span>
          </div>
          <Button size="sm" onClick={onAdd} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Register
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {registers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed bg-muted/20">
            <Cpu className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <h4 className="text-sm font-medium">No registers defined</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm">
              Add holding registers, input registers, coils, or discrete inputs to start polling data.
            </p>
            <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add your first register
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
