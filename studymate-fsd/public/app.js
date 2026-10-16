const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = { tasks: [], sessions: [], notes: [], editingNote: null, timerSeconds: 25 * 60, timerInitial: 25 * 60, timerInterval: null, timerRunning: false, timerMode: "focus" };

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const prettyDate = value => {
  if (!value) return "No due date";
  const d = new Date(`${String(value).slice(0,10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
};
const prettyTime = value => {
  if (!value) return "";
  const parts = String(value).slice(0,5).split(":");
  let hour = Number(parts[0]); const minute = parts[1];
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
};
const showToast = message => {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 3000);
};
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
async function refreshAll() {
  try {
    const [tasks, sessions, notes, stats] = await Promise.all([
      api("/api/tasks"), api("/api/sessions"), api("/api/notes"), api("/api/stats")
    ]);
    state.tasks = tasks; state.sessions = sessions; state.notes = notes;
    renderDashboard(stats); renderTasks(); renderSessions(); renderNotes(); renderProgress(stats);
  } catch (error) {
    showToast(error.message);
  }
}
function renderDashboard(stats) {
  $("#statCompleted").textContent = stats.completed;
  $("#statTotal").textContent = stats.total;
  $("#statPending").textContent = stats.pending;
  $("#statSessions").textContent = stats.sessions;
  $("#statMinutes").textContent = stats.study_minutes;
  const percent = stats.total ? Math.round(stats.completed / stats.total * 100) : 0;
  $("#taskProgressBar").style.width = `${percent}%`;
  const today = todayISO();
  const sessions = state.sessions.filter(s => String(s.session_date).slice(0,10) === today);
  $("#dashboardSessions").innerHTML = sessions.length ? sessions.map(s => `<div class="session-item"><span class="session-color"></span><div class="session-info"><strong>${escapeHTML(s.subject)}</strong><small>${s.duration_minutes} minutes · ${prettyDate(s.session_date)}</small></div><span class="session-time">${prettyTime(s.start_time)}</span></div>`).join("") : `<div class="empty-state"><span>🌷</span>No sessions planned for today yet.</div>`;
  const tasks = state.tasks.filter(t => !t.completed).slice(0,4);
  $("#dashboardTasks").innerHTML = tasks.length ? tasks.map(t => `<div class="task-item"><input class="task-check" type="checkbox" aria-label="Complete ${escapeHTML(t.title)}" data-complete="${t.id}"><div class="task-info"><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.subject)} · ${prettyDate(t.due_date)}</small></div><span class="priority ${escapeHTML(t.priority)}">${escapeHTML(t.priority)}</span></div>`).join("") : `<div class="empty-state"><span>🎉</span>All caught up! Add a task when you're ready.</div>`;
}
function renderTasks() {
  const filter = $("#taskFilter").value;
  let tasks = state.tasks;
  if (filter === "pending") tasks = tasks.filter(t => !t.completed);
  if (filter === "completed") tasks = tasks.filter(t => t.completed);
  $("#tasksList").innerHTML = tasks.length ? tasks.map(t => `<div class="task-item ${t.completed ? "done" : ""}"><input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(t.title)} complete" data-complete="${t.id}" ${t.completed ? "checked" : ""}><div class="task-info"><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.subject)} · Due ${prettyDate(t.due_date)}</small></div><span class="priority ${escapeHTML(t.priority)}">${escapeHTML(t.priority)}</span><button class="icon-btn" data-delete-task="${t.id}" aria-label="Delete task">✕</button></div>`).join("") : `<div class="empty-state"><span>🧸</span>No tasks here yet. Add a little goal above!</div>`;
}
function renderSessions() {
  $("#sessionsList").innerHTML = state.sessions.length ? state.sessions.map(s => `<div class="session-item"><span class="session-color"></span><div class="session-info"><strong>${escapeHTML(s.subject)}</strong><small>${prettyDate(s.session_date)} · ${s.duration_minutes} minutes</small></div><span class="session-time">${prettyTime(s.start_time)}</span><button class="icon-btn" data-delete-session="${s.id}" aria-label="Delete study session">✕</button></div>`).join("") : `<div class="empty-state"><span>🌸</span>Your timetable is waiting for its first session.</div>`;
}
function renderNotes() {
  $("#notesList").innerHTML = state.notes.length ? state.notes.map(n => `<article class="note-card"><span class="note-subject">${escapeHTML(n.subject)}</span><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.content)}</p><div class="note-card-footer"><small>Updated ${prettyDate(String(n.updated_at || "").slice(0,10))}</small><div class="note-actions"><button class="icon-btn" data-edit-note="${n.id}" aria-label="Edit note">✎</button><button class="icon-btn" data-delete-note="${n.id}" aria-label="Delete note">✕</button></div></div></article>`).join("") : `<div class="panel empty-state"><span>📒</span>No notes saved yet. Capture a useful idea!</div>`;
}
function renderProgress(stats) {
  const percent = stats.total ? Math.round(stats.completed / stats.total * 100) : 0;
  $("#progressPercent").textContent = `${percent}%`;
  $("#largeProgressBar").style.width = `${percent}%`;
  $("#progressMessage").textContent = percent === 100 && stats.total ? "Amazing! You completed every task. Celebrate your progress! 🎉" : percent >= 60 ? "You're doing wonderfully. Keep the momentum going! 🌷" : stats.total ? "Keep going, one small task at a time. You can do it! 💗" : "Add your first task and start your journey.";
  $("#progressSessions").textContent = stats.sessions;
  $("#progressHours").textContent = stats.study_minutes >= 60 ? `${Math.floor(stats.study_minutes/60)} h ${stats.study_minutes%60} min` : `${stats.study_minutes} min`;
  $("#progressNotes").textContent = stats.notes;
  $("#progressPending").textContent = stats.pending;
}
function navigate(page) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  $$(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const titles = {dashboard:"Good day, learner! 🌷",timetable:"Your study timetable 📅",tasks:"Small steps, big wins ☑",progress:"Look at you growing! 🌈",timer:"Time to focus ⏳",notes:"Your little notes 📝"};
  $("#pageTitle").textContent = titles[page] || "StudyMate";
  $("#todayLabel").textContent = page === "dashboard" ? "YOUR DAILY SPACE" : "YOUR HAPPY STUDY PLACE";
  $("#sidebar").classList.remove("open");
  if (page === "progress") refreshAll();
}
$$(".nav-link").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
$("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

$("#todayDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
$("#sessionForm").elements.session_date.value = todayISO();
$("#taskForm").elements.due_date.value = todayISO();

$("#sessionForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  data.duration_minutes = Number(data.duration_minutes);
  try {
    await api("/api/sessions",{method:"POST",body:JSON.stringify(data)});
    form.reset(); form.elements.session_date.value = todayISO(); form.elements.duration_minutes.value = "30";
    showToast("Study session added to your timetable! 🌸");
    await refreshAll();
  } catch (error) { showToast(error.message); }
});
$("#taskForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/tasks",{method:"POST",body:JSON.stringify(data)});
    form.reset(); form.elements.due_date.value = todayISO(); form.elements.priority.value = "Medium";
    showToast("A new task has been added! ✨");
    await refreshAll();
  } catch (error) { showToast(error.message); }
});
$("#taskFilter").addEventListener("change", renderTasks);

