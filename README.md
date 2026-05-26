# 📡 Simple Modbus Reader

> Dashboard web minimalis untuk membaca & menulis register **Modbus RTU** lewat adapter **USB-to-RS485**. Tampilan modern ala Apple, live update tiap detik, dan grafik historical tanpa perlu database.

---

## ✨ Fitur

- ⚡ **Live values** — nilai register di-push lewat WebSocket setiap ~1 detik
- 📊 **Sparkline historical** — grafik per-register selama ~5 menit terakhir, semua di memori browser (tanpa database, reset saat refresh halaman)
- ✏️ **Read + Write** — Holding (FC03), Input (FC04), Coil (FC01), Discrete (FC02)
- 🔢 **Tipe data lengkap** — `uint16` / `int16` / `uint32` / `int32` / `float32`, dengan pilihan word order (ABCD/CDAB) dan transformasi `scale × raw + offset`
- 🎛️ **Setup dari browser** — pilih port serial, atur baud/parity/slave ID, tambah-edit-hapus register tanpa perlu edit file. Tersimpan otomatis ke `config.json`.
- 🎨 **UI ala Apple** — system font, card lembut, accent biru, modal animasi, toggle native untuk coil
- 🪶 **Zero build step** — frontend cuma HTML/CSS/JS biasa, langsung di-serve

---

## 🧰 Stack

| Layer     | Tech                                       |
| --------- | ------------------------------------------ |
| Backend   | Python · FastAPI · pymodbus · pyserial     |
| Frontend  | Vanilla HTML/CSS/JS (no framework)         |
| Transport | Modbus RTU di atas serial (USB-to-RS485)   |
| Realtime  | WebSocket                                  |

---

## 🚀 Quick Start

Satu perintah, langsung jalan:

```bash
git clone git@github.com:arryardhiana/simple-modbus-checker.git
cd simple-modbus-checker
./run.sh
```

Script `run.sh` otomatis:

1. 📦 Buat virtualenv `.venv` (kalau belum ada)
2. ⬇️ Install dependency (cuma kalau `requirements.txt` berubah — jadi run kedua dst cepat)
3. ▶️ Jalankan app dan buka browser di **<http://127.0.0.1:8000>**

Stop dengan `Ctrl+C`.

### 🛠️ Manual / Dev Mode

Kalau mau setup manual, atau butuh auto-reload waktu ngedit kode:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 📖 Cara Pakai

### 1️⃣ Connect ke device

- Pilih **Serial Port** Anda
  - Di macOS biasanya muncul sebagai `/dev/cu.usbserial-*`
  - Klik **Refresh ports** kalau adapter baru saja dicolok
- Atur **Baud rate**, **Parity**, **Stop bits**, **Slave ID** sesuai datasheet device
- Klik **Connect** — indikator status di pojok kanan atas berubah jadi hijau **● Connected**

### 2️⃣ Tambah Register

Klik **+ Add Register**, lalu isi form berikut:

| Field          | Penjelasan                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| **Name**       | Label bebas untuk Anda sendiri (mis. _"Suhu Boiler"_)                                                   |
| **Type**       | `Holding` (FC03), `Input` (FC04), `Coil` (FC01), `Discrete Input` (FC02)                                |
| **Address**    | Alamat register (0-based) dari datasheet device                                                         |
| **Data type**  | `uint16` / `int16` / `uint32` / `int32` / `float32` — tipe 32-bit memakai 2 register                    |
| **Word order** | Cuma berlaku untuk tipe 32-bit. Kalau nilai 32-bit tampak aneh, coba ganti ke **Swap (CDAB)**           |
| **Scale**      | Pengali pada nilai mentah. Contoh: sensor return `328`, set Scale `0.1` → tampil `32.8`                 |
| **Offset**     | Ditambahkan setelah scale. Contoh: raw dalam Kelvin → set Offset `-273.15` untuk tampil °C              |
| **Unit**       | Label satuan yang ditampilkan di samping nilai (mis. `V`, `A`, `°C`)                                    |

### 3️⃣ Monitoring & Kontrol

- 📈 **Nilai** dan **sparkline** update otomatis setiap detik selama koneksi aktif
- 🔴 **Border merah** = pembacaan terakhir gagal (arahkan kursor ke nilai untuk lihat pesan errornya)
- 🎚️ **Coil / Discrete** ditampilkan sebagai toggle ala iOS — klik untuk ubah ON/OFF (coil saja, discrete read-only)
- ✍️ **Holding Register** punya input angka + tombol **Write** untuk menulis nilai baru

---

## 💡 Contoh Kasus: Sensor Suhu

Misal sensor mengembalikan raw value `328` yang artinya `32.8 °C`:

| Field      | Nilai                  |
| ---------- | ---------------------- |
| Name       | `Suhu Boiler`          |
| Type       | `Holding Register`     |
| Address    | `0` (sesuai datasheet) |
| Data type  | `uint16`               |
| Scale      | `0.1`                  |
| Offset     | `0`                    |
| Unit       | `°C`                   |

➡️ Hasil tampil: **`32.8 °C`** dengan grafik kecil di bawahnya yang menunjukkan tren ~5 menit terakhir.

---

## 📁 Struktur Project

```
simple-modbus-reader/
├── run.sh              # One-shot launcher (setup + run)
├── main.py             # FastAPI app — REST endpoints + WebSocket
├── modbus_client.py    # Wrapper pymodbus, thread-safe
├── store.py            # Load/save config.json (atomic)
├── requirements.txt
├── web/                # Static UI (no build step)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── config.json         # Auto-generated waktu pertama save (gitignored)
```

---

## ⚠️ Catatan & Troubleshooting

- 🔌 **Port serial nggak muncul?** Install dulu driver USB-serial-nya — biasanya **CH340**, **FTDI**, atau **CP210x** tergantung chip di adapter Anda.
- ⚙️ **Default 8/N/1 @ 9600 baud** sudah cocok untuk mayoritas device. Kalau bus Anda pakai 8/E/1, cukup ubah **Parity** ke **Even**.
- 👤 **Satu slave per bus** — sesuai scope awal. Untuk multi-slave perlu modifikasi `slave_id` per-register dan sedikit refactor di `modbus_client.py`.
- 🧠 **Sparkline = in-memory only** — data historis hilang saat refresh halaman atau tutup tab. Kalau butuh long-term logging, perlu tambah penyimpanan ke database (mis. SQLite + tabel time-series).
- 🍎 Diuji di **macOS**; harusnya jalan juga di Linux & Windows (script `run.sh` butuh `bash` — di Windows pakai WSL atau jalankan perintah di **Manual / Dev Mode**).
