# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# one-shot launcher (creates venv, installs deps if requirements changed, runs app)
./run.sh

# manual / dev mode with auto-reload
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# syntax check
python -m py_compile main.py modbus_client.py store.py
```

`run.sh` uses `.venv/.deps-stamp` to skip `pip install` when `requirements.txt` is unchanged — fast re-runs.

No test suite, linter, or formatter is configured. The frontend has no build step — `web/` is served as static files.

## Architecture

A web dashboard for reading/writing Modbus RTU registers over a USB-to-RS485 adapter. **Single slave per bus** is an intentional scope constraint (see README); changing this is a non-trivial refactor of `ModbusManager` and the register schema.

### Three layers, one process

1. **`modbus_client.py` — `ModbusManager`**: thin thread-safe wrapper around one `ModbusSerialClient`. All serial I/O goes through `self.lock` (a `threading.Lock`) so reads (from the WS loop) and writes (from REST handlers) serialize on the bus. `_encode`/`_decode` handle uint16/int16/uint32/int32/float32 with ABCD/CDAB word order, plus `scale`/`offset` linear transform. The manager owns no async code — callers wrap blocking calls in `asyncio.to_thread`.

2. **`main.py` — FastAPI app**: one module-level `manager` and one module-level `config` dict. REST endpoints mutate `config` and call `save_config()` (atomic write via temp file in `store.py`). The `/ws` WebSocket loop iterates `config["registers"]` every 1 s, calls `manager.read_register` via `asyncio.to_thread`, and pushes `{connected, values, errors}` to the client. Per-register errors don't break the loop — they go in the `errors` map.

3. **`web/` — vanilla SPA**: no framework, no bundler. `app.js` keeps a single `state` object, reconnects the WS with a 1.5s backoff, and renders register cards from the same schema the backend uses. Connection form changes auto-save to the backend on `change` (400 ms debounce) — explicit "Save" is only for register definitions via the modal. **Per-register history is browser-side only**: each WS tick pushes the value into `state.history[id]` (capped at `HISTORY_MAX=300` samples ≈ 5 min) and a pure-SVG sparkline (`renderSparkline`) is redrawn. There is no backend persistence for time-series — refresh = empty graphs. History is also cleared on register delete and on edit (since scale/type may have changed).

### The shared register schema

The same dict shape flows through Pydantic (`RegisterDef` in `main.py`), `config.json`, the WebSocket payload, and the JS register card builder:

```
{ id, name, type, address, data_type, word_order, scale, offset, unit }
```

`type` is one of `holding | input | coil | discrete`. For `coil`/`discrete`, the numeric fields (`data_type`, `word_order`, `scale`, `offset`) are present but ignored. The frontend hides them in the modal via `[data-show=register]`. When adding a new register type or field, update **all four** sites or things drift silently.

### Concurrency model

- Sync FastAPI endpoints run in Starlette's threadpool — safe to take the manager lock.
- The WS handler is `async` and uses `asyncio.to_thread` for every Modbus call, so it never blocks the event loop while waiting on serial.
- `config` is a plain dict mutated from multiple threads with no lock. This is safe today because mutations are coarse (replace `config["registers"]` list, append a dict) and the WS loop snapshots with `list(config["registers"])` before iterating. Don't introduce fine-grained mutations to register dicts without revisiting this.

### Config persistence

`config.json` lives next to `main.py`, is auto-created from `DEFAULT_CONFIG` on first save, and is reloaded only at process start. `store.save_config` writes atomically (tempfile + `os.replace`). The in-memory `config` dict is the source of truth at runtime.
