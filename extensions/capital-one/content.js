(() => {
  const SELECTOR = ".primary-detail__balance__dollar";
  let lastValue = null;

  function parseMoney(text) {
    const cleaned = String(text || "").replace(/[^0-9.-]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  function findBalance() {
    const nodes = document.querySelectorAll(SELECTOR);
    for (const node of nodes) {
      const value = parseMoney(node.textContent);
      if (value !== null) return value;
    }
    return null;
  }

  function sendToMoneyHub() {
    const balance = findBalance();
    if (balance === null || balance === lastValue) return;
    lastValue = balance;
    window.postMessage({
      source: "money-hub-extension",
      type: "CAPITAL_ONE_BALANCE",
      balance
    }, "*");
  }

  sendToMoneyHub();
  new MutationObserver(sendToMoneyHub).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(sendToMoneyHub, 5000);
})();