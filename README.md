# Setlistic

แอปจัดการเพลงและเซ็ตลิสต์สำหรับนักดนตรี ทำงานแบบ offline บนเครื่องเดียว ไม่มีระบบ login ไม่มี cloud
ข้อมูลทั้งหมดเก็บในไฟล์ SQLite บนเครื่อง

Electron 44 · TypeScript · Vite (electron-vite) · React 19 · Tailwind 4 · better-sqlite3 · dnd-kit

## ฟีเจอร์

- **หลายวง**: แต่ละวงมีคลังเพลง เซ็ตลิสต์ และรายชื่อสมาชิกพร้อมตำแหน่งเครื่องดนตรีของตัวเอง (สมาชิกเป็นแค่ชื่อ ไม่มีบัญชี)
- **คลังเพลง**: ชื่อ, ศิลปิน, คีย์, BPM, ความยาว, ลิงก์ YouTube, ลิงก์คอร์ด, สถานะ (พร้อมเล่น/กำลังแกะ/ไอเดีย), แท็ก, เนื้อเพลง/คอร์ด, โน้ตย่อ
  - ค้นหาตามชื่อหรือศิลปิน กรองตามคีย์และสถานะ
  - โน้ตรายเครื่องดนตรีของสมาชิกแต่ละคน พร้อมลิงก์ Tab
- **เซ็ตลิสต์**: นัดซ้อมหรืองานโชว์ พร้อมวันที่ เวลา และสถานที่
  - ลากวาง หรือกดลูกศรขึ้น-ลงเพื่อจัดลำดับ, ใส่เพลงเดิมซ้ำได้ (encore)
  - เปลี่ยนคีย์เฉพาะงาน และใส่โน้ตต่อเพลง
  - เวลารวมโดยประมาณ (บอกจำนวนเพลงที่ยังไม่ใส่ความยาว)
  - สถานะการซ้อมรายสมาชิกรายเพลง (คลิกชื่อเพื่อเปลี่ยน)
- **แชร์ให้วง**: Copy for LINE (ข้อความสรุปพร้อมลิงก์ YouTube และคอร์ดของทุกเพลง), ส่งเข้า LINE,
  และ YouTube Playlist ที่เล่นทุกเพลงต่อกันตามลำดับเซ็ต
- โหมดมืด/สว่างสำหรับเวที, คีย์ลัด `Ctrl+N` (เพิ่มเพลง) และ `Ctrl+F` (ค้นหา)

## เริ่มใช้งาน

```bash
npm install         # postinstall จะ build better-sqlite3 ให้ตรงกับ Electron อัตโนมัติ
npm run dev         # เปิดแอปพร้อม hot reload
npm run build:win   # สร้างตัวติดตั้งสำหรับ Windows
```

ไฟล์ฐานข้อมูลอยู่ที่ `%APPDATA%\setlistic\setlistic.db` (macOS: `~/Library/Application Support/setlistic/`)

## โครงสร้าง

```
src/
├── shared/                   ใช้ร่วมกันทั้ง 3 process
│   ├── types.ts              Band, Member, Song, Setlist, ค่าคงที่และป้ายภาษาไทย
│   ├── ipc.ts                SetlisticApi = สัญญา IPC ทั้งหมด (type-safe)
│   ├── lineSummary.ts        สร้างข้อความสรุปสำหรับ LINE
│   ├── youtube.ts            แยก video id + สร้าง playlist
│   └── format.ts             แปลงเวลา 4:05 <-> วินาที
├── main/                     Electron main process
│   ├── index.ts              สร้างหน้าต่าง, เปิดฐานข้อมูล, ตั้งค่าความปลอดภัย
│   ├── ipc.ts                ตรวจข้อมูลจาก renderer ด้วย zod แล้วเรียก repository
│   └── db/
│       ├── connection.ts     เปิด SQLite (WAL, foreign_keys = ON)
│       ├── migrations.ts     schema แบบมีเวอร์ชัน (PRAGMA user_version)
│       ├── bandRepository.ts
│       ├── songRepository.ts
│       └── setlistRepository.ts
├── preload/index.ts          สร้าง window.setlistic จาก SetlisticApi
└── renderer/src/             React UI (ไม่มีสิทธิ์เข้าถึง Node)
    ├── App.tsx               เลือกวง + แท็บ เซ็ตลิสต์ / เพลง / วง & สมาชิก
    ├── components/           SetlistsPage, SetlistItems, SongLibrary, SongForm,
    │                         InstrumentNotes, BandPage, ui, links, toast
    ├── hooks/useAsync.ts
    └── lib/theme.ts
```

