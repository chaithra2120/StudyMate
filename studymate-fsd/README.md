# StudyMate — Smart Student Study Planner

A cute pastel-themed Full Stack Development micro project built with HTML, CSS, JavaScript, Node.js, Express, and MySQL.

## Features
- Dashboard with tasks, study sessions, and planned study minutes
- Create and delete timetable sessions
- Create tasks, choose priority and due date, complete/reopen tasks, and delete tasks
- Progress overview
- Focus timer with 25-minute focus, 5-minute short break, and 15-minute long break
- Create, edit, and delete subject notes
- Light/dark theme toggle (theme preference is stored in browser localStorage)
- Responsive layout for desktop and mobile

## Requirements
- Node.js LTS and npm
- MySQL Server (MySQL Workbench is optional)
- Visual Studio Code

## Setup in VS Code
1. Extract `studymate-fsd.zip`.
2. Open the extracted `studymate-fsd` folder in VS Code.
3. Open a terminal in VS Code: **Terminal → New Terminal**.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start MySQL Server.
6. Create the database and tables:
   - Open MySQL Workbench or the MySQL command-line client.
   - Open `schema.sql` and execute the complete script.
   - The script creates `studymate_db`, the tables, and a few sample rows.
7. Copy `.env.example` to a new file named `.env`.
8. Edit `.env` and enter your own MySQL username and password:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=studymate_db
   ```
   If your MySQL root account has no password, leave `DB_PASSWORD=` blank. Do not share your real password or commit `.env` to a public repository.
9. Start the website:
   ```bash
   npm start
   ```
10. Open **http://localhost:3000** in your browser. Do not open `index.html` directly; the Express server serves the website and its API.

## Useful test
Open `http://localhost:3000/api/health`. A successful connection returns:
```json
{"status":"ok","database":"connected"}
```

## Common issues
- **ECONNREFUSED:** Start the MySQL service and check `DB_HOST` and `DB_PORT`.
- **Access denied:** Correct `DB_USER` and `DB_PASSWORD` in `.env`.
- **Unknown database:** Execute `schema.sql` in MySQL.
- **Port already in use:** Change `PORT=3001` in `.env`, restart the server, and open `http://localhost:3001`.
- After changing `.env`, stop and restart `npm start`.

## Project structure
```text
studymate-fsd/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── package.json
├── schema.sql
├── server.js
└── README.md
```

## API routes
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Check server and database |
| GET, POST | `/api/tasks` | List or create tasks |
| PATCH, DELETE | `/api/tasks/:id` | Complete/reopen or delete a task |
| GET, POST | `/api/sessions` | List or create study sessions |
| DELETE | `/api/sessions/:id` | Delete a study session |
| GET, POST | `/api/notes` | List or create notes |
| PUT, DELETE | `/api/notes/:id` | Update or delete a note |
| GET | `/api/stats` | Dashboard/progress statistics |

## Notes
This is a student project starter for local demonstration. It does not include user accounts, authentication, or multi-user data isolation. Add authentication and authorization before deploying a real student-data application to the public internet.
