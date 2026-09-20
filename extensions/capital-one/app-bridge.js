chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "CAPITAL_ONE_BALANCE") return;
  window.postMessage({
    source: "money-hub-extension",
    type: "CAPITAL_ONE_BALANCE",
    balance: message.balance,
    accountName: message.accountName || "Capital One"
  }, window.location.origin);
});