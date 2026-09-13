# Mela typefaces

Downloaded unchanged on 2026-09-13 from Google Fonts' official delivery service.
Both are Latin variable WOFF2 subsets, normal style, weights 400–700. Other
scripts use the system fallback; these files do not claim Indic-script coverage.
The accompanying SIL Open Font Licenses must stay with these assets.

- Outfit: https://github.com/Outfitio/Outfit-Fonts
  - File: https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtq.woff2
  - License: https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/OFL.txt
- DM Sans: https://github.com/googlefonts/dm-fonts
  - File: https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2
  - License: https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt

`index.html` loads `fonts.css` and preloads both font files from the same origin.
No runtime Google Fonts request is required. Changing font binaries requires new
filenames so cached clients do not retain the old version.
