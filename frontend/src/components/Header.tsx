import { AppConfig } from "@/types/modbus";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  config: AppConfig | null;
  wsConnected: boolean;
}

export function Header({ config, wsConnected }: HeaderProps) {
  const isConnected = config?.connected;
  const conn = config?.connection;
  const isTcp = conn?.conn_type === "tcp";

  let statusText = "Disconnected";
  if (isConnected) {
    if (isTcp) {
      const mode = conn?.framing === "rtu" ? "RTU" : "TCP";
      statusText = `Connected: Gateway (${conn?.host}:${conn?.tcp_port} [${mode}])`;
    } else {
      const portName = conn?.port ? conn.port.split("/").pop() : "Serial";
      statusText = `Connected: USB (${portName})`;
    }
  } else if (config?.last_error) {
    statusText = `Error: ${config.last_error}`;
  }

  return (
    <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            Modbus Reader
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Instrumentation and diagnostic console
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border transition-all",
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : config?.last_error
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-muted text-muted-foreground border-border"
            )}
            title={config?.last_error || (isConnected ? "Modbus connection active" : "Disconnected")}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected
                  ? "bg-emerald-500 animate-pulse"
                  : config?.last_error
                  ? "bg-destructive"
                  : "bg-muted-foreground/60"
              )}
            />
            <span className="truncate max-w-[200px] sm:max-w-xs">{statusText}</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
