(typeof browser !== "undefined" ? browser : chrome).runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === "CAPITAL_ONE_BALANCE") {
    const tabs = await (typeof browser !== "undefined" ? browser : chrome).tabs.query({url:["https://jtczy6pfmy.github.io/Money-Hub/*"]});
    for (const tab of tabs) if (tab.id) (typeof browser !== "undefined" ? browser : chrome).tabs.sendMessage(tab.id,msg).catch(()=>{});
  }

  if (msg?.type === "REQUEST_CAPITAL_ONE_SYNC") {
    const tabs = await (typeof browser !== "undefined" ? browser : chrome).tabs.query({url:["https://*.capitalone.com/*"]});
    for (const tab of tabs) if (tab.id) {
      (typeof browser !== "undefined" ? browser : chrome).tabs.sendMessage(tab.id,{type:"REQUEST_CAPITAL_ONE_SYNC"}).catch(()=>{});
    }
  }
});