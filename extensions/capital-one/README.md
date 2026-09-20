# Money Hub Capital One Browser Extension

This connector does not use Plaid.

It reads the Capital One balance from the page you are already logged into and sends the value to the Money Hub web app when Money Hub is open in the same browser.

Capital One's stable balance selector used here is:

`.primary-detail__balance__dollar`

The extension deliberately does not depend on Angular-generated attributes such as `_ngcontent-*` or `ng-tns-*`.

Next step: add a small extension popup/action that opens Money Hub and provides an explicit "Sync now" control. Safari can use the same content-script logic through a Safari Web Extension wrapper.
