# Money Hub Safari Extension

Safari uses the Web Extension format but packages the extension inside a Safari App Extension project.

The reusable extension assets are the same Money Hub assets used by Chrome/Firefox:
- ../shared/config.js
- ../shared/detector.js

For Safari, import the extension into Xcode using **File → New → Project → Safari Extension App** and place the shared detector/config plus Safari-specific popup/content files in the generated Safari Web Extension target.

Safari requires Apple/Xcode packaging and signing for distribution. The Money Hub web app remains the shared destination:
https://jtczy6pfmy.github.io/Money-Hub/
