chrome.runtime.onMessage.addListener(async (message) => {
  if (!message || message.type !== "CAPITAL_ONE_BALANCE") return;
  const tabs = await chrome.tabs.query({url: "https://jtczy6pfmy.github.io/Money-Hub/*"});
  for (const tab of tabs) {
    if (!tab.id) continue;
    try { await chrome.tabs.sendMessage(tab.id, message); return; } catch (_) {}
  }
});