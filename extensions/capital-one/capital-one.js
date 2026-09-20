(() => {
  let last = null;

  function readBalance() {
    const nodes = Array.from(document.querySelectorAll(
      ".primary-detail__balance__dollar, [class*='primary-detail__balance__dollar']"
    ));

    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.width > 0 &&
        rect.height > 0;
    };

    const parse = (raw) => {
      const text = String(raw || "").replace(/\u00a0/g, " ").trim();
      const matches = text.match(/-?\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?/g) || [];
      const values = matches.map(x => Number(x.replace(/[^0-9.-]/g, "")))
        .filter(Number.isFinite);
      return values.length ? values : [];
    };

    // Read each representation separately. Capital One can expose a
    // placeholder through innerText while the actual amount remains in
    // textContent (for example, the element can visually show 0 while its
    // DOM text contains the account balance).
    const values = [];
    for (const el of nodes.filter(visible)) {
      const sources = [
        el.textContent,
        el.innerText,
        el.getAttribute("aria-label"),
        el.getAttribute("title")
      ];

      for (const source of sources) {
        values.push(...parse(source));
      }
    }

    const nonZero = values.filter(v => v !== 0);
    if (nonZero.length) return nonZero[0];
    if (values.length) return values[0];

    return null;
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