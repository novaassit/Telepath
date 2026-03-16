const MAX_LOG_ENTRIES = 1000;
const { electronAPI } = window;

// Elements
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const logContainer = document.getElementById("log-container");
const btnClearLogs = document.getElementById("btn-clear-logs");
const settingsForm = document.getElementById("settings-form");
const btnSave = document.getElementById("btn-save");
const saveMessage = document.getElementById("save-message");

const statusLabels = {
  stopped: "Stopped",
  starting: "Starting...",
  running: "Running",
  error: "Error",
};

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// Status
function updateStatus(status) {
  statusDot.className = "status-dot " + status;
  statusText.textContent = statusLabels[status] || status;
  btnStart.disabled = status === "running" || status === "starting";
  btnStop.disabled = status === "stopped" || status === "error";
}

electronAPI.onStatusChange(updateStatus);

// Logs
function addLogEntry(entry) {
  const el = document.createElement("div");
  el.className = "log-entry " + entry.level;
  el.innerHTML =
    '<span class="timestamp">' + entry.timestamp + '</span>' +
    '<span class="message">' + escapeHtml(entry.text) + '</span>';
  logContainer.appendChild(el);

  // Trim old entries
  while (logContainer.children.length > MAX_LOG_ENTRIES) {
    logContainer.removeChild(logContainer.firstChild);
  }

  // Auto-scroll
  logContainer.scrollTop = logContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

electronAPI.onLog(addLogEntry);

btnClearLogs.addEventListener("click", () => {
  logContainer.innerHTML = "";
});

// Start / Stop
btnStart.addEventListener("click", () => {
  electronAPI.startBot();
});

btnStop.addEventListener("click", () => {
  electronAPI.stopBot();
});

// Settings
let envSchema = [];
let currentEnv = {};

async function loadSettings() {
  envSchema = await electronAPI.getEnvSchema();
  currentEnv = await electronAPI.readEnv();
  renderSettings();
}

function renderSettings() {
  settingsForm.innerHTML = "";
  const groups = new Map();

  for (const field of envSchema) {
    if (!groups.has(field.group)) {
      groups.set(field.group, []);
    }
    groups.get(field.group).push(field);
  }

  for (const [groupName, fields] of groups) {
    const group = document.createElement("div");
    group.className = "settings-group";

    const title = document.createElement("h3");
    title.textContent = groupName;
    group.appendChild(title);

    for (const field of fields) {
      const fieldEl = document.createElement("div");
      fieldEl.className = "field";

      const label = document.createElement("label");
      label.textContent = field.key;
      fieldEl.appendChild(label);

      if (field.comment) {
        const comment = document.createElement("div");
        comment.className = "comment";
        comment.textContent = field.comment;
        fieldEl.appendChild(comment);
      }

      if (field.key === "LLM_PROVIDER") {
        const select = document.createElement("select");
        select.id = "input-" + field.key;
        select.dataset.key = field.key;
        const options = ["ollama", "openai", "custom", "claude", "gemini"];
        for (const opt of options) {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          if ((currentEnv[field.key] || field.defaultValue) === opt) {
            option.selected = true;
          }
          select.appendChild(option);
        }
        fieldEl.appendChild(select);
      } else {
        const input = document.createElement("input");
        input.type = field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("token")
          ? "password"
          : "text";
        input.id = "input-" + field.key;
        input.dataset.key = field.key;
        input.value = currentEnv[field.key] || "";
        input.placeholder = field.defaultValue || "";
        fieldEl.appendChild(input);
      }

      group.appendChild(fieldEl);
    }

    settingsForm.appendChild(group);
  }
}

btnSave.addEventListener("click", async () => {
  const values = {};
  settingsForm.querySelectorAll("input, select").forEach((el) => {
    const key = el.dataset.key;
    const val = el.value.trim();
    if (val) values[key] = val;
  });

  await electronAPI.writeEnv(values);
  currentEnv = values;
  saveMessage.textContent = "Settings saved. Restart the bot to apply.";
  setTimeout(() => {
    saveMessage.textContent = "";
  }, 5000);
});

// Init
async function init() {
  const status = await electronAPI.getStatus();
  updateStatus(status);
  await loadSettings();
}

init();