## Database schema (v2)

```
bands ─┬─< members
       ├─< songs ────┬─< instrument_notes >── members (SET NULL เมื่อสมาชิกถูกลบ)
       │             │
       └─< setlists ─┴─< setlist_songs ─< practice_progress >── members
```

| ตาราง | ใช้เก็บ |
|---|---|
| `bands` | ชื่อวง |
| `members` | ชื่อสมาชิก + เครื่องดนตรี (JSON array) |
| `songs` | ข้อมูลเพลง + `youtube_url`, `chord_url`, `status`, `tags` (JSON array) |
| `instrument_notes` | โน้ต/ลิงก์ Tab ต่อเพลง ต่อสมาชิก ต่อเครื่องดนตรี |
| `setlists` | เซ็ตลิสต์ + `event_date`, `event_time` |
| `setlist_songs` | ความสัมพันธ์แบบ many-to-many ที่มีลำดับ, `key_override`, `note` (มี `id` ของตัวเองจึงใส่เพลงซ้ำได้) |
| `practice_progress` | สถานะซ้อมต่อ (เพลงในเซ็ต, สมาชิก) ถ้าไม่มีแถวแปลว่า "ยังไม่เริ่ม" |

- ลบวงแล้วข้อมูลทุกอย่างของวงหายตาม (`ON DELETE CASCADE`), ลบเพลงแล้วเพลงหายจากทุกเซ็ตลิสต์
- อัปเดตจาก schema v1 อัตโนมัติ ข้อมูลเดิมจะย้ายเข้าวงชื่อ "วงของฉัน"
- เพิ่ม/แก้ schema: เพิ่ม SQL ต่อท้าย `MIGRATIONS` ใน `migrations.ts` ห้ามแก้ migration เก่าที่ปล่อยไปแล้ว

## IPC: เพิ่ม method ใหม่

1. เพิ่ม signature ใน `SetlisticApi` และชื่อใน `API_METHODS` (`src/shared/ipc.ts`)
2. TypeScript จะ error ที่ `createHandlers` ใน `src/main/ipc.ts` จนกว่าจะเขียน handler พร้อม zod validation
3. preload สร้างฟังก์ชันให้อัตโนมัติ renderer เรียกได้ทันทีผ่าน `window.setlistic.<ns>.<method>()`

## ความปลอดภัย

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`
- รับ IPC เฉพาะจากหน้าหลักของแอป
- ข้อมูลทุกชิ้นจาก renderer ผ่าน zod ก่อนเข้าฐานข้อมูล SQL ใช้ prepared statement ทั้งหมด
  และตรวจว่าเพลง/สมาชิกที่อ้างถึงอยู่ในวงเดียวกัน
- ลิงก์เพลงรับเฉพาะ http(s), `system.openExternal` เปิดได้เฉพาะ https และลิงก์ทั้งหมดเปิดใน browser ของระบบ
- CSP ไม่ให้โหลดอะไรจากเน็ต

## ข้อจำกัดเทียบกับเวอร์ชันเว็บ (SetList)

- ไม่มีลิงก์สาธารณะให้คนนอกเปิดดู เพราะต้องมี server ใช้ข้อความ LINE (มีลิงก์ YouTube/คอร์ด/playlist ครบ) แทน
- สถานะการซ้อมอยู่ในเครื่องที่ใช้แอป สมาชิกคนอื่นไม่เห็นแบบ real-time (แนบสถานะไปกับข้อความ LINE ได้)
- YouTube Playlist ใช้ลิงก์ `watch_videos` ซึ่ง YouTube ไม่ได้ประกาศอย่างเป็นทางการ สูงสุด 50 เพลง

## หมายเหตุ

ถ้ารันแล้วเจอ `Cannot read properties of undefined (reading 'isPackaged')` แปลว่ามีตัวแปร
`ELECTRON_RUN_AS_NODE=1` ค้างอยู่ใน environment ให้ลบออกก่อนรัน
