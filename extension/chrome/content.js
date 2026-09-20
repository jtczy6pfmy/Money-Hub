function sendDetectedBalances() {
  const balances = detectMoneyHubBalances(document);
  chrome.runtime.sendMessage({
    type: "MONEY_HUB_BALANCES_DETECTED",
    balances
  });
}

sendDetectedBalances();

const observer = new MutationObserver(() => {
  clearTimeout(window.__moneyHubDetectTimer);
  window.__moneyHubDetectTimer = setTimeout(sendDetectedBalances, 500);
});

observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
