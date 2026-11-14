# Glass Home

A home-screen app for **Google TV / Android TV** with a calm, frosted-glass look: a big glass clock over
full-screen scenes, a dock of white app logos, a smart-home widget and dashboard (Hubitat), live cameras
(go2rtc), an iOS-style weather screen and a privacy cleanup screen.

Built for and tested on a Hisense Google TV (Android 14), 1920×1080 UI. Works with the TV remote only.

## Features

**Home screen**
- **Scenes + big glass clock** — five scenes (night, dawn, golden hour, waterline, fog) picked by the sun's
  position and the weather at your location; the scenery is drawn in front of the clock digits.
  Adapted from [couch-tv](https://github.com/Seagey/couch-tv) (MIT).
- Date + current weather line (opens the weather screen).
- **Quick buttons**: HDMI/AV inputs, the TV's picture settings, a screensaver (the scene + clock full screen),
  all apps, Glass Home settings.
- **Smart-home widget (3×3)**: lock (with battery), two camera stills, five lights (OK toggles), a temperature
  sensor, and an "Open dashboard" button. OK on a camera opens it full screen.
- **Dock** of your apps with white logos (official icons turned white, or bundled white brand logos).

**Dashboard** (`dashboard.html`) — lights, front-door card (lock with battery, door sensor, door light;
unlock needs two presses), temperature, and cameras. Tabs: All · Lights · Security.
Camera tiles show stills refreshed every 5 s; OK opens live video full screen.

**Weather** (`weather.html`) — Now · Hourly (temperature curve, chance of precipitation and mm per hour, any of
7 days) · 7-day. Data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0).

**Settings** (`settings.html`) — choose a fixed scene or Auto; privacy cleanup status.

**Privacy cleanup** — a list of tracking / ad / promo apps (`privacy-list.js`). Glass Home shows whether each
one is on or off; `privacy.ps1` switches them off (or back on) from a PC with adb. Nothing is uninstalled.

## How it works

- `MainActivity.java` is a full-screen WebView that loads the pages in `app/src/main/assets/web/` and exposes a
  small bridge (`window.GlassHome`): list/open apps (with white logos), Hubitat Maker API calls,
  HDMI inputs, picture settings, a small key/value store, and app on/off state for the privacy screen.
- **Your Hubitat token never reaches the web pages**: Maker API calls are made by the native code.
- Remote arrows/OK are handled by a spatial-navigation layer in `core.js`.

## Setup

1. Build: JDK 17, Android SDK (platform 34, build-tools 34.0.0), Gradle 8.7

   ```bash
   gradle :app:assembleDebug
   ```

   → `app/build/outputs/apk/debug/app-debug.apk`
2. Turn on *Developer options → Wireless debugging* on the TV, pair with `adb pair`, then

   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. Copy `config.example.json` to `config.json`, fill in your Hubitat hub, Maker API app id + token, device IDs,
   location, go2rtc address and cameras, then push it to the TV:

   ```powershell
   .\push-config.ps1 -Tv <tv-ip>:<port> -Adb <path to adb>
   ```

   `config.json` is git-ignored — keep it private. Anything in `assets/web/config.default.js` can be overridden.

### Cameras (go2rtc)

`cameras[].src` = go2rtc stream name (used for stills). Optional `cameras[].mjpeg` = a go2rtc MJPEG transcode
used for full-screen live video — useful when the TV's web view can't play the camera's codec (e.g. H.265):

```yaml
streams:
  driveway_mjpeg: "ffmpeg:driveway#video=mjpeg#width=1280"
```

### Make it the Home button

Google TV keeps its own launcher in front, so making Glass Home the Home button means disabling it
(reversible):

```bash
adb shell pm disable-user --user 0 com.google.android.apps.tv.launcherx
```

Undo:

```bash
adb shell pm enable com.google.android.apps.tv.launcherx
```

## Credits

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). In short: scenes, glass clock and privacy list from
[couch-tv](https://github.com/Seagey/couch-tv) (MIT); look inspired by
[CleanFrame](https://github.com/nthnclrk/CleanFrame) (MIT); logos from [Simple Icons](https://simpleicons.org)
(CC0) and [Custom Brand Icons](https://github.com/elax46/custom-brand-icons) (MIT); Antonio font (OFL);
weather by [Open-Meteo](https://open-meteo.com); cameras via [go2rtc](https://github.com/AlexxIT/go2rtc).

Brand logos belong to their owners; this project is not affiliated with any of them.
