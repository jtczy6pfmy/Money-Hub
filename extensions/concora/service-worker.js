const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CONCORA_REFRESH") {
    refreshConcoraTabs();
    return;
  }
  if (msg?.type !== "CONCORA_ACCOUNTS") return;
  forwardAccounts(msg.accounts);
});

async function forwardAccounts(accounts) {
  const tabs = await api.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    try {
      const url = new URL(tab.url);
      if (url.hostname !== "jtczy6pfmy.github.io" || !url.pathname.startsWith("/Money-Hub/")) continue;

      try {
        await api.tabs.sendMessage(tab.id, { type: "CONCORA_ACCOUNTS", accounts });
      } catch (_) {}

      const payload = JSON.stringify(Array.isArray(accounts) ? accounts : []);
      const code = `window.postMessage({type:"MONEY_HUB_CONCORA_ACCOUNTS",accounts:${payload},source:"money-hub-concora-extension"},window.location.origin);`;

      if (api.tabs.executeScript) {
        await api.tabs.executeScript(tab.id, { code });
      } else if (api.scripting?.executeScript) {
        await api.scripting.executeScript({
          target: { tabId: tab.id },
          func: (items) => window.postMessage({
            type: "MONEY_HUB_CONCORA_ACCOUNTS",
            accounts: items,
            source: "money-hub-concora-extension"
          }, window.location.origin),
          args: [accounts]
        });
      }
    } catch (err) {
      console.error("Concora forwarding failed", err);
    }
  }
}

async function refreshConcoraTabs() {
  const tabs = await api.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    try {
      const url = new URL(tab.url);
      if (!/\.myfinanceservice\.com$/i.test(url.hostname)) continue;
      await api.tabs.sendMessage(tab.id, { type: "CONCORA_REFRESH" });
    } catch (_) {}
  }
}
