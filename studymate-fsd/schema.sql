CREATE DATABASE IF NOT EXISTS studymate_db;
USE studymate_db;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  due_date DATE NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, subject, due_date, priority)
SELECT 'Revise Java OOP concepts', 'Java Programming', CURDATE(), 'High'
WHERE NOT EXISTS (SELECT 1 FROM tasks);

INSERT INTO study_sessions (subject, session_date, start_time, duration_minutes)
SELECT 'Database Management Systems', CURDATE(), '16:00:00', 45
WHERE NOT EXISTS (SELECT 1 FROM study_sessions);

INSERT INTO notes (subject, title, content)
SELECT 'Web Development', 'HTML basics', 'HTML gives structure to a webpage. CSS styles it and JavaScript adds interactivity.'
WHERE NOT EXISTS (SELECT 1 FROM notes);