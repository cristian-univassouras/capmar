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
```bash
# Python 3.10+ with FastAPI + Uvicorn + SQLAlchemy + MySQL
# Setup: create venv, pip install -r requirements.txt
uvicorn main:app --reload
```

## Architecture

### Route Structure
- `/` — Public landing page (`src/app/page.tsx`)
- `/(app)/*` — Authenticated app shell (`src/app/(app)/`) with sidebar (desktop) + bottom nav (mobile)
  - `/home`, `/feed`, `/perfil`, `/projeto/[id]`, `/equipe/[id]`

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

### Path Alias
`@/` → `src/` (configured in `tsconfig.json`)

### Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion v12, Three.js, Lucide React
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pydantic, MySQL
- **Infra:** VPS KVM, Nginx + Let's Encrypt, GitHub Actions CI/CD
