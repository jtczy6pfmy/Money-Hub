(() => {
  const IS_CAPITAL_ONE = /(^|\.)capitalone\.com$/i.test(location.hostname) || location.hostname === 'myaccounts.capitalone.com';
  const IS_MONEY_HUB = location.hostname === 'jtczy6pfmy.github.io' && location.pathname.toLowerCase().startsWith('/money-hub');
  const BUTTON_ID = 'money-hub-capital-one-reader-button';

  const moneyToNumber = (text) => {
    const match = String(text || '').replace(/\s+/g, ' ').match(/\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(value) ? value : null;
  };

  const findBalance = () => {
    const dollar = document.querySelector('.primary-detail__balance__dollar');
    if (!dollar) return null;

    // The dollar element is inside the card summary. Read the nearest summary
    // container so the cents portion, if rendered separately, is included.
    let node = dollar;
    for (let i = 0; i < 5 && node; i += 1) {
      const text = node.textContent || '';
      const value = moneyToNumber(text);
      if (value !== null) return value;
      node = node.parentElement;
    }

    const dollars = Number((dollar.textContent || '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(dollars)) return null;
    const cents = document.querySelector('.primary-detail__balance__cents');
    const centsValue = cents ? String(cents.textContent || '').replace(/[^0-9]/g, '').slice(0, 2).padEnd(2, '0') : '00';
    return dollars + Number(centsValue) / 100;
  };

  const makeButton = (label, onClick) => {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      position: 'fixed',
      right: '22px',
      bottom: '22px',
      zIndex: '2147483647',
      padding: '12px 18px',
      borderRadius: '8px',
      border: '1px solid #ffffff',
      background: '#1769aa',
      color: '#ffffff',
      font: '600 14px Arial, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(0,0,0,.25)'
    });
    button.addEventListener('click', onClick);
    document.body.appendChild(button);
  };

  if (IS_CAPITAL_ONE) {
    const addReader = () => makeButton('Capture balance for Money Hub', async () => {
      const balance = findBalance();
      if (balance === null) {
        alert('Capital One balance element was not found. Open the account summary and try again.');
        return;
      }
      await chrome.storage.local.set({
        moneyHubCapitalOneBalance: {
          amount: balance,
          capturedAt: new Date().toISOString(),
          source: 'visible Capital One account summary'
        }
      });
      try { await navigator.clipboard.writeText(balance.toFixed(2)); } catch (_) {}
      alert(`Captured Capital One balance: $${balance.toFixed(2)}\\nOpen Money Hub and choose Import Capital One balance.`);
    });

    if (document.body) addReader();
    new MutationObserver(addReader).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (IS_MONEY_HUB) {
    makeButton('Import Capital One balance', async () => {
      const result = await chrome.storage.local.get('moneyHubCapitalOneBalance');
      const captured = result.moneyHubCapitalOneBalance;
      if (!captured || !Number.isFinite(Number(captured.amount))) {
        alert('No Capital One balance has been captured yet. Open Capital One first.');
        return;
      }
      window.postMessage({
        source: 'money-hub-capital-one-reader',
        type: 'CAPITAL_ONE_BALANCE',
        amount: Number(captured.amount),
        capturedAt: captured.capturedAt
      }, location.origin);
    });
  }
})();
