import json
import os
import tempfile
from copy import deepcopy
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "connection": {
        "port": "",
        "baudrate": 9600,
        "parity": "N",
        "stopbits": 1,
        "bytesize": 8,
        "timeout": 1.0,
        "slave_id": 1,
    },
    "registers": [],
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        return deepcopy(DEFAULT_CONFIG)
    try:
        with CONFIG_PATH.open() as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return deepcopy(DEFAULT_CONFIG)

    for k, v in DEFAULT_CONFIG.items():
        data.setdefault(k, deepcopy(v))
    for k, v in DEFAULT_CONFIG["connection"].items():
        data["connection"].setdefault(k, v)
    return data


def save_config(data: dict) -> None:
    fd, tmp = tempfile.mkstemp(dir=str(CONFIG_PATH.parent), prefix=".cfg_", suffix=".json")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, CONFIG_PATH)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
