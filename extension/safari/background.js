browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "MONEY_HUB_BALANCES_DETECTED") return;
  return browser.storage.local.set({
    lastBalances: message.balances || [],
    lastUrl: sender.tab?.url || "",
    lastTitle: sender.tab?.title || ""
  });
});
