const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

const state = {
  config: { connection: {}, registers: [], connected: false },
  ws: null,
  wsReconnectTimer: null,
  editingId: null,
  writingId: null,
  history: {}, // id -> [{ t, v }]
};

const FC_LABEL = { holding: "FC03", input: "FC04", coil: "FC01", discrete: "FC02" };
const HISTORY_MAX = 300; // ~5 minutes at 1Hz
const SPARK_W = 100;
const SPARK_H = 30;
const SPARK_PAD = 1;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {}
    throw new Error(detail);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// --- connection form ---
async function loadConfig() {
  state.config = await api("/api/config");
  fillConnectionForm(state.config.connection);
  setStatus(state.config.connected, state.config.last_error);
  renderRegisters();
}

async function loadPorts() {
  let ports = [];
  try {
    ports = await api("/api/ports");
  } catch (e) {
    console.warn("port enumeration failed", e);
  }
  const sel = $("#port-select");
  const current = state.config?.connection?.port || "";
  sel.innerHTML = "";

  if (ports.length === 0) {
    const opt = new Option("(no serial ports detected)", "");
    sel.add(opt);
  } else {
    for (const p of ports) {
      const text = p.description && p.description !== "n/a"
        ? `${p.device} — ${p.description}`
        : p.device;
      sel.add(new Option(text, p.device));
    }
  }

  if (current && ![...sel.options].some((o) => o.value === current)) {
    sel.add(new Option(`${current} (saved)`, current));
  }
  if (current) sel.value = current;
}

function fillConnectionForm(c) {
  const f = $("#conn-form").elements;
  if (c.baudrate != null) f.baudrate.value = String(c.baudrate);
  if (c.parity) f.parity.value = c.parity;
  if (c.stopbits != null) f.stopbits.value = String(c.stopbits);
  if (c.bytesize != null) f.bytesize.value = String(c.bytesize);
  if (c.slave_id != null) f.slave_id.value = String(c.slave_id);
  if (c.timeout != null) f.timeout.value = String(c.timeout);
}

function readConnectionForm() {
  const f = $("#conn-form").elements;
  return {
    port: $("#port-select").value,
    baudrate: parseInt(f.baudrate.value, 10),
    parity: f.parity.value,
    stopbits: parseInt(f.stopbits.value, 10),
    bytesize: parseInt(f.bytesize.value, 10),
    slave_id: parseInt(f.slave_id.value, 10),
    timeout: parseFloat(f.timeout.value),
  };
}

function setStatus(connected, errorMsg) {
  const el = $("#status");
  el.classList.remove("connected", "disconnected", "error");
  if (connected) {
    el.classList.add("connected");
    $("#status-text").textContent = "Connected";
    el.title = "";
  } else if (errorMsg) {
    el.classList.add("error");
    $("#status-text").textContent = "Error";
    el.title = errorMsg;
  } else {
    el.classList.add("disconnected");
    $("#status-text").textContent = "Disconnected";
    el.title = "";
  }
  $("#toggle-connect").textContent = connected ? "Disconnect" : "Connect";
}

async function toggleConnect() {
  const btn = $("#toggle-connect");
  btn.disabled = true;
  try {
    if (state.config.connected) {
      await api("/api/disconnect", { method: "POST" });
      state.config.connected = false;
      setStatus(false);
    } else {
      const conn = readConnectionForm();
      if (!conn.port) {
        alert("Please select a serial port.");
        return;
      }
      await api("/api/connection", { method: "POST", body: JSON.stringify(conn) });
      const res = await api("/api/connect", { method: "POST" });
      if (!res.ok) {
        setStatus(false, res.message);
        alert("Connect failed: " + res.message);
      } else {
        state.config.connected = true;
        setStatus(true);
      }
    }
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
  }
}

// --- registers list ---
function renderRegisters() {
  const grid = $("#registers");
  const regs = state.config.registers || [];
  if (regs.length === 0) {
    grid.innerHTML = '<p class="muted">No registers yet — click "Add Register" to begin.</p>';
    return;
  }
  grid.innerHTML = "";
  for (const r of regs) {
    const card = buildRegisterCard(r);
    grid.appendChild(card);
    renderSparklineFor(r, card);
  }
}

