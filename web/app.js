const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

const state = {
  config: { connection: {}, registers: [], connected: false },
  ws: null,
  wsReconnectTimer: null,
  editingId: null,
};

const FC_LABEL = { holding: "FC03", input: "FC04", coil: "FC01", discrete: "FC02" };

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
  for (const r of regs) grid.appendChild(buildRegisterCard(r));
}

function buildRegisterCard(r) {
  const card = document.createElement("div");
  card.className = "reg";
  card.dataset.id = r.id;

  const writable = r.type === "holding" || r.type === "coil";
  const fc = FC_LABEL[r.type] || "";
  const isBit = r.type === "coil" || r.type === "discrete";

  card.innerHTML = `
    <div class="actions-row">
      <button class="icon-btn" data-act="edit" title="Edit" aria-label="Edit">✎</button>
      <button class="icon-btn" data-act="del" title="Delete" aria-label="Delete">✕</button>
    </div>
    <div class="name"></div>
    <div class="value"><span class="v">—</span><span class="unit"></span></div>
    <div class="meta"></div>
    ${writable ? buildWriteRow(r) : ""}
  `;
  card.querySelector(".name").textContent = r.name;
  card.querySelector(".unit").textContent = r.unit || "";
  card.querySelector(".meta").textContent =
    `${fc} · addr ${r.address}` + (isBit ? "" : ` · ${r.data_type}`);

  card.querySelector('[data-act="edit"]').addEventListener("click", () => openModal(r));
  card.querySelector('[data-act="del"]').addEventListener("click", () => deleteRegister(r.id));

  if (writable) {
    if (r.type === "coil") {
      const toggle = card.querySelector(".toggle");
      toggle.addEventListener("change", () => writeValue(r.id, toggle.checked));
    } else {
      const btn = card.querySelector('[data-act="write"]');
      const input = card.querySelector('input[type="number"]');
      const submit = () => {
        const v = parseFloat(input.value);
        if (Number.isNaN(v)) { alert("Enter a number first."); return; }
        writeValue(r.id, v);
      };
      btn.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    }
  }
  return card;
}

function buildWriteRow(r) {
  if (r.type === "coil") {
    return `<div class="write-row"><input type="checkbox" class="toggle" aria-label="Set coil" /></div>`;
  }
  return `<div class="write-row">
    <input type="number" step="any" placeholder="Write value…" />
    <button class="btn btn-ghost" data-act="write" type="button">Write</button>
  </div>`;
}

function updateRegisterValue(id, value, error) {
  const card = $(`.reg[data-id="${id}"]`);
  if (!card) return;
  const v = card.querySelector(".value .v");
  if (error) {
    card.classList.add("error");
    v.textContent = "—";
    v.title = error;
    return;
  }
  card.classList.remove("error");
  v.title = "";
  if (typeof value === "boolean") {
    v.textContent = value ? "ON" : "OFF";
    const toggle = card.querySelector(".toggle");
    if (toggle && document.activeElement !== toggle) toggle.checked = value;
  } else if (typeof value === "number") {
    v.textContent = formatNumber(value);
  } else {
    v.textContent = String(value);
  }
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toString();
  const abs = Math.abs(n);
  const decimals = abs < 1 ? 4 : abs < 100 ? 3 : 2;
  return n.toFixed(decimals);
}

async function deleteRegister(id) {
  const reg = state.config.registers.find((r) => r.id === id);
  if (!confirm(`Delete register "${reg?.name || id}"?`)) return;
  try {
    await api(`/api/registers/${id}`, { method: "DELETE" });
    state.config.registers = state.config.registers.filter((r) => r.id !== id);
    renderRegisters();
  } catch (e) {
    alert("Delete failed: " + e.message);
  }
}

async function writeValue(id, value) {
  try {
    await api(`/api/registers/${id}/write`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    alert("Write failed: " + e.message);
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
        updateRegisterValue(r.id, msg.values[r.id], null);
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) closeModal();
  });
  $("#conn-form").addEventListener("change", scheduleSaveConnection);

  await loadConfig();
  await loadPorts();
  connectWS();
});
