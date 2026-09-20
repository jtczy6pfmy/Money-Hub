(() => {
  let last = null;

  function readDocument(doc) {
    const previous = document;
    try {
      return (function() {
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

  function sync(force = false) {
    const balance = readBalance();
    if (balance === null || (!force && balance === last)) return;
    last = balance;
    return (typeof browser !== "undefined" ? browser : chrome).runtime.sendMessage({
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

  const observe = (win) => {
    try {
      new MutationObserver(() => sync()).observe(win.document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true
      });
      for (let i = 0; i < win.frames.length; i++) observe(win.frames[i]);
    } catch (_) {}
  };

  observe(window);
  setInterval(() => sync(), 1500);
})();