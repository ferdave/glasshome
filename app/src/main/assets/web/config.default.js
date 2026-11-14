// Built-in defaults. Anything in config.json on the TV overrides these
// (pushed to /sdcard/Android/data/app.glasshome.launcher/files/config.json).
// Secrets (the Hubitat token) live ONLY in config.json on the TV, never here.
window.GLASS_DEFAULTS = {
  // App logos: "mono" (default: each official icon turned into a white logo, no colour),
  // "custom" (your own white PNGs in files/logos/<package>.png, others fall back to mono),
  // "color" (official colour icon), "banner" (official wide colour TV banner)
  iconStyle: "mono",
  labels: "both",            // "both" | "icons" | "names"
  font: "Manrope",           // "Manrope" | "Geist" | "Newsreader"
  blur: true,                // set false if the TV feels sluggish (frosted glass is GPU-heavy)
  clock24h: false,

  // Weather + scene timing. Set your own in config.json (this default is just an example).
  location: { name: "London", lat: 51.5072, lon: -0.1276, timezone: "Europe/London" },

  // Hubitat Maker API: host (hub IP) and appId go in config.json together with the token.
  hubitat: { host: "", appId: "" },

  // Dock order (by screen time on this TV, Jellyfin moved before Prime Video by request).
  // Missing apps are skipped; Settings is always last.
  dock: [
    "com.netflix.ninja",
    "com.google.android.youtube.tv",
    "org.xbmc.kodi",
    "com.disney.disneyplus",
    "com.formulaone.production",
    "org.jellyfin.androidtv",
    "com.amazon.amazonvideo.livingroom",
    "ca.cbc.android.cbctv",
    "com.spotify.tv.android"
  ],

  // Hubitat device IDs (from the Maker API device list) — set yours in config.json.
  // Light names come from Hubitat itself; the two labels below are shown on the cards.
  devices: {
    lock: null,           // smart lock
    lockLabel: "Smart lock",
    doorContact: null,    // door contact sensor
    porchLight: null,     // light/plug by the door
    lights: [],           // up to 6 light/switch IDs
    garageTemp: null,     // a temperature sensor
    tempLabel: "Garage"
  },

  // Cameras come from go2rtc (e.g. "http://192.168.1.50:1984"). Empty = placeholders.
  go2rtc: "",
  cameras: [
    { name: "Protect", src: "protect" },
    { name: "Doorbell", src: "doorbell", doorbell: true },
    { name: "Wyze Cam v2 #1", src: "wyze_v2_1" },
    { name: "Wyze Cam v2 #2", src: "wyze_v2_2" },
    { name: "Wyze Cam v3", src: "wyze_v3" },
    { name: "Wyze Pan v3 #1", src: "wyze_pan_1" },
    { name: "Wyze Pan v3 #2", src: "wyze_pan_2" }
  ],

  // Home background: "scenes" (couch-tv style scenes with the big glass clock, picked by the sun
  // and the weather; can be changed in Glass Home settings) or "wallpapers" (the photos below).
  theme: "scenes",

  // Wallpapers ("wallpapers" theme): drop images into files/wallpapers/<set>/ on the TV, sets:
  // morning, day, evening, night, rain, snow (any you skip fall back to the others).
  // "urls" can add images hosted on your network: { "day": ["http://.../a.jpg"] }
  wallpapers: { intervalMinutes: 15, fadeSeconds: 3, urls: {} },

  pollSeconds: 10,

  debugNav: false  // true = log remote presses to the console (for debugging)
};