document.addEventListener("change", async event => {
  const id = event.target.dataset.complete;
  if (!id) return;
  try {
    await api(`/api/tasks/${id}`,{method:"PATCH",body:JSON.stringify({completed:event.target.checked})});
    showToast(event.target.checked ? "Task completed — well done! 🎉" : "Task moved back to pending.");
    await refreshAll();
  } catch (error) { showToast(error.message); await refreshAll(); }
});
document.addEventListener("click", async event => {
  const taskId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;
  const sessionId = event.target.closest("[data-delete-session]")?.dataset.deleteSession;
  const noteId = event.target.closest("[data-delete-note]")?.dataset.deleteNote;
  const editId = event.target.closest("[data-edit-note]")?.dataset.editNote;
  try {
    if (taskId) {
      if (!confirm("Delete this task?")) return;
      await api(`/api/tasks/${taskId}`,{method:"DELETE"}); showToast("Task deleted.");
    } else if (sessionId) {
      if (!confirm("Remove this study session?")) return;
      await api(`/api/sessions/${sessionId}`,{method:"DELETE"}); showToast("Study session removed.");
    } else if (noteId) {
      if (!confirm("Delete this note?")) return;
      await api(`/api/notes/${noteId}`,{method:"DELETE"}); showToast("Note deleted.");
    } else if (editId) {
      const note = state.notes.find(n => String(n.id) === String(editId));
      if (!note) return;
      state.editingNote = note.id;
      const form = $("#noteForm");
      form.elements.subject.value = note.subject; form.elements.title.value = note.title; form.elements.content.value = note.content;
      $("#noteFormHeading").textContent = "Edit your note"; $("#noteSubmit").textContent = "Save changes"; $("#noteCancel").classList.remove("hidden");
      navigate("notes"); form.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    } else return;
    await refreshAll();
  } catch (error) { showToast(error.message); }
});

