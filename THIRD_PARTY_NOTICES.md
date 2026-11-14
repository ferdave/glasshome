# Third-party notices

Glass Home builds on the work of these projects. Thank you to their authors.

## Code and assets included in this repository

| What | Where in this repo | Project | Licence |
|---|---|---|---|
| Scene engine, frosted "glass" clock with scenery in front of the digits, sun/weather scene rule, waterline reflection (adapted) | `app/src/main/assets/web/core.js` (`startScenes`), `app.css` (scenes section) | [couch-tv](https://github.com/Seagey/couch-tv) by Seagey | MIT — [`licenses/couch-tv-MIT.txt`](licenses/couch-tv-MIT.txt) |
| Scene images `scene-*.jpg`, cut-outs `scene-*-fg.webp`, glass copies `scene-*-glass.jpg` | `app/src/main/assets/web/scenes/` | [couch-tv](https://github.com/Seagey/couch-tv) (AI-generated for couch-tv; its credits say "use them however you like") | MIT — [`licenses/couch-tv-MIT.txt`](licenses/couch-tv-MIT.txt) |
| Privacy cleanup list — Google entries and the safety rules | `app/src/main/assets/web/privacy-list.js` | [couch-tv](https://github.com/Seagey/couch-tv) `tv-home/tools/privacy-list.txt` (which cites the UAD-ng list) | MIT — [`licenses/couch-tv-MIT.txt`](licenses/couch-tv-MIT.txt) |
| Antonio font (Light 300, latin subset) | `app/src/main/assets/web/scenes/antonio-latin-300.woff2` | [Antonio](https://github.com/googlefonts/antonioFont) — The Antonio Project Authors, via couch-tv | SIL Open Font License 1.1 — [`licenses/Antonio-OFL.txt`](licenses/Antonio-OFL.txt) |
| White app logos: Netflix, YouTube, Kodi, F1, Jellyfin, CBC, Spotify | `app/src/main/assets/web/logos/` | [Simple Icons](https://simpleicons.org) 16.37.0 | CC0 1.0 — `logos/SIMPLE-ICONS-LICENSE.md` |
| White app logos: Disney+, Prime Video | `app/src/main/assets/web/logos/` | [Custom Brand Icons](https://github.com/elax46/custom-brand-icons) @ 97f1a39 | MIT — `logos/CUSTOM-BRAND-ICONS-LICENSE.txt` |

Brand logos identify the services they belong to; their owners keep all trademark rights. Glass Home is not affiliated with any of them.

## Design inspiration

| Project | What was borrowed | Licence |
|---|---|---|
| [CleanFrame](https://github.com/nthnclrk/CleanFrame) by Nathan Clark | The overall look: full-bleed wallpaper, small clock, thin line icons, wide smoked-glass panels, white logo dock. No code was copied. | MIT — [`licenses/CleanFrame-MIT.txt`](licenses/CleanFrame-MIT.txt) |
| [couch-tv](https://github.com/Seagey/couch-tv) | Feature ideas (scenes, quick buttons, privacy cleanup) in addition to the code above. | MIT |

## Services and libraries used at runtime (not included)

| What | Used for | Terms |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | Weather forecast and air quality | Free non-commercial API; data **CC BY 4.0** — "Weather data by Open-Meteo.com" (also shown on the Weather screen) |
| [go2rtc](https://github.com/AlexxIT/go2rtc) by AlexxIT | Camera streams (snapshots, MJPEG, WebRTC/MSE player) — runs on your own server | MIT |
| [Hubitat](https://hubitat.com) Maker API | Smart-home devices — runs on your own hub | Hubitat terms |
| [Google Fonts](https://fonts.google.com): Manrope, Geist, Newsreader | UI fonts, loaded from Google Fonts | SIL Open Font License 1.1 |
| Android SDK / Gradle | Building the app | Apache 2.0 |
