function parseMoneyValue(value) {
  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/[$,]/g, "")
    .replace(/[^0-9.\-()]/g, "");
  if (!cleaned) return null;
  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  const normalized = cleaned.replace(/[()]/g, "");
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return negative ? -number : number;
}

function detectMoneyHubBalances(root = document) {
  const found = [];
  const seen = new Set();

  for (const selector of MONEY_HUB_CONFIG.balanceSelectors) {
    for (const element of root.querySelectorAll(selector)) {
      const raw = element.textContent?.trim();
      const value = parseMoneyValue(raw);
      if (value === null) continue;

      const item = {
        value,
        raw,
        selector,
        label: findNearbyLabel(element)
      };

      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        found.push(item);
      }
    }
  }

  return found;
}

function findNearbyLabel(element) {
  const parent = element.closest("section, article, [role='main'], [class*='account'], [class*='card'], [class*='balance']");
  if (!parent) return "";
  const heading = parent.querySelector("h1,h2,h3,h4,[aria-label]");
  return heading?.textContent?.trim() || heading?.getAttribute("aria-label") || "";
}
