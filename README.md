# Simple Modbus Reader

A minimalist web-based dashboard to read (and write) Modbus RTU registers via a USB-to-RS485 adapter. Single slave, live updates via WebSocket, Apple-style UI.

## Features

- **Live values** pushed over WebSocket every ~1 second
- **Read + write** support: Holding (FC03), Input (FC04), Coils (FC01), Discrete Inputs (FC02)
- **Data types** `uint16` / `int16` / `uint32` / `int32` / `float32` with selectable word order (ABCD / CDAB) and linear `scale` / `offset` transform
- **Configure entirely from the browser** — pick the serial port, set baud/parity/slave ID, add/edit/remove register definitions. Settings persist to `config.json`.
- **Clean Apple-style UI** — system fonts, soft cards, Apple-blue accent, animated modal, native-feeling toggle for coils
- **Zero build step** on the frontend — plain HTML/CSS/JS served as static files

## Stack

- **Backend:** Python + FastAPI + pymodbus + pyserial
- **Frontend:** single-page vanilla HTML/CSS/JS
- **Transport:** Modbus RTU over serial (USB-to-RS485)

## Setup

```bash
git clone git@github.com:arryardhiana/simple-modbus-checker.git
cd simple-modbus-checker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

The browser opens automatically at <http://127.0.0.1:8000>. Stop with `Ctrl+C`.

To run without auto-opening the browser (or for development with auto-reload):

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Using it

1. **Connection** — pick your USB-to-RS485 port (on macOS it shows up as `/dev/cu.usbserial-*`), set baud rate / parity / slave ID, then click **Connect**.
2. **Add Register** — click the button, fill in:
   - **Type:** Holding (FC03), Input (FC04), Coil (FC01), Discrete (FC02)
   - **Address:** 0-based register address
   - **Data type** (for registers): `uint16` / `int16` / `uint32` / `int32` / `float32`
   - **Word order** (for 32-bit): `Big (ABCD)` or `Swap (CDAB)` — check your device manual
   - **Scale / Offset:** displayed value = raw × scale + offset
   - **Unit:** display label only (V, A, °C, …)
3. **Write** — Holding registers show a number input + Write button; Coils show an Apple-style toggle.

Live values update once per second while connected. A red border around a register means the last read failed (hover the value for the error).

## Project layout

```
simple-modbus-reader/
├── main.py             # FastAPI app — REST endpoints + WebSocket
├── modbus_client.py    # Thread-safe pymodbus wrapper, encode/decode
├── store.py            # Atomic config.json load/save
├── requirements.txt
├── web/                # Static UI (no build step)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── config.json         # Auto-created on first save (gitignored)
```

## Notes

- macOS USB-serial adapters typically need a driver (CH340, FTDI, CP210x) — install from the chip vendor if your adapter doesn't enumerate.
- The default RTU framing is 8/N/1 at 9600 baud, which works for the majority of devices. If your bus uses 8/E/1, change Parity to **Even**.
- One slave per bus by design. To support multiple slaves later, change `slave_id` per register and tweak `modbus_client.py`.
