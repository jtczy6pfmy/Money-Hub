(() => {
  const SELECTOR = ".primary-detail__balance__dollar";
  let lastValue = null;
  function parseMoney(text) {
    const value = Number(String(text || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? value : null;
  }
  function findBalance() {
    for (const node of document.querySelectorAll(SELECTOR)) {
      const value = parseMoney(node.textContent);
      if (value !== null) return value;
    }
    return null;
  }
  function sendToMoneyHub() {
    const balance = findBalance();
    if (balance === null || balance === lastValue) return;
    lastValue = balance;
    chrome.runtime.sendMessage({type: "CAPITAL_ONE_BALANCE", balance});
  }
  sendToMoneyHub();
  new MutationObserver(sendToMoneyHub).observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  setInterval(sendToMoneyHub, 5000);
})();