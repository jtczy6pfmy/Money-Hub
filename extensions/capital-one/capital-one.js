(() => {
  let last = null;

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

  function sync(force = false) {
    const balance = readBalance();
    if (balance === null || (!force && balance === last)) return;
    last = balance;
    (typeof browser !== "undefined" ? browser : chrome).runtime.sendMessage({
      type: "CAPITAL_ONE_BALANCE",
      balance
    });
  }

  (typeof browser !== "undefined" ? browser : chrome).runtime.onMessage.addListener((msg) => {
    if (msg?.type === "REQUEST_CAPITAL_ONE_SYNC") {
      const balance = readBalance();
      if (Number.isFinite(balance)) {
        last = balance;
        (typeof browser !== "undefined" ? browser : chrome).runtime.sendMessage({
          type: "CAPITAL_ONE_BALANCE",
          balance
        });
        return Promise.resolve({ balance });
      }
      return Promise.resolve({ balance: null });
    }
  });

  sync();
  new MutationObserver(() => sync()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(() => sync(), 3000);
})();