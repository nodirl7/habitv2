const tasksEl = document.getElementById("tasks");
const modal = document.getElementById("modal");
const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const datePicker = document.getElementById("datePicker");

const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const priorityInput = document.getElementById("priorityInput");
const dailyInput = document.getElementById("dailyInput");

// Сегодня
datePicker.valueAsDate = new Date();

// ===== Данные =====
let data = JSON.parse(localStorage.getItem("tracker")) || {
  habits: [],
  tasksByDate: {}
};

const priorityWeight = { high: 3, medium: 2, low: 1 };

// ===== Сохранение =====
function save() {
  localStorage.setItem("tracker", JSON.stringify(data));
}

// ===== Ключ выбранной даты =====
function getDateKey() {
  return datePicker.value;
}

// ===== Статистика =====
function getStats(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.task.done || (t.type === "habit" && t.task.history && t.task.history[getDateKey()])).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

// ===== Последние N дней =====
function getLastNDays(n) {
  const days = [];
  const date = new Date(getDateKey());
  for (let i = 0; i < n; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ===== Расчет streak 30 дней =====
function calculateStreak(habit, days=30) {
  if (!habit.history) return 0;
  let streak = 0;
  const date = new Date(getDateKey());
  for (let i = 0; i < days; i++) {
    const key = date.toISOString().split("T")[0];
    if (habit.history[key]) streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

// ===== Обновление текста кнопки типа =====
function updateToggleText(type, button) {
  button.textContent = type === "habit" ? "Ежедневная" : "Разовая";
}

// ===== РЕНДЕР =====
function render() {
  tasksEl.innerHTML = "";
  const dateKey = getDateKey();

  let tasks = [
    ...data.habits.map((task, index) => ({ task, type: "habit", index })),
    ...(data.tasksByDate[dateKey] || []).map((task, index) => ({
      task,
      type: "date",
      index
    }))
  ];

  tasks.sort((a, b) =>
    (priorityWeight[b.task.priority] || 0) -
    (priorityWeight[a.task.priority] || 0)
  );

  const stats = getStats(tasks);
  const statsDiv = document.createElement("div");
  statsDiv.className = "stats";
  statsDiv.textContent =
    `Выполнено: ${stats.done} из ${stats.total} · ${stats.percent}%`;
  tasksEl.appendChild(statsDiv);

  tasks.forEach(item => {
    const { task, type, index } = item;
    const div = document.createElement("div");
    div.className = `task ${task.priority || ""}`;

    div.innerHTML = `
      <div class="task-header">
        <div class="task-title">
          <label>
            <input type="checkbox"
              ${type === "habit" && task.history && task.history[dateKey] ? "checked" :
                type !== "habit" && task.done ? "checked" : ""}/>
            ${task.title}
          </label>
        </div>
        <div class="task-actions">
          <button class="toggle"></button>
          <button class="delete">Удалить</button>
        </div>
      </div>
      <div class="task-desc">${task.desc || ""}</div>
    `;

    // раскрытие описания
    div.querySelector(".task-title").onclick = e => {
      if (e.target.tagName === "INPUT") return;
      div.classList.toggle("open");
    };

    // выполнение
    div.querySelector("input").onchange = e => {
      if (type === "habit") {
        const today = getDateKey();
        if (!task.history) task.history = {};
        if (e.target.checked) task.history[today] = true;
        else delete task.history[today];
      } else {
        task.done = e.target.checked;
      }
      save();
      render();
    };

    // удаление
    div.querySelector(".delete").onclick = () => {
      if (!confirm(`Удалить задачу "${task.title}"?`)) return;
      if (type === "habit") data.habits.splice(index, 1);
      else data.tasksByDate[dateKey].splice(index, 1);
      save();
      render();
    };

    // переключение типа
    const toggleBtn = div.querySelector(".toggle");
    updateToggleText(type, toggleBtn);
    toggleBtn.onclick = () => {
      if (type === "habit") {
        data.habits.splice(index, 1);
        data.tasksByDate[dateKey] ||= [];
        data.tasksByDate[dateKey].push({ ...task, done: false });
      } else {
        data.tasksByDate[dateKey].splice(index, 1);
        data.habits.push({ ...task, history: {} });
      }
      save();
      render();
    };

    // streak + прогресс
    if (type === "habit") {
      const streak = calculateStreak(task, 30);
      const progressDiv = document.createElement("div");
      progressDiv.className = "streak";
      progressDiv.innerHTML = `
        🔥 ${streak} дней
        <div class="progress-container">
          <div class="progress-fill" style="width: ${Math.round((streak/30)*100)}%"></div>
        </div>
      `;
      div.appendChild(progressDiv);
    }

    tasksEl.appendChild(div);
  });
}

// ===== МОДАЛКА =====
addBtn.onclick = () => modal.classList.remove("hidden");
cancelBtn.onclick = closeModal;
modal.onclick = e => { if(e.target === modal) closeModal(); };

function closeModal() {
  modal.classList.add("hidden");
  resetForm();
}

function resetForm() {
  titleInput.value = "";
  descInput.value = "";
  priorityInput.value = "";
  dailyInput.checked = false;
}

// ===== Добавление задачи =====
saveBtn.onclick = () => {
  const title = titleInput.value.trim();
  if (!title) return;

  const baseTask = { title, desc: descInput.value, priority: priorityInput.value || null };

  if (dailyInput.checked) data.habits.push({ ...baseTask, history: {} });
  else {
    const key = getDateKey();
    data.tasksByDate[key] ||= [];
    data.tasksByDate[key].push({ ...baseTask, done: false });
  }

  save();
  closeModal();
  render();
};

// смена даты
datePicker.onchange = render;

// первый рендер
render();
