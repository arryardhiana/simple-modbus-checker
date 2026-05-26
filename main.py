import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from serial.tools import list_ports

from modbus_client import ModbusManager
from store import load_config, save_config

ROOT = Path(__file__).parent
WEB_DIR = ROOT / "web"

manager = ModbusManager()
config = load_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    manager.disconnect()


app = FastAPI(title="Simple Modbus Reader", lifespan=lifespan)


# --- schemas ---
class ConnectionConfig(BaseModel):
    port: str
    baudrate: int = 9600
    parity: Literal["N", "E", "O"] = "N"
    stopbits: Literal[1, 2] = 1
    bytesize: Literal[7, 8] = 8
    timeout: float = Field(1.0, gt=0)
    slave_id: int = Field(1, ge=1, le=247)


class RegisterDef(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    type: Literal["holding", "input", "coil", "discrete"]
    address: int = Field(..., ge=0, le=65535)
    data_type: Literal["uint16", "int16", "uint32", "int32", "float32"] = "uint16"
    word_order: Literal["big", "little"] = "big"
    scale: float = 1.0
    offset: float = 0.0
    unit: str = ""


class WriteRequest(BaseModel):
    value: Any


# --- REST endpoints ---
@app.get("/api/ports")
def get_ports():
    return [
        {"device": p.device, "description": p.description or ""}
        for p in list_ports.comports()
    ]


@app.get("/api/config")
def get_config():
    return {
        **config,
        "connected": manager.connected,
        "last_error": manager.last_error,
    }


@app.post("/api/connection")
def set_connection(conn: ConnectionConfig):
    config["connection"] = conn.model_dump()
    save_config(config)
    return {"ok": True}


@app.post("/api/connect")
def connect():
    ok, msg = manager.connect(config["connection"])
    return {"ok": ok, "message": msg, "connected": manager.connected}


@app.post("/api/disconnect")
def disconnect():
    manager.disconnect()
    return {"ok": True, "connected": manager.connected}


@app.post("/api/registers")
def add_register(reg: RegisterDef):
    new = {"id": uuid.uuid4().hex[:8], **reg.model_dump()}
    config["registers"].append(new)
    save_config(config)
    return new


@app.put("/api/registers/{rid}")
def update_register(rid: str, reg: RegisterDef):
    for i, r in enumerate(config["registers"]):
        if r["id"] == rid:
            updated = {"id": rid, **reg.model_dump()}
            config["registers"][i] = updated
            save_config(config)
            return updated
    raise HTTPException(status_code=404, detail="Register not found")


@app.delete("/api/registers/{rid}")
def delete_register(rid: str):
    before = len(config["registers"])
    config["registers"] = [r for r in config["registers"] if r["id"] != rid]
    if len(config["registers"]) == before:
        raise HTTPException(status_code=404, detail="Register not found")
    save_config(config)
    return {"ok": True}


@app.post("/api/registers/{rid}/write")
def write_value(rid: str, req: WriteRequest):
    reg = next((r for r in config["registers"] if r["id"] == rid), None)
    if reg is None:
        raise HTTPException(status_code=404, detail="Register not found")
    try:
        manager.write_register(reg, req.value)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- WebSocket: push live values ~1Hz ---
@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload: dict = {
                "connected": manager.connected,
                "values": {},
                "errors": {},
            }
            if manager.connected:
                for reg in list(config["registers"]):
                    try:
                        v = await asyncio.to_thread(manager.read_register, reg)
                        payload["values"][reg["id"]] = v
                    except Exception as e:
                        payload["errors"][reg["id"]] = str(e)
            await websocket.send_json(payload)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return
    except Exception:
        return


# --- static UI ---
@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


if __name__ == "__main__":
    import threading
    import webbrowser

    import uvicorn

    url = "http://127.0.0.1:8000"
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
