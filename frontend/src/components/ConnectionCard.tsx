import { useState, useEffect, useRef } from "react";
import { ConnectionConfig, SerialPortInfo } from "@/types/modbus";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Cable, Network, Power } from "lucide-react";

interface ConnectionCardProps {
  connection: ConnectionConfig | undefined;
  ports: SerialPortInfo[];
  connected: boolean;
  isConnecting: boolean;
  onRefreshPorts: () => Promise<void>;
  onToggleConnect: () => Promise<void>;
  onSaveConnection: (conn: ConnectionConfig) => void;
}

export function ConnectionCard({
  connection,
  ports,
  connected,
  isConnecting,
  onRefreshPorts,
  onToggleConnect,
  onSaveConnection,
}: ConnectionCardProps) {
  const [form, setForm] = useState<ConnectionConfig>({
    conn_type: "serial",
    port: "",
    baudrate: 9600,
    parity: "N",
    stopbits: 1,
    bytesize: 8,
    host: "192.168.1.100",
    tcp_port: 502,
    framing: "tcp",
    timeout: 1.0,
    slave_id: 1,
  });

  const [refreshing, setRefreshing] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync initial connection
  useEffect(() => {
    if (connection) {
      setForm((prev) => ({ ...prev, ...connection }));
    }
  }, [connection]);

  const updateField = <K extends keyof ConnectionConfig>(
    key: K,
    value: ConnectionConfig[K]
  ) => {
    const updated = { ...form, [key]: value };
    setForm(updated);

    // Debounced auto-save (400ms)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      onSaveConnection(updated);
    }, 400);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshPorts();
    setRefreshing(false);
  };

  const isSerial = form.conn_type === "serial";

  return (
    <Card className="border-border/80 bg-card/90 shadow-sm rounded-xl overflow-hidden">
      {/* Top Card Bar with Lumen Serif Heading */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <CardTitle className="font-serif text-2xl font-normal tracking-tight lowercase">
              transport & interface
            </CardTitle>
            {isSerial ? (
              <Badge
                variant="outline"
                className="font-mono text-[11px] font-medium border-border/70 rounded-full lowercase"
              >
                serial rtu
              </Badge>
            ) : (
              <Badge
                variant="info"
                className="font-mono text-[11px] font-medium rounded-full lowercase"
              >
                modbus gateway
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSerial && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || connected}
                className="h-8 rounded-full px-3 gap-1.5 text-xs font-medium lowercase"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                refresh ports
              </Button>
            )}

            <Button
              variant={connected ? "destructive" : "default"}
              size="sm"
              onClick={onToggleConnect}
              disabled={isConnecting}
              className={`h-8 rounded-full px-4 text-xs font-medium lowercase gap-1.5 shadow-sm transition-transform active:scale-[0.98] ${
                connected
                  ? "hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {isConnecting
                ? "connecting..."
                : connected
                ? "disconnect"
                : "connect"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Connection Type Tabs */}
        <Tabs
          value={form.conn_type}
          onValueChange={(val) =>
            updateField("conn_type", val as "serial" | "tcp")
          }
          className="w-full max-w-sm"
        >
          <TabsList className="grid grid-cols-2 w-full h-8 p-1 bg-muted/70 rounded-full">
            <TabsTrigger
              value="serial"
              disabled={connected}
              className="gap-2 text-xs font-medium rounded-full lowercase"
            >
              <Cable className="h-3.5 w-3.5" />
              serial usb
            </TabsTrigger>
            <TabsTrigger
              value="tcp"
              disabled={connected}
              className="gap-2 text-xs font-medium rounded-full lowercase"
            >
              <Network className="h-3.5 w-3.5" />
              gateway tcp
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
          {isSerial ? (
            <>
              {/* Serial Port */}
              <div className="space-y-1 sm:col-span-2">
                <Label
                  htmlFor="port-select"
                  className="text-xs font-normal text-muted-foreground lowercase"
                >
                  serial port
                </Label>
                <Select
                  value={form.port}
                  onValueChange={(v) => updateField("port", v)}
                  disabled={connected}
                >
                  <SelectTrigger
                    id="port-select"
                    className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg"
                  >
                    <SelectValue placeholder="select serial port..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ports.length === 0 ? (
                      <SelectItem value="none" disabled>
                        (no serial ports detected)
                      </SelectItem>
                    ) : (
                      ports.map((p) => (
                        <SelectItem
                          key={p.device}
                          value={p.device}
                          className="text-xs font-mono"
                        >
                          {p.device}{" "}
                          {p.description && p.description !== "n/a"
                            ? `(${p.description})`
                            : ""}
                        </SelectItem>
                      ))
                    )}
                    {form.port && !ports.some((p) => p.device === form.port) && (
                      <SelectItem
                        value={form.port}
                        className="text-xs font-mono"
                      >
                        {form.port} (saved)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Baud rate */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  baud rate
                </Label>
                <Select
                  value={String(form.baudrate)}
                  onValueChange={(v) => updateField("baudrate", parseInt(v, 10))}
                  disabled={connected}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                      <SelectItem
                        key={b}
                        value={String(b)}
                        className="text-xs font-mono"
                      >
                        {b} bps
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parity */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  parity
                </Label>
                <Select
                  value={form.parity}
                  onValueChange={(v) =>
                    updateField("parity", v as "N" | "E" | "O")
                  }
                  disabled={connected}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N" className="text-xs lowercase">
                      none (n)
                    </SelectItem>
                    <SelectItem value="E" className="text-xs lowercase">
                      even (e)
                    </SelectItem>
                    <SelectItem value="O" className="text-xs lowercase">
                      odd (o)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stop bits */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  stop bits
                </Label>
                <Select
                  value={String(form.stopbits)}
                  onValueChange={(v) =>
                    updateField("stopbits", parseInt(v, 10) as 1 | 2)
                  }
                  disabled={connected}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">
                      1 bit
                    </SelectItem>
                    <SelectItem value="2" className="text-xs">
                      2 bits
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data bits */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  data bits
                </Label>
                <Select
                  value={String(form.bytesize)}
                  onValueChange={(v) =>
                    updateField("bytesize", parseInt(v, 10) as 7 | 8)
                  }
                  disabled={connected}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8" className="text-xs">
                      8 bits
                    </SelectItem>
                    <SelectItem value="7" className="text-xs">
                      7 bits
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Host */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  gateway host
                </Label>
                <Input
                  value={form.host}
                  onChange={(e) => updateField("host", e.target.value)}
                  disabled={connected}
                  placeholder="192.168.1.100"
                  className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg"
                />
              </div>

              {/* TCP Port */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  port
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={form.tcp_port}
                  onChange={(e) =>
                    updateField("tcp_port", parseInt(e.target.value, 10) || 502)
                  }
                  disabled={connected}
                  className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg"
                />
              </div>

              {/* Framing / Protocol */}
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground lowercase">
                  protocol mode
                </Label>
                <Select
                  value={form.framing}
                  onValueChange={(v) => updateField("framing", v as "tcp" | "rtu")}
                  disabled={connected}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/30 focus:bg-background rounded-lg lowercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp" className="text-xs lowercase">
                      modbus tcp (standard)
                    </SelectItem>
                    <SelectItem value="rtu" className="text-xs lowercase">
                      modbus rtu over tcp
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Slave ID */}
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground lowercase">
              {isSerial ? "slave id" : "unit id"}
            </Label>
            <Input
              type="number"
              min={1}
              max={247}
              value={form.slave_id}
              onChange={(e) =>
                updateField("slave_id", parseInt(e.target.value, 10) || 1)
              }
              disabled={connected}
              className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg"
            />
          </div>

          {/* Timeout */}
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground lowercase">
              timeout (s)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={form.timeout}
              onChange={(e) =>
                updateField("timeout", parseFloat(e.target.value) || 1.0)
              }
              disabled={connected}
              className="h-8 text-xs font-mono bg-muted/30 focus:bg-background rounded-lg"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
