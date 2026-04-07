# 🚀 Sticky Mind Grid

A sophisticated, persistent Trello-style task management application built with a modern **React-Vite** frontend and a robust **Flask-MySQL** backend. Designed to showcase high-density data management, dynamic UI patterns, and meticulous audit logging.

---

## 🏛️ Project Architecture
Sticky Mind Grid is a full-stack solution featuring:
- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion (for smooth transitions), and `dnd-kit` for drag-and-drop.
- **Backend**: Flask 3.0, SQLAlchemy, MySQL (via PyMySQL).
- **State Management**: React Context API for persistent activity logging and board states.

---

## ✅ Core Requirement Satisfaction
This project meticulously satisfies the core "Trello-style" requirements:
- [x] Board Management: Create, edit, and delete multiple 프로젝트 boards.
- [x] Ticket Creation: Full CRUD operations for tasks, including metadata (Priority, Due Date, Progress).
- [x] Stage Transitions: Drag tickets between user-defined columns (e.g., To Do ➔ Done) with automatic progress snapping.
- [x] Persistent History: Every action is saved to a MySQL database and displayed in a real-time audit trail.

---

## ✨ High-End Features
- **Dynamic Board Insights**: The "Overview" tab automatically adapts its analytics to match the specific columns/states defined by the user.
- **Intelligent Progress Snapping**: Moving tickets automatically updates progress: 
  - First Column ➔ 0%
  - Intermediate Columns ➔ 30%/50%
  - Final Column ➔ 100%
- **Multiple Visualizations**: 
  - **Kanban Board**: Drag-and-drop interface.
  - **Task List**: Searchable, sortable tabular view.
  - **Interactive Calendar**: Plot tasks by due dates.
  - **Activity Feed**: Field-level change tracking (e.g., "Renamed Task from X ➔ Y").
- **Optimized Storage**: Uses MySQL `LONGTEXT` to support high-resolution base64 hero images for board banners.

---

## 🛠️ Setup Instructions

### 1. Backend (Flask + MySQL)
Ensure you have **Python 3.10+** and a **MySQL** server (e.g., XAMPP/phpMyAdmin) running.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configuration: Ensure your MySQL connection string in `config.py` is correct.
5. **Initial Reseeding (Recommended)**:
   This will drop all tables and populate the app with three high-density showcase boards.
   ```bash
   python seed.py
   ```
6. Run the server:
   ```bash
   python run.py
   ```

### 2. Frontend (React + Vite)
1. In the root directory, install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧭 Navigation Guide
1. **The Dashboard**: Your primary entry point. The **"🚀 Showcase: Sticky Mind Grid Core"** board is pinned to the top to demonstrate core features immediately.
2. **The Kanban Board**: Move tickets across columns to see persistent progress tracking and audit logging in the right-hand sidebar.
3. **The Overview Tab**: View real-time analytics tailored to that board's specific workflow states.
4. **Task Modal**: Double-click any task to edit descriptions, add attachments, or set due dates.
5. **The History Sidebar**: Track "Who did what and when." Every field change (Title/Priority/Status) is recorded with descriptive "X ➔ Y" logs.

---

## 👨‍💻 Developer's Note
Built as a demonstration of technical proficiency and creative UI design. Key focus areas were **data persistence**, **responsive layout adaptation**, and **low-latency state synchronization** between the React frontend and the MySQL database.

> [!TIP]
> Use the `seed.py` script to explore a "populated" world. It includes varied tasks with due dates specifically set for **April 2026** to showcase the **Calendar** functionality.
