export type ConnType = "serial" | "tcp";
export type Parity = "N" | "E" | "O";
export type StopBits = 1 | 2;
export type ByteSize = 7 | 8;
export type Framing = "tcp" | "rtu";

export interface ConnectionConfig {
  conn_type: ConnType;
  port: string;
  baudrate: number;
  parity: Parity;
  stopbits: StopBits;
  bytesize: ByteSize;
  host: string;
  tcp_port: number;
  framing: Framing;
  timeout: number;
  slave_id: number;
}

export type RegisterType = "holding" | "input" | "coil" | "discrete";
export type DataType = "uint16" | "int16" | "uint32" | "int32" | "float32";
export type WordOrder = "big" | "little";

export interface RegisterDef {
  id: string;
  name: string;
  type: RegisterType;
  address: number;
  data_type: DataType;
  word_order: WordOrder;
  scale: number;
  offset: number;
  unit: string;
}

export interface SerialPortInfo {
  device: string;
  description: string;
  hwid?: string;
}

export interface AppConfig {
  connection: ConnectionConfig;
  registers: RegisterDef[];
  connected: boolean;
  last_error?: string;
}

export interface HistoryPoint {
  t: number;
  v: number | boolean;
}

export interface WebSocketMessage {
  connected: boolean;
  values: Record<string, number | boolean | null>;
  errors: Record<string, string>;
  last_error?: string;
}