function renderSparklineFor(reg, card) {
  const svg = card.querySelector(".spark");
  if (!svg) return;
  const isBool = reg.type === "coil" || reg.type === "discrete";
  renderSparkline(svg, state.history[reg.id] || [], isBool);
}

function appendHistory(id, value) {
  let buf = state.history[id];
  if (!buf) buf = state.history[id] = [];
  buf.push({ t: Date.now(), v: value });
  if (buf.length > HISTORY_MAX) buf.splice(0, buf.length - HISTORY_MAX);
}

function renderSparkline(svgEl, points, isBoolean) {
  if (points.length < 2) {
    svgEl.innerHTML = "";
    return;
  }
  const values = points.map((p) => (isBoolean ? (p.v ? 1 : 0) : Number(p.v)));
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) {
    svgEl.innerHTML = "";
    return;
  }
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) { min -= 0.5; max += 0.5; }

  const innerW = SPARK_W - 2 * SPARK_PAD;
  const innerH = SPARK_H - 2 * SPARK_PAD;
  const xAt = (i) => SPARK_PAD + (i / (values.length - 1)) * innerW;
  const yAt = (v) => SPARK_H - SPARK_PAD - ((v - min) / (max - min)) * innerH;

  let d = "";
  if (isBoolean) {
    for (let i = 0; i < values.length; i++) {
      const x = xAt(i).toFixed(2);
      const y = yAt(values[i]).toFixed(2);
      if (i === 0) d += `M${x} ${y}`;
      else d += `L${x} ${yAt(values[i - 1]).toFixed(2)}L${x} ${y}`;
    }
  } else {
    for (let i = 0; i < values.length; i++) {
      const x = xAt(i).toFixed(2);
      const y = yAt(values[i]).toFixed(2);
      d += i === 0 ? `M${x} ${y}` : `L${x} ${y}`;
    }
  }
  const baseY = (SPARK_H - SPARK_PAD).toFixed(2);
  const area = `${d}L${xAt(values.length - 1).toFixed(2)} ${baseY}L${xAt(0).toFixed(2)} ${baseY}Z`;

  svgEl.innerHTML =
    `<path d="${area}" class="spark-area"/>` +
    `<path d="${d}" class="spark-line"/>`;
}

function buildRegisterCard(r) {
  const card = document.createElement("div");
  card.className = "reg";
  card.dataset.id = r.id;

  const writable = r.type === "holding" || r.type === "coil";
  if (writable) card.classList.add("writable");
  const fc = FC_LABEL[r.type] || "";
  const isBit = r.type === "coil" || r.type === "discrete";

  card.innerHTML = `
    <div class="actions-row">
      ${writable ? '<button class="btn-write" data-act="open-write" type="button" title="Write to register">⚡ Write</button>' : ""}
      <button class="icon-btn" data-act="edit" title="Edit" aria-label="Edit">✎</button>
      <button class="icon-btn" data-act="del" title="Delete" aria-label="Delete">✕</button>
    </div>
    <div class="name"></div>
    <div class="value"><span class="v">—</span><span class="unit"></span></div>
    <div class="meta"></div>
    <svg class="spark" viewBox="0 0 ${SPARK_W} ${SPARK_H}" preserveAspectRatio="none" aria-hidden="true"></svg>
  `;
  card.querySelector(".name").textContent = r.name;
  card.querySelector(".unit").textContent = r.unit || "";
  card.querySelector(".meta").textContent =
    `${fc} · addr ${r.address}` + (isBit ? "" : ` · ${r.data_type}`);

  card.querySelector('[data-act="edit"]').addEventListener("click", () => openModal(r));
  card.querySelector('[data-act="del"]').addEventListener("click", () => deleteRegister(r.id));
  if (writable) {
    card.querySelector('[data-act="open-write"]').addEventListener("click", () => openWriteModal(r));
  }
  return card;
}

