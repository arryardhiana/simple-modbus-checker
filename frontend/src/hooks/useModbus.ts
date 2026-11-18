import { useState, useEffect, useRef, useCallback } from "react";
import { AppConfig, ConnectionConfig, HistoryPoint, RegisterDef, SerialPortInfo, WebSocketMessage } from "@/types/modbus";
import { modbusApi } from "@/lib/api";

const HISTORY_MAX = 300;

export function useModbus() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [values, setValues] = useState<Record<string, number | boolean | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Load Initial Config
  const loadConfig = useCallback(async () => {
    try {
      const data = await modbusApi.getConfig();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load config", err);
    }
  }, []);

  // Load Ports
  const loadPorts = useCallback(async () => {
    try {
      const data = await modbusApi.getPorts();
      setPorts(data);
    } catch (err) {
      console.warn("Failed to load ports", err);
    }
  }, []);

  // Connect / Disconnect Modbus
  const toggleConnect = useCallback(async () => {
    if (!config) return;
    setIsConnecting(true);
    try {
      if (config.connected) {
        await modbusApi.disconnect();
        setConfig((prev) => (prev ? { ...prev, connected: false } : null));
      } else {
        await modbusApi.saveConnection(config.connection);
        const res = await modbusApi.connect();
        if (!res.ok) {
          alert("Connect failed: " + res.message);
          setConfig((prev) => (prev ? { ...prev, connected: false, last_error: res.message } : null));
        } else {
          setConfig((prev) => (prev ? { ...prev, connected: true, last_error: undefined } : null));
        }
      }
    } catch (err: any) {
      alert(err.message || "Connection error");
    } finally {
      setIsConnecting(false);
    }
  }, [config]);

  // Save Connection Config
  const saveConnection = useCallback(async (newConn: ConnectionConfig) => {
    setConfig((prev) => (prev ? { ...prev, connection: newConn } : null));
    try {
      await modbusApi.saveConnection(newConn);
    } catch (err) {
      console.error("Failed to save connection config", err);
    }
  }, []);

  // Save Register (Add or Edit)
  const saveRegister = useCallback(
    async (regData: Omit<RegisterDef, "id">, id?: string) => {
      try {
        const saved = await modbusApi.saveRegister(regData, id);
        // Clear history on edit
        if (id) {
          setHistory((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }
        await loadConfig();
        return saved;
      } catch (err: any) {
        alert(err.message || "Failed to save register");
        throw err;
      }
    },
    [loadConfig]
  );

  // Delete Register
  const deleteRegister = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this register?")) return;
      try {
        await modbusApi.deleteRegister(id);
        setHistory((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        await loadConfig();
      } catch (err: any) {
        alert(err.message || "Failed to delete register");
      }
    },
    [loadConfig]
  );

  // Write Register Value
  const writeRegister = useCallback(async (id: string, value: unknown) => {
    try {
      const res = await modbusApi.writeRegister(id, value);
      if (!res.ok) {
        throw new Error(res.message || "Write failed");
      }
      return res;
    } catch (err: any) {
      alert(err.message || "Failed to write value");
      throw err;
    }
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      // In dev with vite proxy, ws://localhost:5173/ws is proxied to backend
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setConfig((prev) => (prev ? { ...prev, connected: msg.connected, last_error: msg.last_error } : null));
          setValues(msg.values || {});
          setErrors(msg.errors || {});

          // Append to history
          const now = Date.now();
          setHistory((prevHistory) => {
            const nextHistory = { ...prevHistory };
            for (const [id, val] of Object.entries(msg.values || {})) {
              if (val != null) {
                const buf = nextHistory[id] ? [...nextHistory[id]] : [];
                buf.push({ t: now, v: val });
                if (buf.length > HISTORY_MAX) {
                  buf.splice(0, buf.length - HISTORY_MAX);
                }
                nextHistory[id] = buf;
              }
            }
            return nextHistory;
          });
        } catch (e) {
          console.error("WS message parse error", e);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setWsConnected(false);
        wsRef.current = null;
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    loadConfig();
    loadPorts();
  }, [loadConfig, loadPorts]);

  return {
    config,
    ports,
    values,
    errors,
    history,
    wsConnected,
    isConnecting,
    loadPorts,
    saveConnection,
    toggleConnect,
    saveRegister,
    deleteRegister,
    writeRegister,
  };
}
