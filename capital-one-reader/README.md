# Money Hub Capital One Balance Reader

This is a Firefox/Chrome Manifest V3 extension for Money Hub.

## What it does

1. On the Capital One account-summary page, it adds **Capture balance for Money Hub**.
2. It reads the visible balance from the Capital One DOM element:

   `.primary-detail__balance__dollar`

3. It stores the captured amount locally in the browser and copies the numeric amount to the clipboard.
4. On Money Hub, it adds **Import Capital One balance** and sends the captured amount to the Money Hub page.

## Install locally

1. Download this `capital-one-reader` folder.
2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Choose `manifest.json` inside this folder.
5. Open Capital One, capture the balance, then open Money Hub and import it.

The extension does not request or store Capital One passwords, cookies, tokens, or authorization headers.

> The Money Hub page must have a matching message handler before the imported amount can be saved to Supabase. The current extension safely delivers the captured amount to the page through `window.postMessage`.
