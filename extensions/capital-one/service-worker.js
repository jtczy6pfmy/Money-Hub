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
    const selectors = [
      ".primary-detail__balance__dollar",
      "[class*='primary-detail__balance__dollar']"
    ];

    const parse = (raw) => {
      const text = String(raw || "").replace(/\u00a0/g, " ").trim();
      if (!text) return null;
      const match = text.match(/-?\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/);
      if (!match) return null;
      const value = Number(match[1].replace(/,/g, ""));
      return Number.isFinite(value) ? value : null;
    };

    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.width > 0 &&
        rect.height > 0;
    };

    const exact = Array.from(document.querySelectorAll(selectors.join(",")))
      .filter(visible)
      .map(el => ({
        value: parse(el.innerText || el.textContent || el.getAttribute("aria-label") || ""),
        el
      }))
      .filter(x => x.value !== null);

    // Capital One can render a zero/placeholder balance before the real
    // balance is painted. Prefer a non-zero value from the exact balance
    // element when one is available.
    const nonZeroExact = exact.filter(x => x.value !== 0);
    if (nonZeroExact.length) return nonZeroExact[0].value;
    if (exact.length) return exact[0].value;

    // Fallback: inspect nearby visible text for a currency amount.
    const candidates = [];
    const all = Array.from(document.querySelectorAll("body *")).filter(visible);
    for (const el of all) {
      const label = [
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.innerText
      ].filter(Boolean).join(" ");
      if (!/balance|current balance/i.test(label)) continue;
      const matches = label.match(/-?\$\s*[0-9][0-9,]*(?:\.\d{1,2})?/g) || [];
      for (const raw of matches) {
        const value = parse(raw);
        if (value !== null) candidates.push(value);
      }
    }

    const nonZero = candidates.filter(v => v !== 0);
    return nonZero.length ? nonZero[0] : (candidates[0] ?? null);
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