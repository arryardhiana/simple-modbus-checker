import struct
from threading import Lock
from typing import Optional, Tuple

from pymodbus.client import ModbusSerialClient
from pymodbus.exceptions import ModbusException


class ModbusManager:
    """Thread-safe wrapper around a single ModbusSerialClient (one slave on the bus)."""

    def __init__(self) -> None:
        self.client: Optional[ModbusSerialClient] = None
        self.lock = Lock()
        self.slave_id: int = 1
        self.connected: bool = False
        self.last_error: Optional[str] = None

    # --- connection ---
    def connect(self, conn_cfg: dict) -> Tuple[bool, str]:
        with self.lock:
            self._disconnect_unlocked()
            try:
                self.client = ModbusSerialClient(
                    port=conn_cfg["port"],
                    baudrate=int(conn_cfg["baudrate"]),
                    parity=str(conn_cfg["parity"]),
                    stopbits=int(conn_cfg["stopbits"]),
                    bytesize=int(conn_cfg["bytesize"]),
                    timeout=float(conn_cfg["timeout"]),
                )
                if not self.client.connect():
                    self.client = None
                    self.connected = False
                    msg = f"Failed to open port {conn_cfg['port']}"
                    self.last_error = msg
                    return False, msg
                self.slave_id = int(conn_cfg["slave_id"])
                self.connected = True
                self.last_error = None
                return True, "Connected"
            except Exception as e:
                self.client = None
                self.connected = False
                self.last_error = str(e)
                return False, str(e)

    def disconnect(self) -> None:
        with self.lock:
            self._disconnect_unlocked()

    def _disconnect_unlocked(self) -> None:
        if self.client is not None:
            try:
                self.client.close()
            except Exception:
                pass
        self.client = None
        self.connected = False

    # --- read ---
    def read_register(self, reg: dict):
        if not self.connected or self.client is None:
            raise RuntimeError("Not connected")
        rtype = reg["type"]
        addr = int(reg["address"])

        with self.lock:
            if rtype == "coil":
                rr = self.client.read_coils(address=addr, count=1, slave=self.slave_id)
                self._check(rr)
                return bool(rr.bits[0])

            if rtype == "discrete":
                rr = self.client.read_discrete_inputs(address=addr, count=1, slave=self.slave_id)
                self._check(rr)
                return bool(rr.bits[0])

            dt = reg.get("data_type", "uint16")
            count = 2 if dt in ("uint32", "int32", "float32") else 1
            if rtype == "holding":
                rr = self.client.read_holding_registers(address=addr, count=count, slave=self.slave_id)
            elif rtype == "input":
                rr = self.client.read_input_registers(address=addr, count=count, slave=self.slave_id)
            else:
                raise ValueError(f"Unknown register type: {rtype}")
            self._check(rr)
            raw = self._decode(rr.registers, dt, reg.get("word_order", "big"))
            scale = float(reg.get("scale", 1.0))
            offset = float(reg.get("offset", 0.0))
            return raw * scale + offset

    # --- write ---
    def write_register(self, reg: dict, value) -> None:
        if not self.connected or self.client is None:
            raise RuntimeError("Not connected")
        rtype = reg["type"]
        addr = int(reg["address"])

        with self.lock:
            if rtype == "coil":
                rr = self.client.write_coil(address=addr, value=bool(value), slave=self.slave_id)
            elif rtype == "holding":
                dt = reg.get("data_type", "uint16")
                scale = float(reg.get("scale", 1.0)) or 1.0
                offset = float(reg.get("offset", 0.0))
                raw = (float(value) - offset) / scale
                regs = self._encode(raw, dt, reg.get("word_order", "big"))
                if len(regs) == 1:
                    rr = self.client.write_register(address=addr, value=regs[0], slave=self.slave_id)
                else:
                    rr = self.client.write_registers(address=addr, values=regs, slave=self.slave_id)
            else:
                raise ValueError(f"Cannot write to register type: {rtype}")
            self._check(rr)

    # --- helpers ---
    @staticmethod
    def _check(rr) -> None:
        if rr is None or rr.isError():
            raise ModbusException(str(rr))

    @staticmethod
    def _decode(regs, dt: str, word_order: str):
        if dt == "uint16":
            return regs[0] & 0xFFFF
        if dt == "int16":
            v = regs[0] & 0xFFFF
            return v - 0x10000 if v & 0x8000 else v

        hi, lo = (regs[0], regs[1]) if word_order == "big" else (regs[1], regs[0])
        packed = struct.pack(">HH", hi & 0xFFFF, lo & 0xFFFF)
        if dt == "uint32":
            return struct.unpack(">I", packed)[0]
        if dt == "int32":
            return struct.unpack(">i", packed)[0]
        if dt == "float32":
            return struct.unpack(">f", packed)[0]
        raise ValueError(f"Unknown data_type: {dt}")

    @staticmethod
    def _encode(value, dt: str, word_order: str):
        if dt == "uint16":
            return [int(value) & 0xFFFF]
        if dt == "int16":
            iv = int(value)
            if iv < 0:
                iv += 0x10000
            return [iv & 0xFFFF]

        if dt == "uint32":
            packed = struct.pack(">I", int(value) & 0xFFFFFFFF)
        elif dt == "int32":
            packed = struct.pack(">i", int(value))
        elif dt == "float32":
            packed = struct.pack(">f", float(value))
        else:
            raise ValueError(f"Unknown data_type: {dt}")
        hi, lo = struct.unpack(">HH", packed)
        return [hi, lo] if word_order == "big" else [lo, hi]
