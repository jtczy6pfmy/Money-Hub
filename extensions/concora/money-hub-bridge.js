(typeof browser !== "undefined" ? browser : chrome).runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CONCORA_ACCOUNTS") {
    window.postMessage({
      type: "MONEY_HUB_CONCORA_ACCOUNTS",
      accounts: Array.isArray(msg.accounts) ? msg.accounts : [],
      source: "money-hub-concora-extension"
    }, window.location.origin);
  }
});