const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((msg) => {
  if (!msg) return;

  if (msg.type === "CAPITAL_ONE_BALANCE") {
    forwardBalance(msg);
    return;
  }

  if (msg.type === "REQUEST_CAPITAL_ONE_SYNC") {
    requestCapitalOneSync();
  }
});

async function forwardBalance(msg) {
  try {
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      try {
        const url = new URL(tab.url);
        if (url.hostname === "jtczy6pfmy.github.io" && url.pathname.startsWith("/Money-Hub/")) {
          await api.tabs.sendMessage(tab.id, msg);
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error("Money Hub balance forwarding failed", err);
  }
}

async function requestCapitalOneSync() {
  try {
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      try {
        const url = new URL(tab.url);
        if (url.hostname.endsWith("capitalone.com")) {
          await api.tabs.sendMessage(tab.id, { type: "REQUEST_CAPITAL_ONE_SYNC" });
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error("Capital One sync request failed", err);
  }
}
