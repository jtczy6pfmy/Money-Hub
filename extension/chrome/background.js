chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "MONEY_HUB_BALANCES_DETECTED") return;
  chrome.storage.session.set({
    lastBalances: message.balances || [],
    lastUrl: sender.tab?.url || "",
    lastTitle: sender.tab?.title || ""
  });
});
