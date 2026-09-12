# Smart College Management System

A production-style, full-stack digital platform for students, faculty and college administration — one system for notices, academic updates, lost & found, fee/results links, WhatsApp group requests, timetable management and a server-side "5-minutes-before-class" reminder for faculty.

This is a real working application: React + TypeScript frontend, Node/Express + TypeScript backend, PostgreSQL via Prisma, JWT authentication (httpOnly cookies), and backend-enforced role-based access control. Nothing here is a mock — every button calls a real API against a real database.

---

## 1. Project Overview

Three roles, three experiences, one platform:

- **Student** — self-registers, views notices/academic updates, browses Lost & Found, pays fees / checks results via admin-configured links, requests WhatsApp group invites, gets notifications.
- **Faculty** — created only by an Admin. Views their timetable, gets an automatic in-app reminder 5 minutes before each class, manages Lost & Found posts, views notices/updates, browses students.
- **Admin** — full control: student/faculty management, timetable CRUD + conflict detection, notice/academic-update publishing, Lost & Found moderation, WhatsApp group + request approval, fee/results link configuration, CSV & timetable-photo import, and audit logs.

## 2. Architecture

```
smart-college-management-system/
├── frontend/         React + TypeScript + Vite + Tailwind CSS
├── backend/          Node + Express + TypeScript REST API
├── prisma/           schema.prisma, migrations, seed.ts (shared by backend)
├── uploads/           notice attachments, lost & found photos, timetable photos
├── import-templates/  downloadable CSV templates for admin bulk import
├── .env.example
└── package.json       convenience scripts that run frontend+backend together
```

The frontend never talks to the database directly — every action goes through the Express REST API, which is the only thing with a Prisma client and a database connection. All authorization is enforced **again** on the backend, independent of what the frontend UI shows or hides.

## 3. Technology Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide icons |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Validation | Zod (backend), matching form validation (frontend) |
| Scheduler | node-cron (server-side, timezone-aware) |
| OCR | tesseract.js (real OCR, admin always reviews/corrects before saving) |
| CSV import | csv-parse |
| File uploads | multer, with MIME/extension/size validation |

## 4. Installation

Prerequisites: Node.js 20+, npm, and a PostgreSQL 14+ server (local or cloud).

```bash
git clone <this-repo>
cd smart-college-management-system
npm run install:all      # installs root, backend and frontend dependencies
```

## 5. PostgreSQL Setup

You need a running PostgreSQL server and a database for this app.

**Option A — local PostgreSQL**
```sql
-- in psql, connected as a superuser
CREATE DATABASE smart_college;
```

**Option B — Docker**
```bash
docker run --name smart-college-db -e POSTGRES_PASSWORD=DevPassword123! -p 5432:5432 -d postgres:16
```

**Option C — free cloud Postgres** (Neon, Supabase, Railway, etc.) — create a database and copy its connection string.

## 6. Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string — never reuse the example value in production |
| `PORT` | Backend port (default `4000`) |
| `FRONTEND_URL` | Used for CORS (default `http://localhost:5173`) |
| `COLLEGE_TIMEZONE` | IANA timezone, e.g. `Asia/Kolkata` — the reminder scheduler runs in this timezone |
| `UPLOAD_DIR` | Where uploaded files are stored (default `../uploads`) |
| `MAX_UPLOAD_MB` | Max upload size in MB |
| `EMAIL_*` | Optional — not required for core functionality; leave blank |

The `.env` file lives at the **project root** (not inside `backend/`) and is read by the backend via a relative path — this keeps one source of truth for both the API and Prisma CLI commands.

## 7. Prisma Setup

The Prisma schema lives at `prisma/schema.prisma` (shared, not duplicated into `backend/`). All Prisma commands are run from `backend/` with `--schema=../prisma/schema.prisma` (already wired into the npm scripts below).

```bash
npm run prisma:generate     # generate the Prisma client
```

## 8. Database Migration

```bash
npm run prisma:migrate      # creates the initial migration and applies it
```

This creates every table described in `prisma/schema.prisma`: users, students, faculty, admins, departments, subjects, rooms, blocks, notices, academic updates, lost & found items, timetable entries, class reminders, notifications, settings, WhatsApp groups/requests, audit logs, and import batches.

## 9. Seed the Database

```bash
npm run seed
```

Creates development-only demo data: 1 admin, 3 faculty, 5 students, sample notices/academic updates/lost & found posts, a sample timetable, and two WhatsApp groups. **These credentials are for local development only — never use them in production.**

```
Admin:    admin@smartcollege.dev     / Admin@12345
Faculty:  faculty1@smartcollege.dev  / Faculty@12345   (also faculty2, faculty3)
Student:  student1@smartcollege.dev  / Student@12345   (also student2..student5)
```

## 10. Start the Backend

```bash
npm run dev:backend
```

Starts the Express API on `http://localhost:4000` and starts the server-side reminder scheduler (logged on boot).

## 11. Start the Frontend

