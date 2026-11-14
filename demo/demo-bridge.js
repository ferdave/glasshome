/* Glass Home — web demo.
 * Stands in for the Android bridge (window.GlassHome in MainActivity.java) so the real pages run in a
 * desktop browser with made-up smart-home data. Loaded before config.default.js by demo/build.sh.
 * Nothing here talks to a real hub, camera or TV. */
(function () {
  "use strict";
  var REPO = "https://github.com/ferdave/glasshome";

  // ---------- demo config (what config.json would hold on the TV, minus the token) ----------
  var CONFIG = {
    location: { name: "Toronto", lat: 43.6532, lon: -79.3832, timezone: "America/Toronto" },
    devices: {
      lock: 1, lockLabel: "Front door lock",
      doorContact: 2, porchLight: 3,
      lights: [4, 5, 6, 7, 8, 9],
      garageTemp: 10, tempLabel: "Garage"
    },
    // Fake go2rtc: stills are drawn by demo-cams/cam.js, live view is demo-cams/stream.html
    go2rtc: "demo-cams",
    cameras: [
      { name: "Lakefront", src: "lakefront" },
      { name: "Dock", src: "dock" },
      { name: "Ridge", src: "ridge" },
      { name: "Valley", src: "valley" },
      { name: "Trail · night", src: "trail" }
    ],
    _hubitatReady: true,
    _configPath: "(web demo)"
  };

  // ---------- fake Hubitat devices (Maker API "devices/all" shape), kept per browser tab ----------
  var DEVICES = [
    { id: 1, label: "Front door lock", attributes: { lock: "locked", battery: 78 } },
    { id: 2, label: "Front door", attributes: { contact: "closed" } },
    { id: 3, label: "Porch light", attributes: { "switch": "off" } },
    { id: 4, label: "Living room", attributes: { "switch": "on" } },
    { id: 5, label: "Kitchen", attributes: { "switch": "on" } },
    { id: 6, label: "Hallway", attributes: { "switch": "off" } },
    { id: 7, label: "Bedroom", attributes: { "switch": "off" } },
    { id: 8, label: "Office", attributes: { "switch": "on" } },
    { id: 9, label: "Patio", attributes: { "switch": "off" } },
    { id: 10, label: "Garage sensor", attributes: { temperature: 11.4, battery: 34 } }
  ];
  var KEY = "glassdemo.devices";
  function load() {
    try { var s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (s) return s; } catch (e) {}
    return JSON.parse(JSON.stringify(DEVICES));
  }
  function save(d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  function hub(path) {
    var devs = load();
    if (path === "devices/all") return devs;
    var m = /^devices\/(\d+)\/(\w+)/.exec(path);
    if (!m) throw new Error("unknown path");
    var d = devs.filter(function (x) { return String(x.id) === m[1]; })[0];
    if (!d) throw new Error("no such device");
    var cmd = m[2];
    if (cmd === "on" || cmd === "off") d.attributes["switch"] = cmd;
    else if (cmd === "lock") d.attributes.lock = "locked";
    else if (cmd === "unlock") d.attributes.lock = "unlocked";
    save(devs);
    return d;
  }

  var APPS = [
    ["com.netflix.ninja", "Netflix"], ["com.google.android.youtube.tv", "YouTube"], ["org.xbmc.kodi", "Kodi"],
    ["com.disney.disneyplus", "Disney+"], ["com.formulaone.production", "F1 TV"], ["org.jellyfin.androidtv", "Jellyfin"],
    ["com.amazon.amazonvideo.livingroom", "Prime Video"], ["ca.cbc.android.cbctv", "CBC Gem"], ["com.spotify.tv.android", "Spotify"]
  ];
  function appName(pkg) { var a = APPS.filter(function (x) { return x[0] === pkg; })[0]; return a ? a[1] : pkg; }

  function say(msg) { if (window.toast) window.toast(msg); }
  function reply(cbId, fn) {
    setTimeout(function () {
      var ok = true, body;
      try { body = JSON.stringify(fn()); } catch (e) { ok = false; body = String(e.message); }
      window.__glassCb && window.__glassCb(cbId, ok, body);
    }, 120 + Math.random() * 180);
  }

  window.GlassHome = {
    getConfig: function () { return JSON.stringify(CONFIG); },
    reloadConfig: function () {},
    getApps: function (cbId) {
      reply(cbId, function () {
        return APPS.map(function (a) { return { pkg: a[0], label: a[1], icon: "", mono: "", banner: "", custom: "" }; });
      });
    },
    launch: function (pkg) { say("Demo: on the TV this opens " + appName(pkg)); },
    openSettings: function () { say("Demo: on the TV this opens Android settings"); },
    openTvSettings: function () { say("Demo: on the TV this opens Android settings"); },
    hub: function (path, cbId) { reply(cbId, function () { return hub(path); }); },
    listWallpapers: function () { return "{}"; },
    getPref: function (k) { try { return localStorage.getItem("pref." + k) || ""; } catch (e) { return ""; } },
    setPref: function (k, v) { try { localStorage.setItem("pref." + k, v == null ? "" : v); } catch (e) {} },
    listInputs: function () {
      return JSON.stringify([
        { id: "hdmi1", label: "HDMI 1 · Apple TV", connected: true },
        { id: "hdmi2", label: "HDMI 2 · PlayStation", connected: true },
        { id: "hdmi3", label: "HDMI 3", connected: false },
        { id: "av", label: "AV", connected: false }
      ]);
    },
    openInput: function (id) { say("Demo: on the TV this switches to " + id.toUpperCase()); },
    openPicture: function () { say("Demo: on the TV this opens picture settings"); },
    packageStates: function (json) {
      var out = {};
      try {
        JSON.parse(json).forEach(function (pkg, i) { out[pkg] = i % 7 === 6 ? "missing" : i % 5 === 4 ? "on" : "off"; });
      } catch (e) {}
      return JSON.stringify(out);
    }
  };

  // ---------- fake camera stills ----------
  // The pages load stills from <go2rtc>/api/frame.jpeg?src=<camera>; swap those for frames drawn by DemoCams.
  var srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (srcDesc && window.DemoCams) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true, enumerable: true,
      get: function () { return srcDesc.get.call(this); },
      set: function (v) {
        var m = /(^|\/)demo-cams\/api\/frame\.jpeg\?src=([^&]+)/.exec(String(v));
        if (!m) { srcDesc.set.call(this, v); return; }
        var self = this;
        window.DemoCams.still(decodeURIComponent(m[2])).then(
          function (url) { srcDesc.set.call(self, url); },
          function () { srcDesc.set.call(self, v); });
      }
    });
  }

  // ---------- keyboard Back (the TV remote's Back button) ----------
  function isHome() { return /(^\/$|\/index(\.html)?$)/.test(location.pathname); }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Backspace") return;
    var t = e.target;
    if (e.key === "Backspace" && t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    e.preventDefault();
    if (window.onTvBack) {
      // core.js sends any page that isn't index.html home; hosts that drop ".html" would just reload it
      if (isHome()) { for (var i = (window.backHandlers || []).length - 1; i >= 0; i--) if (window.backHandlers[i]()) return; return; }
      window.onTvBack();
    }
  });

  // ---------- demo bar ----------
  document.addEventListener("DOMContentLoaded", function () {
    var css = document.createElement("style");
    css.textContent =
      "#demobar{position:fixed;z-index:2147483000;top:10px;right:10px;display:flex;gap:10px;align-items:center;" +
      "padding:7px 8px 7px 14px;border-radius:999px;font:500 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;" +
      "color:#fff;background:rgba(20,22,28,.55);border:1px solid rgba(255,255,255,.18);" +
      "-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 6px 24px rgba(0,0,0,.25)}" +
      "#demobar .k{opacity:.75}#demobar kbd{font:inherit;padding:1px 6px;border-radius:5px;background:rgba(255,255,255,.14)}" +
      "#demobar a{color:#111;background:#fff;text-decoration:none;padding:5px 12px;border-radius:999px;font-weight:600}" +
      "#demobar a:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      "#demobar button{all:unset;cursor:pointer;opacity:.7;padding:0 6px;font-size:16px}" +
      "#demobar>*{white-space:nowrap}" +
      "@media (max-width:700px){#demobar .k{display:none}#demonote{font-size:11px;padding:4px 8px}}" +
      "#demonote{position:fixed;z-index:2147483000;left:50%;bottom:8px;transform:translateX(-50%);max-width:calc(100% - 32px);box-sizing:border-box;" +
      "padding:5px 12px;border-radius:8px;text-align:center;font:400 12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;" +
      "color:rgba(255,255,255,.75);background:rgba(20,22,28,.5);pointer-events:none}";
    document.head.appendChild(css);
    var bar = document.createElement("div");
    bar.id = "demobar";
    bar.innerHTML =
      "<span><b>Glass Home</b> web demo</span>" +
      "<span class=\"k\"><kbd>←↑→↓</kbd> move · <kbd>Enter</kbd> OK · <kbd>Esc</kbd> back</span>" +
      "<a href=\"" + REPO + "\" target=\"_blank\" rel=\"noopener\">GitHub ↗</a>" +
      "<button type=\"button\" aria-label=\"Hide demo bar\">×</button>";
    bar.querySelector("button").addEventListener("click", function () { bar.remove(); });
    document.body.appendChild(bar);

    var note = document.createElement("div");
    note.id = "demonote";
    note.textContent = "Demo notes: smart-home devices and cameras are simulated. The dock's bounce and edge fade " +
      "(hinting at more apps) are only in this web demo, not in the TV app.";
    document.body.appendChild(note);
  });
})();
