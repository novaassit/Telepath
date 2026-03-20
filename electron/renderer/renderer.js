// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    const target = document.getElementById("tab-" + tab.dataset.tab);
    if (target) target.classList.add("active");
  });
});

// Initialize all tabs
async function init() {
  BotsTab.init();
  ProvidersTab.init();
  LogsTab.init();

  await Promise.all([BotsTab.render(), ProvidersTab.render()]);
}

init();
