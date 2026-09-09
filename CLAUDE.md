# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CapMar is a web platform for connecting small entrepreneurs and project creators in Maricá with investors. Monorepo with a Next.js frontend and a FastAPI/MySQL backend.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

### Backend (`cd backend`)
FastAPI + SQLAlchemy 2.0 + Pydantic v2 on **PostgreSQL 16**. App package is `app/` (entrypoint `app.main:app`).
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # needs a Postgres reachable via DATABASE_URL (.env)
```
Tables are auto-created on startup via `Base.metadata.create_all` (MVP — migrate to Alembic later). **Gotcha:** `create_all` only creates *missing tables*; it never adds columns to existing tables. When you add a column to an existing model, also add an idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to `_SCHEMA_PATCHES` in `app/main.py` (`ensure_schema()`), or the running DB will 500 on the missing column. `app/main.py` also seeds default categories. Config (`DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`, `UPLOAD_DIR`) comes from env / `.env` via `app/config.py`.

**Auth:** JWT Bearer. `app/deps.py` exposes `get_current_user` (401 if missing) and `get_current_user_optional`. Mutating endpoints require it; projects enforce owner-only edit/delete via `owner_id`. The frontend stores the token in `localStorage` and `src/lib/api.ts` attaches `Authorization: Bearer` to every request.

**Uploads:** `POST /upload` (auth, multipart) saves images to `UPLOAD_DIR` (Docker volume `uploads`) and returns `{url: "/uploads/<name>"}`; served via `StaticFiles` mounted at `/uploads`. Frontend prefixes the API host with `mediaUrl()`.

`backend/Database Schema.txt` is the DBML source of truth (CATEGORY, PROJECT, TEAM, USERS, KEYWORDS + M2M join tables). Two typos were fixed in `models.py`: `tem_name`→`team_name`, `propose`→`purpose`.

### Docker
`docker compose up --build` (from repo root) runs all three services: `db` (postgres:16), `backend` (:8000), `frontend` (:3000, Next standalone build). Env defaults live in `.env.example` → copy to `.env`. The frontend bakes `NEXT_PUBLIC_API_URL` at **build time** (passed as a Docker build arg), so changing the API URL requires a rebuild.

## Architecture

### Route Structure
- `/` — Public landing page (`src/app/page.tsx`)
- `/home`, `/sobre`, `/ajuda` — top-level standalone pages (NOT in the `(app)` group)
- `/(app)/*` — App shell (`src/app/(app)/`, see `AppShell.tsx`) with sidebar (desktop) + bottom nav (mobile)
  - `/feed`, `/perfil`, `/projeto/[id]`, `/equipe/[id]`

### Landing Page (`src/app/_landing/`)
- `sections/` — Hero, PhoneSection, Features, CapmarShowcase, SecurityGrid, FinalCTA
- `layout/` — Navbar, Footer
- `components/` — InteractiveGrid

### Key Technical Constraints

**Next.js 16 / React 19 — read `node_modules/next/dist/docs/` before assuming API behavior.** This version has breaking changes from training data. The `frontend/AGENTS.md` file flags this explicitly.

**Framer Motion v12 WAAPI — `useTransform` ranges must always extend to `[..., 1.0]`.** When `scrollYProgress` exceeds an animation's input range, WAAPI marks the animation complete and the element reverts to its CSS fallback (opacity: 0 for FM-managed elements). Always end ranges at `1.0` with the final value repeated. This is documented in `PhoneSection.tsx:194-199`.

**Chrome compositor workarounds in `PhoneSection`:** 
- `perspective` must be on an inner div, not the `sticky` element — Chrome discards composited child layers when a sticky element with `perspective` snaps.
- `clipPath: inset(...)` is used instead of `overflow: hidden` — `overflow:hidden` creates an intermediate overflow-clip compositor layer Chrome cannot manage inside 3D-transformed parents with composited children.

### Design System (`src/app/globals.css`)
- Colors: `--primary: #421C77`, `--accent: #FF6B35`, `--secondary: #100A55`, `--background: #FFF1EB`
- Fonts: Inter (`font-sans`), Outfit (`font-heading`) — both via `next/font/google`
- Tailwind v4 with CSS-first config via `@theme inline`
- Custom utilities: `.glass`, `.font-heading`, `.text-shadow-solid`, `.perspective-distant`

### Spec-Driven Development (SDD)
The team writes specs **before** coding new features/components. Specs live in `frontend/sdd/` (`architecture/`, `features/`, `components/`), copied from `frontend/sdd/TEMPLATE.md`. Check for a relevant spec before implementing, and add/update one for non-trivial new work.

### Path Alias
`@/` → `src/` (configured in `tsconfig.json`)

### Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion v12, Three.js, Lucide React
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, PostgreSQL 16
- **Infra:** VPS KVM, Nginx + Let's Encrypt, GitHub Actions CI/CD
