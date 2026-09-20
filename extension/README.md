# Money Hub Browser Extensions

Money Hub now has a cross-browser extension foundation for Chrome, Firefox, and Safari.

## What it does

The extension scans supported pages for account balance elements. It intentionally avoids Angular-generated attributes such as `_ngcontent-*` and `ng-tns-*` and instead prefers stable balance classes.

The current example supports HTML like:

<div class="primary-detail__balance__dollar">988</div>

That produces a detected value of **$988.00**.

## Browsers

- Chrome: `extension/chrome/`
- Firefox: `extension/firefox/`
- Safari: `extension/safari/`

## Important

The extension does not automatically submit financial information. The user must click **Use in Money Hub**, which opens Money Hub with the detected value for confirmation.

Safari requires Xcode/Apple packaging and signing; the reusable detector code is shared.

## Future site adapters

Additional financial websites should be added as adapters/selectors instead of hard-coding one site's DOM. Prefer stable classes, labels, semantic attributes, and nearby account headings over framework-generated attributes.
