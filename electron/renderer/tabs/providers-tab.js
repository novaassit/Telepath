// Providers Tab - manages LLM provider cards and CRUD modal
const ProvidersTab = (() => {
  const api = window.electronAPI;
  let editingProviderId = null;

  function getElements() {
    return {
      list: document.getElementById("providers-list"),
      addBtn: document.getElementById("btn-add-provider"),
      modal: document.getElementById("modal-provider"),
      modalTitle: document.getElementById("modal-provider-title"),
      saveBtn: document.getElementById("btn-provider-save"),
      cancelBtn: document.getElementById("btn-provider-cancel"),
      idInput: document.getElementById("provider-id"),
      typeSelect: document.getElementById("provider-type"),
      apiKey: document.getElementById("provider-api-key"),
      baseUrl: document.getElementById("provider-base-url"),
      model: document.getElementById("provider-model"),
      maxTokens: document.getElementById("provider-max-tokens"),
      streaming: document.getElementById("provider-streaming"),
    };
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function render() {
    const el = getElements();
    const [providers, bots] = await Promise.all([
      api.listProviders(),
      api.listBots(),
    ]);

    // Count bots per provider
    const botCounts = {};
    for (const [, bot] of Object.entries(bots)) {
      const pid = bot.llmProvider;
      botCounts[pid] = (botCounts[pid] || 0) + 1;
    }

    el.list.innerHTML = "";

    const entries = Object.entries(providers);
    if (entries.length === 0) {
      el.list.innerHTML =
        '<div class="empty-state">No providers configured. Click "+ Add Provider" to get started.</div>';
      return;
    }

    for (const [id, p] of entries) {
      const count = botCounts[id] || 0;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${escapeHtml(id)}</span>
          <span class="card-badge">${escapeHtml(p.type)}</span>
        </div>
        <div class="card-body">
          <div class="card-detail"><span class="detail-label">Model:</span> ${escapeHtml(p.model || "default")}</div>
          <div class="card-detail"><span class="detail-label">Streaming:</span> ${p.streaming ? "ON" : "OFF"}</div>
          <div class="card-detail"><span class="detail-label">Used by:</span> ${count} bot${count !== 1 ? "s" : ""}</div>
          ${p.baseUrl ? `<div class="card-detail"><span class="detail-label">URL:</span> ${escapeHtml(p.baseUrl)}</div>` : ""}
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-provider="${escapeHtml(id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-provider="${escapeHtml(id)}">Delete</button>
        </div>
      `;
      el.list.appendChild(card);
    }
  }

  function updateProviderFields() {
    const el = getElements();
    const type = el.typeSelect.value;
    document.querySelectorAll("#modal-provider .provider-field").forEach((field) => {
      const forTypes = field.dataset.for.split(" ");
      field.style.display = forTypes.includes(type) ? "" : "none";
    });
  }

  function openModal(providerId, providerData) {
    const el = getElements();
    editingProviderId = providerId;
    el.modalTitle.textContent = providerId ? "Edit Provider" : "Add Provider";
    el.idInput.value = providerId || "";
    el.idInput.disabled = !!providerId;
    el.typeSelect.value = providerData?.type || "ollama";
    el.apiKey.value = providerData?.apiKey || "";
    el.baseUrl.value = providerData?.baseUrl || "";
    el.model.value = providerData?.model || "";
    el.maxTokens.value = providerData?.maxTokens ?? "";
    el.streaming.checked = providerData?.streaming ?? false;

    updateProviderFields();
    el.modal.classList.remove("hidden");
  }

  function closeModal() {
    const el = getElements();
    el.modal.classList.add("hidden");
    editingProviderId = null;
  }

  async function saveProvider() {
    const el = getElements();
    const id = editingProviderId || el.idInput.value.trim();
    if (!id) return alert("Provider ID is required");

    const type = el.typeSelect.value;
    const config = { type };

    if (el.apiKey.value.trim()) config.apiKey = el.apiKey.value.trim();
    if (el.baseUrl.value.trim()) config.baseUrl = el.baseUrl.value.trim();
    if (el.model.value.trim()) config.model = el.model.value.trim();
    if (el.maxTokens.value) config.maxTokens = Number(el.maxTokens.value);
    config.streaming = el.streaming.checked;

    await api.saveProvider(id, config);
    closeModal();
    await render();
  }

  async function deleteProvider(id) {
    const result = await api.deleteProvider(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    await render();
  }

  function init() {
    const el = getElements();

    el.addBtn.addEventListener("click", () => openModal(null, null));
    el.saveBtn.addEventListener("click", saveProvider);
    el.cancelBtn.addEventListener("click", closeModal);

    el.typeSelect.addEventListener("change", updateProviderFields);

    el.list.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const providerId = btn.dataset.provider;

      if (action === "edit") {
        const p = await api.getProvider(providerId);
        openModal(providerId, p);
      } else if (action === "delete") {
        if (confirm(`Delete provider "${providerId}"?`)) {
          await deleteProvider(providerId);
        }
      }
    });
  }

  return { init, render };
})();
