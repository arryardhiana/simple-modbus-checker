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
          <DialogTitle className="font-serif text-2xl font-normal tracking-tight lowercase">
            {register ? "edit register" : "add register"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-normal text-muted-foreground lowercase">
              register name
            </Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. line voltage"
              className="h-8 text-xs rounded-lg"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground lowercase">register type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RegisterType)}>
              <SelectTrigger className="h-8 text-xs rounded-lg lowercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holding" className="text-xs lowercase">
                  holding register (read fc03 / write fc06)
                </SelectItem>
                <SelectItem value="input" className="text-xs lowercase">
                  input register (read only fc04)
                </SelectItem>
                <SelectItem value="coil" className="text-xs lowercase">
                  coil (read fc01 / write fc05)
                </SelectItem>
                <SelectItem value="discrete" className="text-xs lowercase">
                  discrete input (read only fc02)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-addr" className="text-xs font-normal text-muted-foreground lowercase">
              address (0-65535)
            </Label>
            <Input
              id="reg-addr"
              type="number"
              min={0}
              max={65535}
              required
              value={address}
              onChange={(e) => setAddress(parseInt(e.target.value, 10) || 0)}
              className="h-8 text-xs font-mono rounded-lg"
            />
          </div>

          {/* Numeric Only Fields */}
          {!isBoolean && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Data Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground lowercase">data type</Label>
                  <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                    <SelectTrigger className="h-8 text-xs font-mono rounded-lg">
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
                  <Label className="text-xs font-normal text-muted-foreground lowercase">word order (32-bit)</Label>
                  <Select value={wordOrder} onValueChange={(v) => setWordOrder(v as WordOrder)}>
                    <SelectTrigger className="h-8 text-xs rounded-lg lowercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="big" className="text-xs lowercase">big (abcd)</SelectItem>
                      <SelectItem value="little" className="text-xs lowercase">swap (cdab)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Scale */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-scale" className="text-xs font-normal text-muted-foreground lowercase">
                    scale multiplier
                  </Label>
                  <Input
                    id="reg-scale"
                    type="number"
                    step="any"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value) || 1)}
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono lowercase">e.g. 0.1 scales 328 to 32.8</p>
                </div>

                {/* Offset */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-offset" className="text-xs font-normal text-muted-foreground lowercase">
                    offset adder
                  </Label>
                  <Input
                    id="reg-offset"
                    type="number"
                    step="any"
                    value={offset}
                    onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono lowercase">added after scale</p>
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-unit" className="text-xs font-normal text-muted-foreground lowercase">
                  engineering unit
                </Label>
                <Input
                  id="reg-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="v, a, °c, kw, rpm..."
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full lowercase"
              onClick={() => onOpenChange(false)}
            >
              cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="rounded-full lowercase">
              {saving ? "saving..." : "save register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
