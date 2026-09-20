function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

async function load() {
  const data = await chrome.storage.session.get(["lastBalances", "lastUrl", "lastTitle"]);
  const balances = data.lastBalances || [];
  const box = document.getElementById("balances");
  const status = document.getElementById("status");

  if (!balances.length) {
    status.textContent = "No supported balance found on this page.";
    box.innerHTML = "";
    return;
  }

  status.textContent = "Balance data detected";
  box.innerHTML = balances.map((item, index) => `
    <article class="balance">
      <div><small>Detected balance ${index + 1}</small><strong>${money(item.value)}</strong></div>
      <button data-value="${item.value}">Use in Money Hub</button>
    </article>`).join("");

  box.querySelectorAll("button[data-value]").forEach(button => {
    button.addEventListener("click", () => {
      const url = new URL(MONEY_HUB_CONFIG.appUrl);
      url.searchParams.set("extensionBalance", button.dataset.value);
      if (data.lastTitle) url.searchParams.set("extensionSource", data.lastTitle.slice(0, 120));
      window.open(url.toString(), "_blank");
    });
  });
}

document.getElementById("refresh").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "MONEY_HUB_RESCAN" }).catch(() => {});
  setTimeout(load, 300);
});

document.getElementById("open").addEventListener("click", () => {
  chrome.tabs.create({ url: MONEY_HUB_CONFIG.appUrl });
});

load();
