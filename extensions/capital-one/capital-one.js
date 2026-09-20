(() => {
  let last = null;

  function readBalance() {
    const el = document.querySelector(".primary-detail__balance__dollar");
    if (!el) return null;
    const value = Number((el.textContent || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  function sync(force = false) {
    const balance = readBalance();
    if (balance === null || (!force && balance === last)) return;
    last = balance;
    (typeof browser !== "undefined" ? browser : chrome).runtime.sendMessage({ type: "CAPITAL_ONE_BALANCE", balance });
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
  setInterval(() => sync(), 5000);
})();