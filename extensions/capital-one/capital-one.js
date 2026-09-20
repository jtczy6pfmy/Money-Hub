(() => {
  let last = null;

  function readDocument(doc) {
    const nodes = Array.from(doc.querySelectorAll(
      ".primary-detail__balance__dollar, [class*='primary-detail__balance__dollar']"
    ));

    const parse = (raw) => {
      const text = String(raw || "").replace(/\u00a0/g, " ").trim();
      const matches = text.match(/-?\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?/g) || [];
      return matches.map(x => Number(x.replace(/[^0-9.-]/g, "")))
        .filter(Number.isFinite);
    };

    const values = [];
    for (const el of nodes) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" ||
          style.opacity === "0" || rect.width <= 0 || rect.height <= 0) continue;

      for (const source of [
        el.textContent,
        el.innerText,
        el.getAttribute("aria-label"),
        el.getAttribute("title")
      ]) {
        values.push(...parse(source));
      }
    }

    const nonZero = values.filter(v => v !== 0);
    return nonZero.length ? nonZero[0] : (values.length ? values[0] : null);
  }

  function readBalance() {
    const values = [];

    const visit = (win) => {
      try {
        const value = readDocument(win.document);
        if (Number.isFinite(value)) values.push(value);

        for (let i = 0; i < win.frames.length; i++) {
          visit(win.frames[i]);
        }
      } catch (_) {
        // Cross-origin frames are intentionally skipped.
      }
    };

    visit(window);

    const nonZero = values.filter(v => v !== 0);
    return nonZero.length ? nonZero[0] : (values.length ? values[0] : null);
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