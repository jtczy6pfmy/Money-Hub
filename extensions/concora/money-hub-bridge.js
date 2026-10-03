const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CONCORA_ACCOUNTS") {
    window.postMessage({
      type: "MONEY_HUB_CONCORA_ACCOUNTS",
      accounts: Array.isArray(msg.accounts) ? msg.accounts : [],
      source: "money-hub-concora-extension"
    }, window.location.origin);
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.type === "MONEY_HUB_REQUEST_CONCORA_REFRESH") {
    api.runtime.sendMessage({ type: "CONCORA_REFRESH" });
  }
});


window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.type === "MONEY_HUB_REQUEST_CONCORA_REFRESH") {
    (typeof browser !== "undefined" ? browser : chrome).runtime.sendMessage({ type: "CONCORA_REFRESH" });
  }
});
