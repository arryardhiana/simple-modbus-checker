# AGENTS.md

This file provides architectural context, commands, and conventions for AI coding agents (Antigravity, Claude Code, Cursor, Codex, OpenCode, Aider, etc.) working on this repository.

## Overview

**Simple Modbus Checker** is a lightweight web dashboard for reading and writing Modbus registers over a USB-to-RS485 adapter (Serial RTU) or a Modbus Gateway (Ethernet / TCP).

## Commands

```bash
# One-shot launcher (creates venv, installs deps if requirements changed, runs app)
./run.sh

# Manual / dev mode with auto-reload
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Tests & syntax check
python -m unittest discover -p "test_*.py"
python -m py_compile main.py modbus_client.py store.py test_modbus_tcp.py
```

*Note on `run.sh`:* Uses `.venv/.deps-stamp` to skip `pip install` when `requirements.txt` is unchanged for fast re-runs.
The frontend has no build step — `web/` is served directly as static files.

## Architecture

Three layers within a single process:

1. **`modbus_client.py` — `ModbusManager`**:
   - Thin, thread-safe wrapper around `ModbusSerialClient` or `ModbusTcpClient` (Modbus TCP standard or Modbus RTU over TCP encapsulation).
   - All I/O passes through `self.lock` (`threading.Lock`) so background reads (from the WebSocket loop) and user writes (from REST handlers) serialize cleanly on the physical connection.
   - `_encode` / `_decode` handle `uint16`, `int16`, `uint32`, `int32`, `float32` with `ABCD` / `CDAB` word orders, plus `scale` and `offset` linear transformation:
     $$\text{display\_value} = (\text{raw} \times \text{scale}) + \text{offset}$$
   - The manager owns no async code — async callers wrap blocking calls in `asyncio.to_thread`.

2. **`main.py` — FastAPI Application**:
   - Holds one module-level `manager` and one module-level `config` dictionary.
   - REST endpoints mutate `config` and trigger `save_config()` (atomic file write via temporary file in `store.py`).
   - The `/ws` WebSocket loop iterates over `config["registers"]` every 1 second, invokes `manager.read_register` via `asyncio.to_thread`, and broadcasts `{ connected, values, errors }` to connected clients.
   - Per-register read errors do not break the loop; they populate the `errors` map.

3. **`web/` — Vanilla SPA Frontend**:
   - Zero-framework, zero-bundler: raw HTML, CSS, and ES6+ JavaScript.
   - `app.js` maintains a single `state` object, reconnects WebSocket with 1.5s backoff, and renders register cards according to the shared schema.
   - Connection form edits auto-save to the backend on `change` (debounced at 400ms). Explicit "Save" is only required for register definitions via modal dialog.
   - **Time-series history is browser-side only**: each WebSocket tick pushes the value to `state.history[id]` (capped at `HISTORY_MAX = 300` samples $\approx$ 5 minutes), redrawing an inline pure-SVG sparkline (`renderSparkline`). There is no backend time-series database.

## Shared Register Schema

The identical dictionary shape flows through Pydantic (`RegisterDef` in `main.py`), `config.json`, the WebSocket payload, and the client register card builder:

```json
{
  "id": "reg_123",
  "name": "Line Voltage",
  "type": "holding",
  "address": 0,
  "data_type": "uint16",
  "word_order": "big",
  "scale": 0.1,
  "offset": 0,
  "unit": "V"
}
```

- `type` is one of: `holding` (FC03/FC06), `input` (FC04), `coil` (FC01/FC05), or `discrete` (FC02).
- For `coil` and `discrete`, numeric fields (`data_type`, `word_order`, `scale`, `offset`) are present in the model but ignored. The frontend modal hides them via `[data-show="register"]`.
- When adding or altering register attributes, update all four locations: Pydantic model (`main.py`), default config, WebSocket serializer, and `app.js`.

## Concurrency Model

- Synchronous FastAPI endpoints execute in Starlette's threadpool; taking `manager.lock` is safe.
- The WebSocket handler is `async` and uses `asyncio.to_thread` for all Modbus I/O to avoid blocking the event loop while waiting on serial timeouts.
- `config` is a plain dict mutated across threads without a lock. This is safe because mutations are coarse (replacing `config["registers"]` or setting fields) and the WebSocket loop takes a snapshot with `list(config["registers"])` before iterating. Avoid fine-grained in-place mutations of register dicts.

## Config Persistence

- `config.json` resides alongside `main.py`.
- Created automatically from `DEFAULT_CONFIG` on initial start or first save.
- `store.save_config()` writes atomically via `tempfile` and `os.replace`.
- Runtime truth is the in-memory `config` dictionary.