function updateRegisterValue(id, value, error) {
  const card = $(`.reg[data-id="${id}"]`);
  let textVal = "—";
  if (!error && value != null) {
    if (typeof value === "boolean") {
      textVal = value ? "ON" : "OFF";
    } else if (typeof value === "number") {
      textVal = formatNumber(value);
    } else {
      textVal = String(value);
    }
  }

  if (card) {
    const v = card.querySelector(".value .v");
    if (error) {
      card.classList.add("error");
      v.textContent = "—";
      v.title = error;
    } else {
      card.classList.remove("error");
      v.title = "";
      v.textContent = textVal;
    }
  }

  // Update write modal current value in real-time if this register is being edited
  if (state.writingId === id) {
    const writeValEl = $("#write-current-val");
    if (writeValEl) {
      const reg = state.config.registers.find((r) => r.id === id);
      const unit = reg?.unit ? ` ${reg.unit}` : "";
      writeValEl.textContent = error ? "Error" : `${textVal}${unit}`;
    }
  }
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(4).replace(/\.?0+$/, "");
}

async function deleteRegister(id) {
  const reg = state.config.registers.find((r) => r.id === id);
  if (!confirm(`Delete register "${reg?.name || id}"?`)) return;
  try {
    await api(`/api/registers/${id}`, { method: "DELETE" });
    state.config.registers = state.config.registers.filter((r) => r.id !== id);
    delete state.history[id];
    renderRegisters();
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
}

async function writeValue(id, value) {
  await api(`/api/registers/${id}/write`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

// --- write modal ---
function openWriteModal(reg) {
  state.writingId = reg.id;
  $("#write-modal-title").textContent = `Write: ${reg.name}`;

  const isCoil = reg.type === "coil";
  const dt = reg.data_type || "uint16";
  const is32Bit = dt === "uint32" || dt === "int32" || dt === "float32";

  if (isCoil) {
    $("#write-modal-subtitle").textContent = `Coil · Address ${reg.address} · FC05 (Write Single Coil)`;
    $("#write-input-label").style.display = "none";
    $("#write-coil-container").style.display = "flex";
    $("#write-submit-btn").textContent = "Send (FC05)";

    const history = state.history[reg.id];
    const lastVal = history && history.length > 0 ? history[history.length - 1].v : false;
    $("#write-coil-toggle").checked = Boolean(lastVal);
  } else {
    const fcLabel = is32Bit ? "FC16 (Write Multiple Registers)" : "FC06 (Write Single Register)";
    $("#write-modal-subtitle").textContent = `Holding Register · Address ${reg.address} · ${dt} · ${fcLabel}`;
    $("#write-input-label").style.display = "flex";
    $("#write-coil-container").style.display = "none";
    $("#write-submit-btn").textContent = is32Bit ? "Send (FC16)" : "Send (FC06)";

    const input = $("#write-input-val");
    input.value = "";
    input.step = (reg.scale && reg.scale < 1) ? String(reg.scale) : "any";
    setTimeout(() => input.focus(), 50);
  }

  // Set current value
  const history = state.history[reg.id];
  const last = history && history.length > 0 ? history[history.length - 1].v : null;
  const unit = reg.unit ? ` ${reg.unit}` : "";
  if (last != null) {
    const displayVal = typeof last === "boolean" ? (last ? "ON" : "OFF") : formatNumber(last);
    $("#write-current-val").textContent = `${displayVal}${unit}`;
  } else {
    $("#write-current-val").textContent = "—";
  }

  $("#write-modal").classList.remove("hidden");
}

function closeWriteModal() {
  $("#write-modal").classList.add("hidden");
  state.writingId = null;
}

async function handleWriteSubmit(e) {
  e.preventDefault();
  if (!state.writingId) return;

  const reg = state.config.registers.find((r) => r.id === state.writingId);
  if (!reg) return;

  let value;
  if (reg.type === "coil") {
    value = $("#write-coil-toggle").checked;
  } else {
    value = parseFloat($("#write-input-val").value);
    if (Number.isNaN(value)) {
      alert("Please enter a valid number.");
      return;
    }
  }

  const btn = $("#write-submit-btn");
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    await writeValue(reg.id, value);
    closeWriteModal();
  } catch (err) {
    alert("Write failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// --- modal ---
function openModal(reg) {
  state.editingId = reg?.id || null;
  $("#modal-title").textContent = reg ? "Edit Register" : "Add Register";
  const f = $("#reg-form").elements;
  $("#reg-form").reset();
  if (reg) {
    f.name.value = reg.name;
    f.type.value = reg.type;
    f.address.value = reg.address;
    f.data_type.value = reg.data_type || "uint16";
    f.word_order.value = reg.word_order || "big";
    f.scale.value = reg.scale ?? 1;
    f.offset.value = reg.offset ?? 0;
    f.unit.value = reg.unit || "";
  }
  applyTypeVisibility();
  $("#modal").classList.remove("hidden");
  setTimeout(() => f.name.focus(), 50);
}

function closeModal() {
  $("#modal").classList.add("hidden");
  state.editingId = null;
}

function applyTypeVisibility() {
  const t = $("#reg-form").elements.type.value;
  const isRegister = t === "holding" || t === "input";
  $$("#reg-form [data-show=register]").forEach((el) => {
    el.style.display = isRegister ? "" : "none";
  });
}

async function saveRegister(ev) {
  ev.preventDefault();
  const f = $("#reg-form").elements;
  const data = {
    name: f.name.value.trim(),
    type: f.type.value,
    address: parseInt(f.address.value, 10),
    data_type: f.data_type.value,
    word_order: f.word_order.value,
    scale: parseFloat(f.scale.value) || 0,
    offset: parseFloat(f.offset.value) || 0,
    unit: f.unit.value.trim(),
  };
  if (!data.name) { alert("Name is required."); return; }
  if (data.scale === 0) data.scale = 1;

  try {
    let saved;
    if (state.editingId) {
      saved = await api(`/api/registers/${state.editingId}`, {
        method: "PUT", body: JSON.stringify(data),
      });
      const idx = state.config.registers.findIndex((r) => r.id === state.editingId);
      if (idx >= 0) state.config.registers[idx] = saved;
      delete state.history[state.editingId]; // scale/type may have changed; start fresh
    } else {
      saved = await api(`/api/registers`, {
        method: "POST", body: JSON.stringify(data),
      });
      state.config.registers.push(saved);
    }
    renderRegisters();
    closeModal();
  } catch (e) {
    alert("Save failed: " + e.message);
  }
}

// --- websocket ---
function connectWS() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);
  state.ws = ws;

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (state.config.connected !== msg.connected) {
      state.config.connected = msg.connected;
      setStatus(msg.connected);
    }
    for (const r of state.config.registers) {
      if (msg.errors && msg.errors[r.id]) {
        updateRegisterValue(r.id, null, msg.errors[r.id]);
      } else if (msg.values && r.id in msg.values) {
        const v = msg.values[r.id];
        appendHistory(r.id, v);
        updateRegisterValue(r.id, v, null);
        const card = $(`.reg[data-id="${r.id}"]`);
        if (card) renderSparklineFor(r, card);
      }
    }
  };
  ws.onclose = () => {
    state.ws = null;
    clearTimeout(state.wsReconnectTimer);
    state.wsReconnectTimer = setTimeout(connectWS, 1500);
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
}

// --- persist connection form on change ---
let saveConnTimer = null;
function scheduleSaveConnection() {
  clearTimeout(saveConnTimer);
  saveConnTimer = setTimeout(async () => {
    try {
      const conn = readConnectionForm();
      if (!conn.port) return;
      await api("/api/connection", { method: "POST", body: JSON.stringify(conn) });
    } catch {}
  }, 400);
}

// --- init ---
window.addEventListener("DOMContentLoaded", async () => {
  $("#refresh-ports").addEventListener("click", loadPorts);
  $("#toggle-connect").addEventListener("click", toggleConnect);
  $("#add-reg").addEventListener("click", () => openModal());
  $("#modal-cancel").addEventListener("click", closeModal);
  $("#reg-form").addEventListener("submit", saveRegister);
  $("#reg-form").elements.type.addEventListener("change", applyTypeVisibility);
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });

  $("#write-modal-cancel").addEventListener("click", closeWriteModal);
  $("#write-form").addEventListener("submit", handleWriteSubmit);
  $("#write-modal").addEventListener("click", (e) => {
    if (e.target.id === "write-modal") closeWriteModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("#modal").classList.contains("hidden")) closeModal();
      if (!$("#write-modal").classList.contains("hidden")) closeWriteModal();
    }
  });
  $("#conn-form").addEventListener("change", scheduleSaveConnection);

  await loadConfig();
  await loadPorts();
  connectWS();
});
