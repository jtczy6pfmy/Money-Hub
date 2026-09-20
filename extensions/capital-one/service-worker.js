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
    function readBalance() {
    const parse = (raw) => {
      const text = String(raw || "").replace(/\u00a0/g, " ").trim();
      const match = text.match(/-?\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/);
      if (!match) return null;
      const value = Number(match[1].replace(/,/g, ""));
      return Number.isFinite(value) ? value : null;
    };

    // Capital One renders the account balance as a parent containing
    // multiple dollar/superscript nodes. The first dollar node is empty;
    // the second dollar node contains the actual whole-dollar amount.
    const balances = Array.from(document.querySelectorAll(".primary-detail__balance"));
    for (const balance of balances) {
      const parts = Array.from(balance.querySelectorAll(".primary-detail__balance__dollar"))
        .map(el => parse(el.textContent || el.innerText || ""))
        .filter(v => v !== null);

      const nonZero = parts.filter(v => v !== 0);
      if (nonZero.length) return nonZero[0];
      if (parts.length) return parts[0];
    }

    // Fallback for minor Capital One markup changes.
    const direct = Array.from(document.querySelectorAll(
      ".primary-detail__balance__dollar"
    ))
      .map(el => parse(el.textContent || el.innerText || ""))
      .filter(v => v !== null);

    const nonZeroDirect = direct.filter(v => v !== 0);
    return nonZeroDirect.length ? nonZeroDirect[0] : (direct[0] ?? null);
  }
    return readBalance();
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

        let response = null;
        try {
          response = await api.tabs.sendMessage(tab.id, { type: "REQUEST_CAPITAL_ONE_SYNC" });
        } catch (_) {}

        // The Capital One content script is the authoritative reader.
        // Do not run a second DOM read here, because Capital One can expose
        // a hidden/placeholder $0 element to executeScript while the content
        // script sees the actual visible balance.
        const balance = Number(response?.balance);

        if (Number.isFinite(balance)) {
          return;
        }

        // Only use the direct DOM fallback if the content script did not
        // respond with a usable balance.
        const result = await readVisibleBalance(tab.id);
        const fallbackBalance = result?.[0]?.result ?? result?.[0];

        if (Number.isFinite(fallbackBalance)) {
          await forwardBalance({
            type: "CAPITAL_ONE_BALANCE",
            balance: fallbackBalance
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