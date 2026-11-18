import { AppConfig } from "@/types/modbus";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { Activity, Radio } from "lucide-react";

interface HeaderProps {
  config: AppConfig | null;
  wsConnected: boolean;
}

export function Header({ config, wsConnected }: HeaderProps) {
  const isConnected = config?.connected;
  const conn = config?.connection;
  const isTcp = conn?.conn_type === "tcp";

  let statusText = "Disconnected";
  let statusSub = "Modbus interface idle";

  if (isConnected) {
    if (isTcp) {
      const mode = conn?.framing === "rtu" ? "RTU over TCP" : "Standard TCP";
      statusText = `Gateway Connected`;
      statusSub = `${conn?.host}:${conn?.tcp_port} (${mode})`;
    } else {
      const portName = conn?.port ? conn.port.split("/").pop() : "Serial";
      statusText = `Serial Connected`;
      statusSub = `${portName} @ ${conn?.baudrate || 9600} baud`;
    }
  } else if (config?.last_error) {
    statusText = `Connection Error`;
    statusSub = config.last_error;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Modbus Checker
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                v1.2
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Real-time RTU / TCP Diagnostic Dashboard
            </p>
          </div>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all",
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs"
                : config?.last_error
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-muted/60 text-muted-foreground border-border"
            )}
            title={config?.last_error || (isConnected ? statusSub : "Disconnected")}
          >
            <div className="relative flex h-2.5 w-2.5 items-center justify-center">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  isConnected
                    ? "bg-emerald-500"
                    : config?.last_error
                    ? "bg-destructive"
                    : "bg-muted-foreground/60"
                )}
              />
            </div>

            <div className="flex flex-col text-left leading-tight">
              <span className="font-semibold text-[11px]">{statusText}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                {statusSub}
              </span>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