```bash
npm run dev:frontend
```

Starts the Vite dev server on `http://localhost:5173`, proxying `/api`, `/uploads` and `/import-templates` to the backend.

Or run both together from the project root:

```bash
npm run dev
```

Then open `http://localhost:5173`.

## 12. Import Student Data

Admin → **Data Import** → *Import Students* tab. Upload a CSV with columns:

```
name,student_id,email,phone,department,year,section
```

A template is downloadable from the same page (`import-templates/students.csv`). Temporary passwords are generated automatically, hashed before storage, never logged, and each imported account is flagged to require a password change on first login.

## 13. Import Faculty Data

Admin → **Data Import** → *Import Faculty* tab. CSV columns:

```
name,faculty_id,email,phone,department,designation
```

Same temporary-password behavior as student import.

## 14. Import Timetable Data

Two ways, both under Admin → **Timetable Import**:

- **CSV**: columns `faculty_id,subject,department,year,section,day,start_time,end_time,room,block`. Conflicts (faculty double-booked, room double-booked) are rejected per-row with the row number and reason.
- **Photo (OCR)**: upload a photo of a printed/handwritten timetable. The backend runs real OCR (tesseract.js) and returns best-effort extracted rows. **Nothing is saved automatically** — the admin reviews and corrects every field (faculty, subject, department, room, block, day, time) in the UI, then explicitly confirms before anything is written to the database.

## 15. Upload Timetable Images

Same flow as #14 (photo import) — `Admin → Timetable Import → Timetable Photo` tab.

## 16. Configure Timezone

Set `COLLEGE_TIMEZONE` in `.env` (IANA name, e.g. `Asia/Kolkata`, `America/New_York`). The reminder scheduler always evaluates "5 minutes before class" in this timezone, regardless of the server's own system timezone.

## 17. Run the Reminder Scheduler

It starts automatically with the backend (`npm run dev:backend` / production `npm start`) — see `backend/src/jobs/reminder.scheduler.ts`. It runs every minute via `node-cron`, checks every active timetable entry for today, and — exactly once per class per day, enforced by a database unique constraint — creates an in-app notification for the assigned faculty member 5 minutes before the class starts.

## 18. Production Deployment

1. Set `NODE_ENV=production` and a strong, unique `JWT_SECRET`.
2. Point `DATABASE_URL` at your production PostgreSQL instance.
3. `npm run prisma:deploy` to apply migrations (does not prompt, safe for CI/CD).
4. `npm run build:backend` then `npm start` (from `backend/`) to run the compiled server.
5. `npm run build:frontend` and serve `frontend/dist/` behind a static host or reverse proxy (e.g. Nginx), proxying `/api` and `/uploads` to the backend.
6. Serve the app over HTTPS — cookies are marked `secure` automatically when `NODE_ENV=production`.
7. Point `FRONTEND_URL` at your real deployed frontend origin (used for CORS).
8. Create the real Admin account via the seed script (edited with production-appropriate values) or a one-off script — **never** expose admin creation through a public endpoint.

## 19. Security Considerations

- Passwords are hashed with bcrypt (12 rounds); plaintext passwords are never stored, logged, or returned by any API response.
- JWTs are stored in httpOnly, `sameSite=lax` cookies — never accessible to page JavaScript.
- Every protected endpoint independently re-verifies authentication and role via backend middleware (`authenticate` + `requireRole`) — the frontend hiding a menu item is a UX nicety only, never the security boundary.
- Student registration always assigns `role = STUDENT` server-side; the client-supplied `role` field (if any) is ignored by the validator schema.
- Faculty accounts can only be created/edited by an Admin; there is no public faculty signup.
- Admin accounts are never created through public registration — only via the seed script or an existing admin.
- File uploads are validated by MIME type, extension, and size; dangerous extensions (`.exe`, `.bat`, `.sh`, etc.) are always rejected regardless of declared MIME type.
- Rate limiting is applied globally, with a stricter limit on `/api/auth/*`.
- `helmet` sets secure HTTP headers; CORS is restricted to `FRONTEND_URL` with credentials.
- All database access goes through Prisma's parameterized queries — no raw SQL string concatenation.
- Sensitive admin actions (user create/update/deactivate, notice/timetable/WhatsApp changes, etc.) are recorded in an append-only `AuditLog`, viewable only by Admins.

## 20. Testing

```bash
npm run test:backend
```

- **Unit tests** (no database required): password hashing, JWT sign/verify, RBAC middleware, the 5-minute reminder time math, timetable overlap detection, and the student-registration validator (confirms a client-supplied `role` is always stripped).
- **Integration tests** (require a reachable `DATABASE_URL`): full registration → login → RBAC-enforced route access flow, and timetable conflict detection + duplicate-reminder prevention against the real database.

## API Reference

All endpoints are namespaced under `/api`. See `backend/src/routes/` for the exact list; every route file documents its own role requirements via `requireRole(...)`.

## License

Built for the requesting institution. No license is implied for redistribution.
