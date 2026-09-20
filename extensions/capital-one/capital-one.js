(() => {
  let last = null;

  function readBalance() {
    const nodes = Array.from(document.querySelectorAll(
      ".primary-detail__balance__dollar, [class*='primary-detail__balance__dollar']"
    ));

    const visible = nodes.filter(el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    });

    const candidates = visible.map(el => {
      const raw = (el.textContent || "").trim();
      const value = Number(raw.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(value) ? value : null;
    }).filter(v => v !== null);

    return candidates.length ? candidates[0] : null;
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
    if (msg?.type === "REQUEST_CAPITAL_ONE_SYNC") sync(true);
  });

  sync();
  new MutationObserver(() => sync()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(() => sync(), 3000);
})();