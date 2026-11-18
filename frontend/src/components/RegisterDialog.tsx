import { useState, useEffect } from "react";
import { RegisterDef, RegisterType, DataType, WordOrder } from "@/types/modbus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register?: RegisterDef | null;
  onSave: (reg: Omit<RegisterDef, "id">, id?: string) => Promise<unknown>;
}

export function RegisterDialog({
  open,
  onOpenChange,
  register,
  onSave,
}: RegisterDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RegisterType>("holding");
  const [address, setAddress] = useState<number>(0);
  const [dataType, setDataType] = useState<DataType>("uint16");
  const [wordOrder, setWordOrder] = useState<WordOrder>("big");
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (register) {
      setName(register.name);
      setType(register.type);
      setAddress(register.address);
      setDataType(register.data_type || "uint16");
      setWordOrder(register.word_order || "big");
      setScale(register.scale ?? 1);
      setOffset(register.offset ?? 0);
      setUnit(register.unit || "");
    } else {
      setName("");
      setType("holding");
      setAddress(0);
      setDataType("uint16");
      setWordOrder("big");
      setScale(1);
      setOffset(0);
      setUnit("");
    }
  }, [register, open]);

  const isBoolean = type === "coil" || type === "discrete";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          type,
          address: Number(address),
          data_type: dataType,
          word_order: wordOrder,
          scale: Number(scale),
          offset: Number(offset),
          unit: unit.trim(),
        },
        register?.id
      );
      onOpenChange(false);
    } catch {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{register ? "Edit Register" : "Add Register"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs">
              Name
            </Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Line Voltage"
              className="h-8 text-xs"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Register Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RegisterType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holding" className="text-xs">
                  Holding Register (Read FC03 / Write FC06)
                </SelectItem>
                <SelectItem value="input" className="text-xs">
                  Input Register (Read Only FC04)
                </SelectItem>
                <SelectItem value="coil" className="text-xs">
                  Coil (Read FC01 / Write FC05)
                </SelectItem>
                <SelectItem value="discrete" className="text-xs">
                  Discrete Input (Read Only FC02)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-addr" className="text-xs">
              Address (0-65535)
            </Label>
            <Input
              id="reg-addr"
              type="number"
              min={0}
              max={65535}
              required
              value={address}
              onChange={(e) => setAddress(parseInt(e.target.value, 10) || 0)}
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Numeric Only Fields */}
          {!isBoolean && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Data Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Type</Label>
                  <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uint16" className="text-xs font-mono">uint16</SelectItem>
                      <SelectItem value="int16" className="text-xs font-mono">int16</SelectItem>
                      <SelectItem value="uint32" className="text-xs font-mono">uint32 (2 regs)</SelectItem>
                      <SelectItem value="int32" className="text-xs font-mono">int32 (2 regs)</SelectItem>
                      <SelectItem value="float32" className="text-xs font-mono">float32 (2 regs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Word Order */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Word Order (32-bit)</Label>
                  <Select value={wordOrder} onValueChange={(v) => setWordOrder(v as WordOrder)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="big" className="text-xs">Big (ABCD)</SelectItem>
                      <SelectItem value="little" className="text-xs">Swap (CDAB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Scale */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-scale" className="text-xs">
                    Scale Multiplier
                  </Label>
                  <Input
                    id="reg-scale"
                    type="number"
                    step="any"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">e.g. 0.1 converts 328 to 32.8</p>
                </div>

                {/* Offset */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-offset" className="text-xs">
                    Offset Adder
                  </Label>
                  <Input
                    id="reg-offset"
                    type="number"
                    step="any"
                    value={offset}
                    onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Added after scale</p>
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-unit" className="text-xs">
                  Engineering Unit
                </Label>
                <Input
                  id="reg-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="V, A, °C, kW, rpm..."
                  className="h-8 text-xs"
                />
              </div>
            </>
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
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
