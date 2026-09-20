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
        if (url.hostname !== "jtczy6pfmy.github.io" || !url.pathname.startsWith("/Money-Hub/")) continue;

        // Send through the bridge when available.
        try {
          await api.tabs.sendMessage(tab.id, msg);
        } catch (_) {}

        // Also post directly into the Money Hub page. This avoids relying
        // on the extension content-script message bridge in Firefox.
        const code = `window.postMessage({type:"MONEY_HUB_CAPITAL_ONE_BALANCE",balance:${JSON.stringify(Number(msg.balance))},source:"money-hub-capital-one-extension"},window.location.origin);`;
        if (api.tabs.executeScript) {
          await api.tabs.executeScript(tab.id, { code });
        } else if (api.scripting?.executeScript) {
          await api.scripting.executeScript({
            target: { tabId: tab.id },
            func: (balance) => {
              window.postMessage({
                type: "MONEY_HUB_CAPITAL_ONE_BALANCE",
                balance,
                source: "money-hub-capital-one-extension"
              }, window.location.origin);
            },
            args: [Number(msg.balance)]
          });
        }
      } catch (err) {
        console.error("Money Hub balance forwarding failed for tab", tab.id, err);
      }
    }
  } catch (err) {
    console.error("Money Hub balance forwarding failed", err);
  }
}

function readVisibleBalance(tabId) {
  const func = () => {
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

    const value = Number((el.textContent || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? value : null;
  };

  if (api.tabs?.executeScript) {
    return api.tabs.executeScript(tabId, {
      code: "(" + func.toString() + ")()"
    });
  }

  if (api.scripting?.executeScript) {
    return api.scripting.executeScript({
      target: { tabId },
      func
    });
  }

  return Promise.resolve([]);
}

async function requestCapitalOneSync() {
  try {
    const tabs = await api.tabs.query({});

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      try {
        const url = new URL(tab.url);
        if (!url.hostname.endsWith("capitalone.com")) continue;

        try {
          await api.tabs.sendMessage(tab.id, { type: "REQUEST_CAPITAL_ONE_SYNC" });
        } catch (_) {}

        const result = await readVisibleBalance(tab.id);
        const balance = result?.[0]?.result ?? result?.[0];

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