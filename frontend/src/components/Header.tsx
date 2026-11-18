import { AppConfig } from "@/types/modbus";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface HeaderProps {
  config: AppConfig | null;
  wsConnected: boolean;
}

export function Header({ config }: HeaderProps) {
  const isConnected = config?.connected;
  const conn = config?.connection;
  const isTcp = conn?.conn_type === "tcp";

  let statusText = "disconnected";
  let statusSub = "interface idle";

  if (isConnected) {
    if (isTcp) {
      const mode = conn?.framing === "rtu" ? "rtu over tcp" : "modbus tcp";
      statusText = "gateway live";
      statusSub = `${conn?.host}:${conn?.tcp_port} (${mode})`;
    } else {
      const portName = conn?.port ? conn.port.split("/").pop() : "serial";
      statusText = "serial live";
      statusSub = `${portName} @ ${conn?.baudrate || 9600}`;
    }
  } else if (config?.last_error) {
    statusText = "io fault";
    statusSub = config.last_error;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand in Lumen Instrument Serif & Lowercase */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground lowercase leading-none">
                modbus <span className="lumen-verb italic">telemetry</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border lowercase">
                lumen
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono lowercase hidden sm:block mt-0.5">
              precision diagnostic & register console
            </p>
          </div>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-mono transition-all lowercase",
              isConnected
                ? "bg-primary/10 text-primary border-primary/30 shadow-xs"
                : config?.last_error
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-muted/60 text-muted-foreground border-border"
            )}
            title={config?.last_error || (isConnected ? statusSub : "disconnected")}
          >
            <div className="relative flex h-2 w-2 items-center justify-center">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  isConnected
                    ? "bg-primary"
                    : config?.last_error
                    ? "bg-destructive"
                    : "bg-muted-foreground/60"
                )}
              />
            </div>

            <div className="flex flex-col text-left leading-tight">
              <span className="font-semibold text-[11px]">{statusText}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
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
