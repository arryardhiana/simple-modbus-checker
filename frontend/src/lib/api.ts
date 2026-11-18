import { AppConfig, ConnectionConfig, RegisterDef, SerialPortInfo } from "@/types/modbus";

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
    ...opts,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (res.text() as unknown as T);
}

export const modbusApi = {
  getConfig: () => api<AppConfig>("/api/config"),
  getPorts: () => api<SerialPortInfo[]>("/api/ports"),
  saveConnection: (data: ConnectionConfig) =>
    api<{ ok: boolean; connection: ConnectionConfig }>("/api/connection", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  connect: () =>
    api<{ ok: boolean; message?: string }>("/api/connect", {
      method: "POST",
    }),
  disconnect: () =>
    api<{ ok: boolean }>("/api/disconnect", {
      method: "POST",
    }),
  saveRegister: (reg: Omit<RegisterDef, "id">, id?: string) => {
    if (id) {
      return api<RegisterDef>(`/api/registers/${id}`, {
        method: "PUT",
        body: JSON.stringify(reg),
      });
    }
    return api<RegisterDef>("/api/registers", {
      method: "POST",
      body: JSON.stringify(reg),
    });
  },
  deleteRegister: (id: string) =>
    api<{ ok: boolean }>(`/api/registers/${id}`, {
      method: "DELETE",
    }),
  writeRegister: (id: string, value: unknown) =>
    api<{ ok: boolean; message?: string }>(`/api/registers/${id}/write`, {
      method: "POST",
      body: JSON.stringify({ value }),
    }),
};
