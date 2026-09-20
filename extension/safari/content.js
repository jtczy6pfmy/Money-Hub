function sendDetectedBalances() {
  browser.runtime.sendMessage({
    type: "MONEY_HUB_BALANCES_DETECTED",
    balances: detectMoneyHubBalances(document)
  });
}

sendDetectedBalances();

const observer = new MutationObserver(() => {
  clearTimeout(window.__moneyHubDetectTimer);
  window.__moneyHubDetectTimer = setTimeout(sendDetectedBalances, 500);
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "MONEY_HUB_RESCAN") return;
  sendDetectedBalances();
});
