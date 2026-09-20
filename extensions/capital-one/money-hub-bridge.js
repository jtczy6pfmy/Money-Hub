chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CAPITAL_ONE_BALANCE") {
    window.postMessage({type:"MONEY_HUB_CAPITAL_ONE_BALANCE", balance:msg.balance}, window.location.origin);
  }
});
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.type === "MONEY_HUB_REQUEST_CAPITAL_ONE_SYNC") {
    chrome.runtime.sendMessage({type:"REQUEST_CAPITAL_ONE_SYNC"});
  }
});