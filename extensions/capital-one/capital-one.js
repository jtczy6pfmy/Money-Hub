(() => {
  let last = null;
  const api = typeof browser !== "undefined" ? browser : chrome;

  function parseMoney(raw) {
    const text = String(raw || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const matches = [...text.matchAll(/-?\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g)];
    for (const match of matches) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value)) return value;
    }
    return null;
  }

  function readBalance() {
    const selectors = [
      ".primary-detail__balance",
      ".primary-detail__balance__dollar",
      "[data-testid*='balance' i]",
      "[class*='balance' i]"
    ];

    const candidates = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!rect.width || !rect.height || style.display === "none" || style.visibility === "hidden") continue;
        const value = parseMoney(el.textContent || el.innerText || "");
        if (value !== null) candidates.push({ value, area: rect.width * rect.height });
      }
    }

    // Prefer a visible non-zero balance from the largest visible balance-like element.
    const nonZero = candidates.filter(x => x.value !== 0).sort((a, b) => b.area - a.area);
    if (nonZero.length) return nonZero[0].value;
    return candidates.sort((a, b) => b.area - a.area)[0]?.value ?? null;
  }

  function sync(force = false) {
    const balance = readBalance();
    if (balance === null || (!force && balance === last)) return;
    last = balance;
    api.runtime.sendMessage({ type: "CAPITAL_ONE_BALANCE", balance });
  }

  api.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "REQUEST_CAPITAL_ONE_SYNC") return;
    const balance = readBalance();
    if (Number.isFinite(balance)) {
      last = balance;
      api.runtime.sendMessage({ type: "CAPITAL_ONE_BALANCE", balance });
      return Promise.resolve({ balance });
    }
    return Promise.resolve({ balance: null });
  });

  sync(true);
  new MutationObserver(() => sync()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(() => sync(), 1500);
})();