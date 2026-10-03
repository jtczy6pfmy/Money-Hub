(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  let lastSignature = "";

  function parseMoney(raw) {
    const text = String(raw || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const matches = [...text.matchAll(/-?\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/g)];
    const values = matches.map(m => Number(m[1].replace(/,/g, ""))).filter(Number.isFinite);
    return values.length ? values[0] : null;
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function cleanName(raw) {
    return String(raw || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.(png|jpe?g|webp|svg)(\?.*)?$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }

  function cardName(container) {
    // The card names in Concora's summary are rendered inside the card artwork,
    // so they may not exist as normal text nodes. Check image accessibility
    // metadata and the image URL before falling back to headings.
    const imageHints = [];
    for (const img of container.querySelectorAll("img")) {
      for (const value of [
        img.getAttribute("alt"),
        img.getAttribute("title"),
        img.getAttribute("aria-label"),
        img.getAttribute("data-name"),
        img.getAttribute("data-card-name"),
        img.getAttribute("src"),
        img.getAttribute("currentSrc")
      ]) {
        const hint = cleanName(value);
        if (hint) imageHints.push(hint);
      }
    }

    const knownBrands = [
      { re: /\bindigo\b/i, name: "Indigo" },
      { re: /\bmilestone\b/i, name: "Milestone" },
      { re: /\bdestiny\b/i, name: "Destiny" }
    ];
    for (const hint of imageHints) {
      const known = knownBrands.find(x => x.re.test(hint));
      if (known) return known.name;
    }

    for (const hint of imageHints) {
      if (!/^(image|img|card|credit|logo|png|jpg|jpeg|webp|svg)$/i.test(hint) && hint.length <= 80) {
        return hint;
      }
    }

    const excluded = /^(current balance|available credit|credit limit|payment|amount due|minimum payment|due date|account|summary|overview|details|manage|make a payment|view details)$/i;
    const nodes = container.querySelectorAll("h1,h2,h3,h4,h5,[role='heading'],strong,[class*='title'],[class*='name'],span,div");
    for (const el of nodes) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 80 || excluded.test(text)) continue;
      if (/^-?\$?[0-9,]+(?:\.\d{1,2})?$/.test(text)) continue;
      if (/^(image|img|card|credit|logo|png|jpg|jpeg|webp|svg)$/i.test(text)) continue;
      return text;
    }
    return null;
  }

  function extract() {
    const results = [];
    const balanceNodes = Array.from(document.querySelectorAll("body *")).filter(el => {
      if (!visible(el)) return false;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      return /current\s+balance/i.test(text) && /\$\s*[0-9]/.test(text) && text.length < 700;
    });

    for (const node of balanceNodes) {
      let container = node;
      for (let i = 0; i < 8 && container.parentElement; i++) {
        const text = (container.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length >= 40 && text.length <= 700) {
          const money = parseMoney(text);
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

  sync(true);
  new MutationObserver(() => sync()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
  setInterval(() => sync(), 2000);
})();
