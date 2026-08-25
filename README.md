# Sticky Mind Grid

A full-stack Trello-style task management application with a **React/Vite** frontend and **Flask/MySQL** backend. Features kanban drag-and-drop, multiple views, real-time collaboration, role-based access control, file uploads, and activity auditing.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data models, API routes, services |
| [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | Current feature status, technical debt, testing status |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Development roadmap prioritized by need |
| [`AGENTS.md`](AGENTS.md) | AI agent development guide and conventions |

---

## Setup

### Backend (Flask + MySQL)

Requires **Python 3.10+** and a **MySQL** server.

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Configure MySQL connection in config.py or set DATABASE_URL env var

# Seed database with sample data (drops existing tables)
python seed.py

# Start dev server
python run.py                # http://127.0.0.1:5000
```

### Frontend (React + Vite)

```bash
npm install
npm run dev                  # http://localhost:8080
```

Set `VITE_API_BASE_URL` in `.env` (defaults to `http://127.0.0.1:5000/api`).

### Testing

```bash
# Frontend
npm run test                 # Vitest single run
npm run test:watch           # Vitest watch mode
npx tsc --noEmit             # Type checking

# Backend
cd backend
pytest tests -v
```

---

## Quick Start

1. Open the dashboard — your boards are displayed as cards with hero images
2. Open a board — switch between Kanban, List, Calendar, Documents, and Overview views
3. Drag tasks between columns — progress auto-snaps (0% → 30% → 100%)
4. Check the Activity sidebar — every change is logged with "who did what and when"
5. Use `seed.py` to populate sample data — includes tasks with due dates set for **April 2026** to showcase the Calendar
