import { useState, useEffect } from "react";
import { RegisterDef } from "@/types/modbus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface WriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register?: RegisterDef | null;
  currentValue?: number | boolean | null;
  onWrite: (id: string, value: unknown) => Promise<unknown>;
}

export function WriteDialog({
  open,
  onOpenChange,
  register,
  currentValue,
  onWrite,
}: WriteDialogProps) {
  const [numValue, setNumValue] = useState<string>("");
  const [coilValue, setCoilValue] = useState<boolean>(false);
  const [writing, setWriting] = useState(false);

  const isCoil = register?.type === "coil";

  useEffect(() => {
    if (register && open) {
      if (isCoil) {
        setCoilValue(Boolean(currentValue));
      } else {
        setNumValue(currentValue != null ? String(currentValue) : "");
      }
    }
  }, [register, open, isCoil, currentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!register) return;

    setWriting(true);
    try {
      if (isCoil) {
        await onWrite(register.id, coilValue);
      } else {
        const val = parseFloat(numValue);
        if (isNaN(val)) return;
        await onWrite(register.id, val);
      }
      onOpenChange(false);
    } catch {
      // Handled in hook
    } finally {
      setWriting(false);
    }
  };

  let formattedCurrent = "-";
  if (currentValue != null) {
    if (typeof currentValue === "boolean") {
      formattedCurrent = currentValue ? "ON" : "OFF";
    } else if (typeof currentValue === "number") {
      formattedCurrent = `${Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(2)} ${register?.unit || ""}`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Write Register</DialogTitle>
          <DialogDescription className="text-xs">
            {register?.name} (address {register?.address})
          </DialogDescription>
        </DialogHeader>

        {/* Current Value Display Box */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs">
          <span className="text-muted-foreground font-medium">Current Value</span>
          <span className="font-mono font-semibold text-foreground text-sm">
            {formattedCurrent}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {isCoil ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="coil-toggle" className="text-xs font-medium">
                  Set Coil State
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {coilValue ? "Relay will turn ON" : "Relay will turn OFF"}
                </p>
              </div>
              <Switch
                id="coil-toggle"
                checked={coilValue}
                onCheckedChange={setCoilValue}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="write-value" className="text-xs">
                New Value to Send {register?.unit && `(${register.unit})`}
              </Label>
              <Input
                id="write-value"
                type="number"
                step="any"
                required
                value={numValue}
                onChange={(e) => setNumValue(e.target.value)}
                placeholder="Enter target numeric value..."
                className="h-9 text-xs font-mono"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Raw value will be calculated based on scale ({register?.scale ?? 1}) and offset ({register?.offset ?? 0}).
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={writing}>
              {writing ? "Sending..." : "Send Write"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