$("#noteForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    if (state.editingNote) {
      await api(`/api/notes/${state.editingNote}`,{method:"PUT",body:JSON.stringify(data)});
      showToast("Your note has been updated! 📝");
    } else {
      await api("/api/notes",{method:"POST",body:JSON.stringify(data)});
      showToast("Your note has been saved! 💌");
    }
    resetNoteForm(); await refreshAll();
  } catch (error) { showToast(error.message); }
});
function resetNoteForm() {
  $("#noteForm").reset(); state.editingNote = null;
  $("#noteFormHeading").textContent = "Create a note"; $("#noteSubmit").textContent = "＋ Save note"; $("#noteCancel").classList.add("hidden");
}
$("#noteCancel").addEventListener("click", resetNoteForm);

$("#themeToggle").addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  $("#themeIcon").textContent = isDark ? "☀" : "☾";
  $("#themeText").textContent = isDark ? "Switch to light mode" : "Switch to dark mode";
  try { localStorage.setItem("studymate-theme", isDark ? "dark" : "light"); } catch (_) {}
});
try {
  if (localStorage.getItem("studymate-theme") === "dark") {
    document.body.classList.add("dark"); $("#themeIcon").textContent = "☀"; $("#themeText").textContent = "Switch to light mode";
  }
} catch (_) {}

function updateTimerDisplay() {
  const mins = Math.floor(state.timerSeconds / 60);
  const secs = state.timerSeconds % 60;
  $("#timerDisplay").textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  const elapsed = 1 - state.timerSeconds / state.timerInitial;
  $("#timerRing").style.background = `conic-gradient(#b5a0e6 ${Math.max(0,elapsed)*360}deg, var(--border) 0deg)`;
}
function stopTimer() {
  clearInterval(state.timerInterval); state.timerInterval = null; state.timerRunning = false;
  $("#timerStart").textContent = "▶ Start focus";
}
function setTimer(minutes, mode) {
  stopTimer();
  state.timerMode = mode; state.timerSeconds = minutes * 60; state.timerInitial = minutes * 60;
  $("#timerMode").textContent = mode === "focus" ? "FOCUS SESSION" : "BREAK TIME";
  $("#timerHint").textContent = mode === "focus" ? "Take it one minute at a time" : "Rest your mind for a moment";
  $$(".preset").forEach(b => b.classList.toggle("active",Number(b.dataset.minutes) === minutes && b.dataset.mode === mode));
  updateTimerDisplay();
}
$$(".preset").forEach(button => button.addEventListener("click", () => setTimer(Number(button.dataset.minutes),button.dataset.mode)));
$("#timerStart").addEventListener("click", () => {
  if (state.timerRunning) { stopTimer(); return; }
  state.timerRunning = true; $("#timerStart").textContent = "Ⅱ Pause";
  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    updateTimerDisplay();
    if (state.timerSeconds <= 0) {
      stopTimer(); state.timerSeconds = 0; updateTimerDisplay();
      showToast(state.timerMode === "focus" ? "Focus session complete! Time for a little break. 🎉" : "Break time is over. Ready when you are! 🌷");
      $("#timerStart").textContent = "▶ Start again";
    }
  },1000);
});
$("#timerReset").addEventListener("click", () => setTimer(state.timerInitial/60,state.timerMode));

refreshAll();