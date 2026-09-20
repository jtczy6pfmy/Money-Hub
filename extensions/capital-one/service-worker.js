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
        if (!url.hostname.endsWith("capitalone.com")) continue;

        // Ask the content script too, but do not treat a successful message
        // delivery as proof that a balance was actually read.
        try {
          await api.tabs.sendMessage(tab.id, { type: "REQUEST_CAPITAL_ONE_SYNC" });
        } catch (_) {}

        // Always read the visible Capital One DOM directly for a manual sync.
        // This is the reliable path when the content script is present but
        // its balance message is not making it back to Money Hub.
        if (!api.scripting?.executeScript) continue;

        const result = await api.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selectors = [
              ".primary-detail__balance__dollar",
              "[class*='primary-detail__balance__dollar']"
            ];

            let el = null;
            for (const selector of selectors) {
              el = document.querySelector(selector);
              if (el) break;
            }

            if (!el) return null;

            const raw = (el.textContent || "").trim();
            const cleaned = raw.replace(/[^0-9.-]/g, "");
            const value = Number(cleaned);

            return Number.isFinite(value) ? value : null;
          }
        });

        const balance = result?.[0]?.result;
        if (Number.isFinite(balance)) {
          await forwardBalance({
            type: "CAPITAL_ONE_BALANCE",
            balance
          });
        }
      } catch (err) {
        console.error("Capital One tab sync failed", err);
      }
    }
  } catch (err) {
    console.error("Capital One sync request failed", err);
  }
}