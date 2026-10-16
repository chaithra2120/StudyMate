
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const webpush = require("web-push");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "studymate_db",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:you@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const clean = value => String(value ?? "").trim();
const validDate = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// HEALTH CHECK
app.get("/api/health", asyncRoute(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
}));

// TASKS
app.get("/api/tasks", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM tasks ORDER BY completed ASC, due_date IS NULL, due_date ASC, id DESC"
  );
  res.json(rows);
}));

app.post("/api/tasks", asyncRoute(async (req, res) => {
  const title = clean(req.body.title);
  const subject = clean(req.body.subject);
  const dueDate = req.body.due_date || null;
  const priority = req.body.priority || "Medium";

  if (!title || !subject) {
    return res.status(400).json({
      error: "Task title and subject are required."
    });
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    return res.status(400).json({ error: "Choose a valid priority." });
  }

  if (!validDate(dueDate)) {
    return res.status(400).json({ error: "Use a valid due date." });
  }

  const [result] = await pool.execute(
    "INSERT INTO tasks (title, subject, due_date, priority) VALUES (?, ?, ?, ?)",
    [title, subject, dueDate, priority]
  );

  const [rows] = await pool.execute(
    "SELECT * FROM tasks WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json(rows[0]);
}));

app.patch("/api/tasks/:id", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  if (typeof req.body.completed !== "boolean") {
    return res.status(400).json({
      error: "Completed must be true or false."
    });
  }

  const [result] = await pool.execute(
    "UPDATE tasks SET completed = ? WHERE id = ?",
    [req.body.completed, id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: "Task not found." });
  }

  const [rows] = await pool.execute(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );

  res.json(rows[0]);
}));

app.delete("/api/tasks/:id", asyncRoute(async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM tasks WHERE id = ?",
    [Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: "Task not found." });
  }

  res.json({ message: "Task deleted." });
}));

// STUDY SESSIONS
app.get("/api/sessions", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM study_sessions ORDER BY session_date ASC, start_time ASC"
  );
  res.json(rows);
}));

app.post("/api/sessions", asyncRoute(async (req, res) => {
  const subject = clean(req.body.subject);
  const date = clean(req.body.session_date);
  const time = clean(req.body.start_time);
  const duration = Number(req.body.duration_minutes);

  if (
    !subject ||
    !validDate(date) ||
    !date ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 600
  ) {
    return res.status(400).json({
      error: "Enter a subject, valid date/time, and duration between 5 and 600 minutes."
    });
  }

  const [result] = await pool.execute(
    "INSERT INTO study_sessions (subject, session_date, start_time, duration_minutes) VALUES (?, ?, ?, ?)",
    [subject, date, time, duration]
  );

  const [rows] = await pool.execute(
    "SELECT * FROM study_sessions WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json(rows[0]);
}));

app.delete("/api/sessions/:id", asyncRoute(async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM study_sessions WHERE id = ?",
    [Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      error: "Study session not found."
    });
  }

  res.json({ message: "Study session deleted." });
}));

// NOTES
app.get("/api/notes", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM notes ORDER BY updated_at DESC, id DESC"
  );
  res.json(rows);
}));

app.post("/api/notes", asyncRoute(async (req, res) => {
  const subject = clean(req.body.subject);
  const title = clean(req.body.title);
  const content = clean(req.body.content);

  if (!subject || !title || !content) {
    return res.status(400).json({
      error: "Subject, title, and note content are required."
    });
  }

  const [result] = await pool.execute(
    "INSERT INTO notes (subject, title, content) VALUES (?, ?, ?)",
    [subject, title, content]
  );

  const [rows] = await pool.execute(
    "SELECT * FROM notes WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json(rows[0]);
}));

app.put("/api/notes/:id", asyncRoute(async (req, res) => {
  const subject = clean(req.body.subject);
  const title = clean(req.body.title);
  const content = clean(req.body.content);
  const id = Number(req.params.id);

  if (!subject || !title || !content) {
    return res.status(400).json({
      error: "Subject, title, and note content are required."
    });
  }

  const [result] = await pool.execute(
    "UPDATE notes SET subject = ?, title = ?, content = ? WHERE id = ?",
    [subject, title, content, id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: "Note not found." });
  }

  const [rows] = await pool.execute(
    "SELECT * FROM notes WHERE id = ?",
    [id]
  );

  res.json(rows[0]);
}));

app.delete("/api/notes/:id", asyncRoute(async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM notes WHERE id = ?",
    [Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: "Note not found." });
  }

  res.json({ message: "Note deleted." });
}));

// DASHBOARD STATISTICS
app.get("/api/stats", asyncRoute(async (req, res) => {
  const [[taskStats]] = await pool.query(
    "SELECT COUNT(*) AS total, SUM(completed = TRUE) AS completed, SUM(completed = FALSE) AS pending FROM tasks"
  );

  const [[sessionStats]] = await pool.query(
    "SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_minutes), 0) AS study_minutes FROM study_sessions"
  );

  const [[noteStats]] = await pool.query(
    "SELECT COUNT(*) AS notes FROM notes"
  );

  res.json({
    total: Number(taskStats.total || 0),
    completed: Number(taskStats.completed || 0),
    pending: Number(taskStats.pending || 0),
    sessions: Number(sessionStats.sessions || 0),
    study_minutes: Number(sessionStats.study_minutes || 0),
    notes: Number(noteStats.notes || 0)
  });
}));

// PUSH NOTIFICATION: PUBLIC VAPID KEY
app.get("/api/push/public-key", (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error: "VAPID_PUBLIC_KEY is missing from .env"
    });
  }

  res.json({ publicKey });
});

// PUSH NOTIFICATION: SAVE SUBSCRIPTION
app.post("/api/push/subscribe", asyncRoute(async (req, res) => {
  const subscription = req.body;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return res.status(400).json({
      error: "Invalid push subscription."
    });
  }

  await pool.execute(
    "INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)",
    [
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    ]
  );

  res.status(201).json({ message: "Push subscription saved." });
}));

// PUSH NOTIFICATION: SEND TEST
app.post("/api/push/test", asyncRoute(async (req, res) => {
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return res.status(500).json({
      error: "Push keys are not configured."
    });
  }

  const [subscriptions] = await pool.query(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions"
  );

  if (subscriptions.length === 0) {
    return res.status(400).json({
      error: "No subscriptions found. Enable desktop reminders first."
    });
  }

  let sent = 0;

  for (const item of subscriptions) {
    const subscription = {
      endpoint: item.endpoint,
      keys: {
        p256dh: item.p256dh,
        auth: item.auth
      }
    };

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "StudyMate Reminder",
          body: "It's time to study!"
        })
      );
      sent++;
    } catch (error) {
      console.error("Push delivery failed:", error);

      if (error.statusCode === 404 || error.statusCode === 410) {
        await pool.execute(
          "DELETE FROM push_subscriptions WHERE id = ?",
          [item.id]
        );
      }
    }
  }

  if (sent === 0) {
    return res.status(502).json({
      error: "Push delivery failed. Check the server terminal."
    });
  }

  res.json({
    message: "Test notification sent.",
    sent
  });
}));

// UNKNOWN API ROUTES
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error:
      err.code === "ECONNREFUSED" ||
      err.code === "ER_BAD_DB_ERROR"
        ? "Cannot connect to MySQL. Check that MySQL is running and .env settings are correct."
        : "Something went wrong on the server."
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`StudyMate is running at http://localhost:${PORT}`);
});