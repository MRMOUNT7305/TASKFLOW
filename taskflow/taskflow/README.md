# TaskFlow - Task Management App

A fully responsive task management web app. No server required — runs entirely in the browser.

## How to Run
Just open `index.html` in any modern browser. That's it.

## Demo Accounts
| Email             | Password  | Role   |
|-------------------|-----------|--------|
| admin@demo.com    | admin123  | Admin  |
| user@demo.com     | user123   | Member |

You can also register a new account from the login screen.

## Features
- **Authentication** — Login, register, persistent session via localStorage (keeps you signed in after refresh)
- **Kanban Board** — 3 columns: To Do, In Progress, Done
- **List View** — Inline status change and quick-complete toggle
- **CRUD Tasks** — Create, edit, delete tasks with title, description, priority, status, tag, due date, assignee
- **Filters** — Filter by priority (High/Medium/Low) and status; live search
- **Stats** — Real-time counts and overall progress bar
- **Responsive** — Mobile-friendly with collapsible sidebar
- **Persistent** — All data saved to localStorage

## File Structure
```
taskflow/
├── index.html       # App shell & all screens
├── css/
│   └── style.css    # All styles (dark theme, responsive)
├── js/
│   └── app.js       # All logic (auth, CRUD, filters, render)
└── README.md
```
