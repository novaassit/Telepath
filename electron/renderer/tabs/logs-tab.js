// Logs Tab - bot log display with per-bot filtering
const LogsTab = (() => {
  const api = window.electronAPI;
  const MAX_LOG_ENTRIES = 1000;
  let currentFilter = "all";
  const allLogs = []; // { level, text, timestamp, botId }

  function getElements() {
    return {
      container: document.getElementById("log-container"),
      filter: document.getElementById("log-bot-filter"),
      clearBtn: document.getElementById("btn-clear-logs"),
    };
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderLogs() {
    const el = getElements();
    el.container.innerHTML = "";

    const filtered =
      currentFilter === "all"
        ? allLogs
        : allLogs.filter((e) => e.botId === currentFilter);

    for (const entry of filtered) {
      const div = document.createElement("div");
      div.className = "log-entry " + entry.level;
      const botTag = entry.botId ? `[${escapeHtml(entry.botId)}] ` : "";
      div.innerHTML =
        '<span class="timestamp">' +
        entry.timestamp +
        "</span>" +
        '<span class="bot-tag">' + botTag + "</span>" +
        '<span class="message">' +
        escapeHtml(entry.text) +
        "</span>";
      el.container.appendChild(div);
    }
    el.container.scrollTop = el.container.scrollHeight;
  }

  function addLogEntry(entry) {
    allLogs.push(entry);
    while (allLogs.length > MAX_LOG_ENTRIES) {
      allLogs.shift();
    }

    // Update filter dropdown with new botIds
    updateFilterOptions();

    // Only append if matches current filter
    if (currentFilter !== "all" && entry.botId !== currentFilter) return;

    const el = getElements();
    const div = document.createElement("div");
    div.className = "log-entry " + entry.level;
    const botTag = entry.botId ? `[${escapeHtml(entry.botId)}] ` : "";
    div.innerHTML =
      '<span class="timestamp">' +
      entry.timestamp +
      "</span>" +
      '<span class="bot-tag">' + botTag + "</span>" +
      '<span class="message">' +
      escapeHtml(entry.text) +
      "</span>";
    el.container.appendChild(div);

    while (el.container.children.length > MAX_LOG_ENTRIES) {
      el.container.removeChild(el.container.firstChild);
    }
    el.container.scrollTop = el.container.scrollHeight;
  }

  function updateFilterOptions() {
    const el = getElements();
    const botIds = new Set(allLogs.map((e) => e.botId).filter(Boolean));
    const existing = new Set();
    el.filter.querySelectorAll("option").forEach((opt) => existing.add(opt.value));

    for (const botId of botIds) {
      if (!existing.has(botId)) {
        const opt = document.createElement("option");
        opt.value = botId;
        opt.textContent = botId;
        el.filter.appendChild(opt);
      }
    }
  }

  function init() {
    const el = getElements();

    el.filter.addEventListener("change", () => {
      currentFilter = el.filter.value;
      renderLogs();
    });

    el.clearBtn.addEventListener("click", () => {
      allLogs.length = 0;
      el.container.innerHTML = "";
    });

    api.onLog(addLogEntry);
  }

  return { init };
})();
