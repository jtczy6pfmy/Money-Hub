(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  let lastSignature = "";

  function normalize(text) {
    return String(text || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function parseMoney(raw) {
    const text = normalize(raw);
    const matches = [...text.matchAll(/-?\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g)];
    const values = matches
      .map(m => Number(m[1].replace(/,/g, "")))
      .filter(Number.isFinite);
    return values.length ? values[0] : null;
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function cleanName(raw) {
    return normalize(raw)
      .replace(/\.(png|jpe?g|webp|svg)(\?.*)?$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }

  function cardName(container) {
    const excluded = /^(current balance|available credit|credit limit|balance|payment|amount due|minimum payment|due date|account|summary|overview|details|manage|make a payment|view details|credit card)$/i;

    const attrs = ["data-name", "data-card-name", "data-testid", "aria-label", "title"];
    const hints = [];
    for (const el of container.querySelectorAll("*")) {
      for (const attr of attrs) {
        const hint = cleanName(el.getAttribute?.(attr));
        if (hint && hint.length <= 80) hints.push(hint);
      }
      if (el.tagName === "IMG") {
        const hint = cleanName(el.getAttribute("alt") || el.getAttribute("src"));
        if (hint && hint.length <= 100) hints.push(hint);
      }
    }

    const knownBrands = [
      { re: /\bindigo\b/i, name: "Indigo" },
      { re: /\bmilestone\b/i, name: "Milestone" },
      { re: /\bdestiny\b/i, name: "Destiny" }
    ];
    for (const hint of hints) {
      const known = knownBrands.find(x => x.re.test(hint));
      if (known) return known.name;
    }
    for (const hint of hints) {
      if (!excluded.test(hint) && !/^(image|img|card|credit|logo|png|jpg|jpeg|webp|svg)$/i.test(hint) && !/^\d[\d, .-]*$/.test(hint)) {
        return hint;
      }
    }

    const nodes = container.querySelectorAll("h1,h2,h3,h4,h5,[role='heading'],strong,[class*='title'],[class*='name']");
    for (const el of nodes) {
      const text = normalize(el.textContent);
      if (!text || text.length > 80 || excluded.test(text)) continue;
      if (/^-?\$?[0-9,]+(?:\.\d{1,2})?$/.test(text)) continue;
      return text;
    }
    return null;
  }

  function extract() {
    const results = [];
    const candidates = Array.from(document.querySelectorAll("body *")).filter(visible);

    for (const node of candidates) {
      const text = normalize(node.textContent);
      if (!text || text.length < 5 || text.length > 700) continue;

      const hasBalanceLabel = /(?:current\s+)?balance/i.test(text);
      const hasMoney = /-?\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?/.test(text);
      if (!hasBalanceLabel || !hasMoney) continue;

      let container = node;
      for (let i = 0; i < 10 && container?.parentElement; i++) {
        const block = normalize(container.textContent);
        if (block.length >= 20 && block.length <= 700) {
          const money = parseMoney(block);
          const name = cardName(container);
          if (name && money !== null) {
            results.push({ card_name: name, current_balance: money });
            break;
          }
        }
        container = container.parentElement;
      }
    }

    const unique = [];
    const seen = new Set();
    for (const item of results) {
      const key = item.card_name.toLowerCase() + "|" + item.current_balance;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique.slice(0, 10);
  }

  function sync(force = false) {
    const accounts = extract();
    if (!accounts.length) return;
    const signature = JSON.stringify(accounts);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    api.runtime.sendMessage({ type: "CONCORA_ACCOUNTS", accounts });
  }

  api.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "CONCORA_REFRESH") sync(true);
  });

  sync(true);
  new MutationObserver(() => sync()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(() => sync(), 2000);
})();
