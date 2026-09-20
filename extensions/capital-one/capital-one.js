(() => {
  let last = null;
  function readBalance() {
    const el = document.querySelector(".primary-detail__balance__dollar");
    if (!el) return null;
    const value = Number((el.textContent || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? value : null;
  }
  function sync() {
    const balance = readBalance();
    if (balance === null || balance === last) return;
    last = balance;
    chrome.runtime.sendMessage({ type: "CAPITAL_ONE_BALANCE", balance });
  }
  sync();
  new MutationObserver(sync).observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  setInterval(sync, 5000);
})();