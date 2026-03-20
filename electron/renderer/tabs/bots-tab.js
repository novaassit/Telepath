// Bots Tab - manages bot cards and bot CRUD modal
const BotsTab = (() => {
  const api = window.electronAPI;
  let editingBotId = null; // null = adding new, string = editing existing

  function getElements() {
    return {
      list: document.getElementById("bots-list"),
      addBtn: document.getElementById("btn-add-bot"),
      modal: document.getElementById("modal-bot"),
      modalTitle: document.getElementById("modal-bot-title"),
      saveBtn: document.getElementById("btn-bot-save"),
      cancelBtn: document.getElementById("btn-bot-cancel"),
      idInput: document.getElementById("bot-id"),
      nameInput: document.getElementById("bot-name"),
      tokenInput: document.getElementById("bot-token"),
      providerSelect: document.getElementById("bot-provider"),
      systemPrompt: document.getElementById("bot-system-prompt"),
      maxHistory: document.getElementById("bot-max-history"),
      maxInput: document.getElementById("bot-max-input"),
      allowFrom: document.getElementById("bot-allow-from"),
    };
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function render() {
    const el = getElements();
    const [bots, statuses, providers] = await Promise.all([
      api.listBots(),
      api.getAllStatuses(),
      api.listProviders(),
    ]);

    const statusMap = {};
    for (const s of statuses) {
      statusMap[s.botId] = s.status;
    }

    el.list.innerHTML = "";

    const botEntries = Object.entries(bots);
    if (botEntries.length === 0) {
      el.list.innerHTML =
        '<div class="empty-state">No bots configured. Click "+ Add Bot" to get started.</div>';
      return;
    }

    for (const [botId, bot] of botEntries) {
      const status = statusMap[botId] || "stopped";
      const provider = providers[bot.llmProvider];
      const providerLabel = provider
        ? `${bot.llmProvider} (${provider.type}/${provider.model || "default"})`
        : `${bot.llmProvider} (missing!)`;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="status-dot ${status}"></span>
          <span class="card-title">${escapeHtml(bot.name || botId)}</span>
          <span class="card-subtitle">${escapeHtml(botId)}</span>
        </div>
        <div class="card-body">
          <div class="card-detail"><span class="detail-label">Provider:</span> ${escapeHtml(providerLabel)}</div>
          <div class="card-detail"><span class="detail-label">Status:</span> ${status}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-start btn-sm" data-action="start" data-bot="${escapeHtml(botId)}" ${status === "running" || status === "starting" ? "disabled" : ""}>Start</button>
          <button class="btn btn-stop btn-sm" data-action="stop" data-bot="${escapeHtml(botId)}" ${status === "stopped" || status === "error" ? "disabled" : ""}>Stop</button>
          <button class="btn btn-secondary btn-sm" data-action="edit" data-bot="${escapeHtml(botId)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-bot="${escapeHtml(botId)}" ${status === "running" || status === "starting" ? "disabled" : ""}>Delete</button>
        </div>
      `;
      el.list.appendChild(card);
    }
  }

  async function populateProviderSelect() {
    const el = getElements();
    const providers = await api.listProviders();
    el.providerSelect.innerHTML = "";
    for (const [id, p] of Object.entries(providers)) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${id} (${p.type})`;
      el.providerSelect.appendChild(opt);
    }
  }

  function generateBotId() {
    return "bot-" + Date.now().toString(36);
  }

  function openModal(botId, botData) {
    const el = getElements();
    editingBotId = botId;
    el.modalTitle.textContent = botId ? "Edit Bot" : "Add Bot";
    el.idInput.value = botId || "";
    el.nameInput.value = botData?.name || "";
    el.tokenInput.value = botData?.telegramBotToken || "";
    el.systemPrompt.value = botData?.systemPrompt || "";
    el.maxHistory.value = botData?.maxHistoryMessages ?? "";
    el.maxInput.value = botData?.maxInputLength ?? "";
    el.allowFrom.value = botData?.allowFrom?.join(", ") || "";

    populateProviderSelect().then(() => {
      if (botData?.llmProvider) {
        el.providerSelect.value = botData.llmProvider;
      }
    });

    el.modal.classList.remove("hidden");
  }

  function closeModal() {
    const el = getElements();
    el.modal.classList.add("hidden");
    editingBotId = null;
  }

  async function saveBot() {
    const el = getElements();
    const id = editingBotId || generateBotId();

    const config = {
      name: el.nameInput.value.trim() || id,
      telegramBotToken: el.tokenInput.value.trim(),
      llmProvider: el.providerSelect.value,
      systemPrompt: el.systemPrompt.value.trim() || undefined,
      maxHistoryMessages: el.maxHistory.value ? Number(el.maxHistory.value) : undefined,
      maxInputLength: el.maxInput.value ? Number(el.maxInput.value) : undefined,
      allowFrom: el.allowFrom.value.trim()
        ? el.allowFrom.value.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n))
        : undefined,
    };

    if (!config.telegramBotToken) return alert("Telegram Bot Token is required");
    if (!config.llmProvider) return alert("LLM Provider is required");

    await api.saveBot(id, config);
    closeModal();
    await render();
  }

  async function deleteBot(botId) {
    if (!confirm(`Delete bot "${botId}"?`)) return;
    await api.deleteBot(botId);
    await render();
  }

  function init() {
    const el = getElements();

    el.addBtn.addEventListener("click", () => openModal(null, null));
    el.saveBtn.addEventListener("click", saveBot);
    el.cancelBtn.addEventListener("click", closeModal);

    el.list.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const botId = btn.dataset.bot;

      switch (action) {
        case "start": {
          const result = await api.startBot(botId);
          if (!result.ok) alert(result.error);
          break;
        }
        case "stop":
          await api.stopBot(botId);
          break;
        case "edit": {
          const bot = await api.getBot(botId);
          openModal(botId, bot);
          break;
        }
        case "delete":
          await deleteBot(botId);
          break;
      }
    });

    // Update card status when status changes
    api.onStatusChange((info) => {
      render();
    });
  }

  return { init, render };
})();
