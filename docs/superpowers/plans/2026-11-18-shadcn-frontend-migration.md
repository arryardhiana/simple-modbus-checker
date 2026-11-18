# Frontend Migration to React + Vite + Tailwind + shadcn/ui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend of Simple Modbus Checker from vanilla HTML/JS to a modern React + TypeScript SPA powered by Vite, Tailwind CSS, and shadcn/ui, preserving all existing Modbus functionality, WebSocket streaming, sparklines, and FastAPI backend integration.

**Architecture:** A standalone `frontend/` directory managed with Vite + React + TypeScript + Tailwind CSS + shadcn/ui (Radix primitives). During development, Vite proxies `/api` and `/ws` to FastAPI (`127.0.0.1:8000`). For production/standalone runs, Vite builds to `frontend/dist`, and FastAPI's `main.py` is configured to serve `frontend/dist` as static assets.

**Tech Stack:** React 18/19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, FastAPI (Backend).

**Spec:** Preserves the shared register schema (`{ id, name, type, address, data_type, word_order, scale, offset, unit }`), WebSocket payload (`{ connected, values, errors, last_error }`), connection form auto-save debounce (400ms), and 300-point in-browser sparkline history.

## Global Constraints

- Backend Modbus I/O logic in `modbus_client.py` and endpoints in `main.py` must remain completely intact.
- WebSocket streaming protocol on `/ws` must not change.
- Existing shared register schema must be respected across all forms and dialogs.
- FastAPI must seamlessly serve the built React app from `frontend/dist` while maintaining backward compatibility with `web/` if `dist` is absent.
- The UI must support both Light and Dark modes seamlessly using shadcn's standard theme mechanism (CSS variables with `.dark` class).

---

### Task 1: Scaffold Vite + React + TypeScript Project with Tailwind CSS

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`

**Interfaces:**
- Produces: Vite development server on port 5173 with proxy to backend port 8000 for `/api` and `/ws`.

- [x] **Step 1: Initialize Vite React TypeScript in `frontend/`**
- [x] **Step 2: Install dependencies (tailwindcss, postcss, autoprefixer, clsx, tailwind-merge, lucide-react)**
- [x] **Step 3: Configure Tailwind CSS and path alias (`@/*` pointing to `./src/*`) in `vite.config.ts` and `tsconfig.json`**
- [x] **Step 4: Verify Vite build succeeds (`npm run build`)**
- [x] **Step 5: Commit scaffolding**

---

### Task 2: Install and Setup shadcn/ui Components

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/tabs.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/switch.tsx`
- Create: `frontend/src/components/ui/label.tsx`

**Interfaces:**
- Consumes: Tailwind tokens and utility helpers in `src/lib/utils.ts`.
- Produces: Reusable accessible UI component primitives for building forms and cards.

- [x] **Step 1: Configure shadcn/ui theme tokens (Zinc/Neutral palette with CSS variables in `src/index.css`)**
- [x] **Step 2: Install Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-label`, `class-variance-authority`)**
- [x] **Step 3: Add core shadcn component files to `frontend/src/components/ui/`**
- [x] **Step 4: Verify components compile without type errors (`npm run build`)**
- [x] **Step 5: Commit shadcn setup**

---

### Task 3: API Client, Types, and Real-Time WebSocket Hook

**Files:**
- Create: `frontend/src/types/modbus.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useModbus.ts`

**Interfaces:**
- Produces:
  - `ConnectionConfig`, `RegisterDef`, `RegisterValueMap`, `HistoryPoint` interfaces.
  - `api(path, opts)` wrapper handling JSON fetch calls.
  - `useModbus()` hook managing:
    - `config`: connection settings and registers list.
    - `status`: `{ connected: boolean, last_error?: string }`.
    - `values`: `{ [id: string]: number | boolean | null }`.
    - `errors`: `{ [id: string]: string }`.
    - `history`: `{ [id: string]: { t: number, v: number | boolean }[] }` (capped at 300 samples).
    - actions: `connect()`, `disconnect()`, `saveConnection(c)`, `saveRegister(r)`, `deleteRegister(id)`, `writeRegister(id, val)`.

- [x] **Step 1: Define TypeScript models matching FastAPI Pydantic schemas in `types/modbus.ts`**
- [x] **Step 2: Implement REST API helpers in `lib/api.ts`**
- [x] **Step 3: Implement `useModbus` hook with automatic WebSocket reconnection and time-series history tracking**
- [x] **Step 4: Commit types and data hooks**

---

### Task 4: Build Header, Theme Toggle, and Connection Section

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/ThemeToggle.tsx`
- Create: `frontend/src/components/ConnectionCard.tsx`

**Interfaces:**
- Consumes: `useModbus` state and handlers.
- Produces:
  - Header with title, live status badge (`Connected` / `Disconnected` / `Error`), and dark mode toggle.
  - Connection card with segmented tabs for Serial (USB / RS485) and Network (Modbus Gateway), serial port dropdown with refresh, baudrate/parity/stopbits/framing inputs, and Connect/Disconnect button.

- [x] **Step 1: Implement `ThemeToggle` with system/light/dark preference using `.dark` class**
- [x] **Step 2: Implement `Header` with real-time connection status indicator**
- [x] **Step 3: Implement `ConnectionCard` with debounced auto-save (400ms) on form changes**
- [x] **Step 4: Test switching between Serial and Network tabs and verify form bindings**
- [x] **Step 5: Commit header and connection card**

---

### Task 5: Build Register Cards, Inline SVG Sparkline, and Dialogs

**Files:**
- Create: `frontend/src/components/Sparkline.tsx`
- Create: `frontend/src/components/RegisterCard.tsx`
- Create: `frontend/src/components/RegisterDialog.tsx`
- Create: `frontend/src/components/WriteDialog.tsx`
- Create: `frontend/src/components/RegistersSection.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: Register definitions, live values, errors, history buffer.
- Produces:
  - Responsive register grid with live value display and pure-SVG sparklines.
  - Add / Edit register modal matching 4 Modbus function codes (FC01/02/03/04), scale, offset, data types, and word order.
  - Quick Write modal for holding registers and coils.

- [x] **Step 1: Implement `Sparkline` component drawing smooth SVG line & area paths for both numeric and boolean step graphs**
- [x] **Step 2: Implement `RegisterCard` displaying register name, live formatted value, engineering unit, address meta, and action buttons**
- [x] **Step 3: Implement `RegisterDialog` for adding/editing registers with conditional field visibility**
- [x] **Step 4: Implement `WriteDialog` for sending write commands to holding registers and toggling coils**
- [x] **Step 5: Assemble everything inside `App.tsx`**
- [x] **Step 6: Build frontend and verify zero TypeScript or bundle errors**
- [x] **Step 7: Commit register components**

---

### Task 6: FastAPI Backend Integration & Launcher Update

**Files:**
- Modify: `main.py:16-18,166-174`
- Modify: `run.sh`
- Modify: `AGENTS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `frontend/dist` static build output.
- Produces:
  - FastAPI serving `frontend/dist` when built, falling back gracefully to `web/` if not built.
  - `run.sh` checks for frontend build and builds it if `frontend/dist` is absent.

- [x] **Step 1: Update `main.py` to serve from `frontend/dist` if available (with fallback to `web/`)**
- [x] **Step 2: Run backend tests to ensure zero regression (`unittest discover`)**
- [x] **Step 3: Update `run.sh` to build frontend assets when needed**
- [x] **Step 4: Update `AGENTS.md` and `README.md` to document the modern frontend architecture**
- [x] **Step 5: Run full integration verification**
- [x] **Step 6: Commit and push**
