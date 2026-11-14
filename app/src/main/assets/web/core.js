/* Glass Home — shared code for all pages. */
(function () {
  "use strict";
  const G = window.GlassHome || null; // native bridge (absent in a desktop browser preview)

  // ---------- config ----------
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
  function merge(a, b) {
    const out = Object.assign({}, a);
    for (const k in b) out[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k];
    return out;
  }
  let user = {};
  try { user = G ? JSON.parse(G.getConfig()) : {}; } catch (e) { user = {}; }
  const cfg = merge(window.GLASS_DEFAULTS || {}, user);
  window.cfg = cfg;

  // ---------- native calls ----------
  let seq = 0;
  const pending = {};
  window.__glassCb = function (id, ok, body) {
    const p = pending[id];
    if (!p) return;
    delete pending[id];
    ok ? p.resolve(body) : p.reject(new Error(body));
  };
  function call(fn, ...args) {
    return new Promise((resolve, reject) => {
      const id = "c" + ++seq;
      pending[id] = { resolve, reject };
      G[fn](...args, id);
    });
  }
  function parse(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }

  // Browser preview only (no TV): fake app list so the dock can be checked on a PC.
  const PREVIEW_APPS = [
    ["com.netflix.ninja", "Netflix"], ["com.google.android.youtube.tv", "YouTube"], ["org.xbmc.kodi", "Kodi"],
    ["com.disney.disneyplus", "Disney+"], ["com.formulaone.production", "F1 TV"], ["com.amazon.amazonvideo.livingroom", "Prime Video"],
    ["org.jellyfin.androidtv", "Jellyfin"], ["ca.cbc.android.cbctv", "CBC Gem"], ["com.spotify.tv.android", "Spotify"]
  ].map(([pkg, label]) => ({ pkg, label, icon: "", mono: "", banner: "", custom: "" }));

  const api = {
    native: !!G,
    hubReady: !!(G && cfg._hubitatReady),
    apps: () => (G ? call("getApps").then(parse) : Promise.resolve(PREVIEW_APPS)),
    launch: (pkg) => G && G.launch(pkg),
    settings: () => G && G.openSettings(),
    hub: (path) => (G ? call("hub", path).then(parse) : Promise.reject(new Error("preview"))),
    wallpapers: () => { try { return G ? JSON.parse(G.listWallpapers()) : {}; } catch (e) { return {}; } },
    // small persistent store (native SharedPreferences; localStorage in a browser preview)
    getPref: (k) => { try { return G ? G.getPref(k) : (localStorage.getItem("pref." + k) || ""); } catch (e) { return ""; } },
    setPref: (k, v) => { try { G ? G.setPref(k, v) : localStorage.setItem("pref." + k, v); } catch (e) {} },
    // quick buttons
    inputs: () => { try { return G ? JSON.parse(G.listInputs()) : [{ id: "hdmi1", label: "HDMI 1", connected: true }, { id: "hdmi2", label: "HDMI 2", connected: false }]; } catch (e) { return []; } },
    openInput: (id) => G && G.openInput(id),
    picture: () => G && G.openPicture(),
    packageStates: (list) => { try { return G ? JSON.parse(G.packageStates(JSON.stringify(list))) : {}; } catch (e) { return {}; } }
  };
  window.api = api;

  // ---------- stage scaling + body classes ----------
  function fit() {
    const st = document.getElementById("stage");
    if (!st) return;
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    // Centre the 16:9 stage (letterbox) when the window isn't 16:9, e.g. a PC browser preview.
    const x = Math.max(0, (window.innerWidth - 1920 * s) / 2), y = Math.max(0, (window.innerHeight - 1080 * s) / 2);
    st.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  document.addEventListener("DOMContentLoaded", () => {
    fit();
    if (!cfg.blur) document.body.classList.add("noblur");
    const fonts = { Manrope: "Manrope", Geist: "Geist", Newsreader: "Newsreader" };
    document.documentElement.style.setProperty("--font", (fonts[cfg.font] || "Manrope") + ", system-ui, sans-serif");
  });

  // ---------- helpers ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.$ = $; window.el = el; window.esc = esc;

  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = el("div", "toast glass"); t.id = "toast"; $("#stage").appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.toast = toast;

  // ---------- battery gauge ----------
  // Small battery icon whose fill shrinks with the level: green ≥ 50 %, yellow 20–49 %, red < 20 %.
  function batteryHTML(pct) {
    if (pct == null || pct === "" || isNaN(parseFloat(pct))) return "";
    const p = Math.max(0, Math.min(100, Math.round(parseFloat(pct))));
    const col = p >= 50 ? "#30d158" : p >= 20 ? "#ffd60a" : "#ff453a";
    const w = Math.max(1.5, (18 * p) / 100);
    return '<span class="batt" title="Battery ' + p + '%" style="--batt:' + col + '">' +
      '<svg aria-hidden="true" viewBox="0 0 26 14"><rect x="1" y="1" width="22" height="12" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.75" stroke-width="1.4"/>' +
      '<rect x="24" y="4.5" width="1.8" height="5" rx="0.9" fill="currentColor" fill-opacity="0.75"/>' +
      '<rect x="3" y="3" width="' + w.toFixed(1) + '" height="8" rx="1.5" fill="' + col + '"/></svg>' +
      '<span class="pct">' + p + "%</span></span>";
  }
  window.batteryHTML = batteryHTML;

  // ---------- go2rtc reachability ----------
  // Resolves true if the go2rtc server answers at all (opaque no-cors response), false if the
  // connection is refused / times out. Cached for 30 s.
  let g2rCache = null;
  function go2rtcReachable() {
    if (!cfg.go2rtc) return Promise.resolve(false);
    if (g2rCache && Date.now() - g2rCache.t < 30000) return g2rCache.p;
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 4000);
    const p = fetch(cfg.go2rtc.replace(/\/$/, "") + "/api", { mode: "no-cors", cache: "no-store", signal: ctl ? ctl.signal : undefined })
      .then(() => true, () => false)
      .finally(() => clearTimeout(timer));
    g2rCache = { t: Date.now(), p };
    return p;
  }
  window.go2rtcReachable = go2rtcReachable;

  // ---------- clock ----------
  function fmtTime(d) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    if (!cfg.clock24h) { h = h % 12 || 12; }
    return h + ":" + m;
  }
  window.fmtTime = fmtTime;
  function startClock() {
    const tick = () => document.querySelectorAll("[data-clock]").forEach((n) => (n.textContent = fmtTime(new Date())));
    tick();
    setInterval(tick, 5000);
  }

  // ---------- weather (Open-Meteo, no key) ----------
  const WMO = (c) => {
    if (c === 0) return ["Clear", "sun"];
    if (c === 1) return ["Mainly clear", "sun"];
    if (c === 2) return ["Partly cloudy", "cloud"];
    if (c === 3) return ["Cloudy", "cloud"];
    if (c === 45 || c === 48) return ["Fog", "cloud"];
    if (c >= 51 && c <= 57) return ["Drizzle", "rain"];
    if (c === 66 || c === 67) return ["Freezing rain", "rain"];
    if (c >= 61 && c <= 65) return ["Rain", "rain"];
    if (c >= 71 && c <= 77) return ["Snow", "snow"];
    if (c >= 80 && c <= 82) return ["Showers", "rain"];
    if (c === 85 || c === 86) return ["Snow showers", "snow"];
    if (c >= 95) return ["Thunderstorms", "rain"];
    return ["—", "cloud"];
  };
  window.WMO = WMO;

  function icon(kind, size) {
    const s = size || 40;
    const head = '<svg aria-hidden="true" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">';
    const cloud = '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z"/>';
    const cloudUp = '<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 15z"/>';
    if (kind === "moon") return head + '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
    if (kind === "sun") return head + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    if (kind === "rain") return head + cloudUp + '<path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>';
    if (kind === "snow") return head + cloudUp + '<path d="M8 19h.01M12 20h.01M16 19h.01M10 22h.01M14 22h.01"/></svg>';
    return head + cloud + "</svg>";
  }
  window.wxIcon = icon;

  async function weather(force) {
    const KEY = "glass.wx2";
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!force && c && Date.now() - c.t < 10 * 60 * 1000) return c.d;
    } catch (e) {}
    const L = cfg.location;
    const q = "latitude=" + L.lat + "&longitude=" + L.lon + "&timezone=" + encodeURIComponent(L.timezone);
    const fUrl = "https://api.open-meteo.com/v1/forecast?" + q +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day" +
      "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,precipitation_probability_max,sunrise,sunset" +
      "&forecast_days=7&wind_speed_unit=kmh";
    const aUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?" + q + "&current=us_aqi";
    const [f, a] = await Promise.all([
      fetch(fUrl).then((r) => r.json()),
      fetch(aUrl).then((r) => r.json()).catch(() => null)
    ]);
    const d = { f, aqi: a && a.current ? a.current.us_aqi : null };
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
    return d;
  }
  window.weather = weather;

  // ---------- wallpapers: rotate, crossfade, match time of day + weather ----------
  function wallSets() {
    const local = api.wallpapers();
    const urls = (cfg.wallpapers && cfg.wallpapers.urls) || {};
    const sets = {};
    [local, urls].forEach((src) => Object.keys(src).forEach((k) => { sets[k] = (sets[k] || []).concat(src[k] || []); }));
    return sets;
  }
  function period(now, sunrise, sunset) {
    const H = 3600e3;
    if (now < sunrise - 0.5 * H || now > sunset + H) return "night";
    if (now < sunrise + 3 * H) return "morning";
    if (now > sunset - 1.5 * H) return "evening";
    return "day";
  }
  async function pickSet() {
    const sets = wallSets();
    const any = Object.values(sets).flat();
    if (!any.length) return [];
    let per = "day", kind = "cloud";
    try {
      const w = await weather();
      const now = Date.now();
      per = period(now, new Date(w.f.daily.sunrise[0]).getTime(), new Date(w.f.daily.sunset[0]).getTime());
      kind = WMO(w.f.current.weather_code)[1];
    } catch (e) {
      const h = new Date().getHours();
      per = h < 6 || h >= 21 ? "night" : h < 10 ? "morning" : h >= 17 ? "evening" : "day";
    }
    const order = [];
    if ((kind === "rain" || kind === "snow") && sets[kind] && sets[kind].length) order.push(kind);
    order.push(per);
    if (per === "morning" || per === "evening") order.push("day");
    for (const k of order) if (sets[k] && sets[k].length) return sets[k];
    return any;
  }
  function startWallpaper() {
    const stage = $("#stage");
    if (!stage) return;
    const a = el("div", "wall"), b = el("div", "wall");
    const fb = $(".wall-fallback", stage);
    stage.insertBefore(b, fb ? fb.nextSibling : stage.firstChild);
    stage.insertBefore(a, b);
    const fade = ((cfg.wallpapers && cfg.wallpapers.fadeSeconds) || 3) + "s";
    a.style.transitionDuration = b.style.transitionDuration = fade;
    let front = a;
    async function show(next) {
      const list = await pickSet();
      if (!list.length) return;
      let url = localStorage.getItem("glass.wall");
      if (next || !url || list.indexOf(url) < 0) {
        const cand = list.filter((u) => u !== url);
        url = (cand.length ? cand : list)[Math.floor(Math.random() * (cand.length || list.length))];
        localStorage.setItem("glass.wall", url);
      }
      const img = new Image();
      img.onload = () => {
        const back = front === a ? b : a;
        back.style.backgroundImage = 'url("' + url.replace(/"/g, "%22") + '")';
        back.classList.add("show");
        front.classList.remove("show");
        front = back;
      };
      img.src = url;
    }
    window.nextWallpaper = () => show(true);
    show(false);
    const mins = (cfg.wallpapers && cfg.wallpapers.intervalMinutes) || 15;
    setInterval(() => show(true), Math.max(1, mins) * 60 * 1000);
  }

  // ---------- scenes + big glass clock (adapted from couch-tv, MIT — github.com/Seagey/couch-tv) ----------
  // Each scene: photo, a frosted "glass" copy used as the clock's fill, and (except water) a cut-out of
  // the scenery that is drawn OVER the clock so mountains/hills overlap the digits.
  const SCENE_LIB = [
    { id: "night", name: "Night", fg: true },
    { id: "golden", name: "Golden hour", fg: true },
    { id: "water", name: "Waterline", fg: false, water: 0.55 },
    { id: "fog", name: "Fog", fg: true },
    { id: "dawn", name: "Dawn", fg: true }
  ];
  window.SCENE_LIB = SCENE_LIB;

  // Sun altitude (degrees) for lat/lon at a time — standard NOAA approximation.
  function sunAltitude(lat, lon, d) {
    const rad = Math.PI / 180;
    const day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
    const hr = d.getUTCHours() + d.getUTCMinutes() / 60;
    const g = 2 * Math.PI / 365 * (day - 1 + (hr - 12) / 24);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const ha = ((hr * 60 + eqt + 4 * lon) / 4 - 180) * rad;   // hour angle
    const alt = Math.asin(Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(ha)) / rad;
    return { alt, morning: ha < 0 };
  }
  // couch-tv's rule: night below -6°, dawn/golden hour near the horizon, daytime = fog when grey or wet, else water
  function autoScene(code) {
    const L = cfg.location || {};
    const s = sunAltitude(Number(L.lat), Number(L.lon), new Date());
    if (s.alt < -6) return "night";
    if (s.alt < 10) return s.morning ? "dawn" : "golden";
    const grey = code != null && [3, 45, 48, 51, 53, 55, 61, 63, 65, 80, 81, 82].indexOf(code) >= 0;
    return grey ? "fog" : "water";
  }

  // opts.full = clock centred on the whole screen (screensaver); otherwise centred in the area left of the widget
  function startScenes(opts) {
    opts = opts || {};
    const stage = $("#stage");
    if (!stage) return null;
    const box = el("div", "scenes" + (opts.full ? " full" : ""));
    const fb = $(".wall-fallback", stage); // scenes go just above the plain gradient fallback
    stage.insertBefore(box, fb ? fb.nextSibling : stage.firstChild);
    const els = {};
    let current = null, hm = "", manual = null, wxCode = null;
    function build(s) {
      const e = el("div", "scene s-" + s.id);
      e.innerHTML = '<img class="sbg" alt=""><div class="shade"></div><div class="gclock"></div>' +
        (s.water ? '<div class="gclock under"></div>' : "") + (s.fg ? '<img class="fg" alt="">' : "");
      $(".sbg", e).src = "scenes/scene-" + s.id + ".jpg";
      if (s.fg) $(".fg", e).src = "scenes/scene-" + s.id + "-fg.webp";
      box.appendChild(e);
      els[s.id] = e;
      return e;
    }
    function draw(id) {
      const e = els[id], s = SCENE_LIB.find((x) => x.id === id);
      if (!e || !hm) return;
      const cs = e.querySelectorAll(".gclock");
      cs.forEach((c) => {
        c.innerHTML = '<span class="fill">' + hm + '</span><span class="sheen">' + hm + '</span><span class="rim">' + hm + "</span>";
        const f = $(".fill", c);
        f.style.backgroundImage = "url(scenes/scene-" + id + "-glass.jpg)";
        f.style.backgroundPosition = -(c.offsetLeft + f.offsetLeft) + "px " + -(c.offsetTop + f.offsetTop) + "px";
      });
      if (s.water && cs.length === 2) { // sharp above the waterline, blurred reflection below
        const line = 1080 * s.water - cs[0].offsetTop, out = "-50%";
        cs[0].style.clipPath = "inset(" + out + " " + out + " " + (cs[0].offsetHeight - line) + "px " + out + ")";
        cs[1].style.clipPath = "inset(" + line + "px " + out + " " + out + " " + out + ")";
      }
    }
    function pick() {
      const fixed = api.getPref("scene");
      if (manual && Date.now() < manual.until) return manual.id;
      if (fixed && fixed !== "auto" && SCENE_LIB.some((s) => s.id === fixed)) return fixed;
      return autoScene(wxCode);
    }
    let pending = null;
    function show(id) {
      if (id === current || id === pending) return;
      pending = id;
      const next = els[id] || build(SCENE_LIB.find((s) => s.id === id));
      next.classList.add("ready");
      draw(id);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (pending !== id) return; // a newer choice replaced this one
        pending = null;
        next.classList.add("on");
        if (current && current !== id && els[current]) {
          const old = els[current];
          old.classList.remove("on");
          setTimeout(() => { if (!old.classList.contains("on")) old.classList.remove("ready"); }, 1800);
        }
        current = id;
        document.body.dataset.scene = id;
        if (opts.onScene) opts.onScene(id);
      }));
    }
    function tick() {
      const t = fmtTime(new Date());
      if (t !== hm) { hm = t; if (current) draw(current); }
      document.body.classList.toggle("late", new Date().getHours() >= 21 || new Date().getHours() < 5);
    }
    tick();
    setInterval(tick, 5000);
    weather().then((w) => { wxCode = w.f.current.weather_code; show(pick()); }).catch(() => {});
    show(pick());
    setInterval(() => show(pick()), 5 * 60 * 1000);
    return {
      // "next scene" button: show the next one for 30 minutes, then back to the automatic choice
      next() {
        const i = SCENE_LIB.findIndex((s) => s.id === current);
        const id = SCENE_LIB[(i + 1) % SCENE_LIB.length].id;
        manual = { id, until: Date.now() + 30 * 60 * 1000 };
        show(id);
      },
      refresh() { manual = null; show(pick()); },
      get current() { return current; }
    };
  }
  window.startScenes = startScenes;

  // ---------- remote control: spatial navigation ----------
  function visible(e) {
    if (e.offsetParent === null) return false;
    if (window.__modal && !window.__modal.contains(e)) return false;
    return true;
  }
  function focusables() { return Array.from(document.querySelectorAll(".focusable")).filter(visible); }
  function zoneOf(e) { const z = e.closest("[data-zone]"); return z ? z.getAttribute("data-zone") : "main"; }
  function focusEl(e) {
    if (!e) return;
    e.focus({ preventScroll: true });
    try { e.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } catch (x) {}
  }
  window.focusEl = focusEl;
  function move(dir) {
    const els = focusables();
    const cur = document.activeElement;
    if (!els.includes(cur)) { focusEl($("[data-autofocus]") && visible($("[data-autofocus]")) ? $("[data-autofocus]") : els[0]); return; }
    // TV-style rules:
    //  - candidates must lie in the pressed direction (edge to edge, not centre to centre)
    //  - Left/Right never leaves the current zone (header / grid / dock …); nothing there = stay put
    //  - prefer items that line up (overlap) with the current one: same row for Left/Right,
    //    same column for Up/Down; otherwise the nearest one, weighting sideways drift heavily
    //  - entering a zone that has a [data-entry] item (e.g. the active tab) lands on that item
    //  - items inside a [data-navgroup] (e.g. the front-door card) are treated as one block when
    //    approached from outside, so the block is never skipped; the first item in it wins ties
    const horiz = dir === "l" || dir === "r";
    const zone = zoneOf(cur);
    const gCur = cur.closest("[data-navgroup]");
    let best = null, bs = Infinity, near = null, ns = Infinity, inGroup = null, is = Infinity;
    for (const e of els) {
      if (e === cur) continue;
      if (horiz && zoneOf(e) !== zone) continue;
      const gE = e.closest("[data-navgroup]");
      const outside = gE !== gCur;
      // Leaving a group: measure from the item itself. Entering a group: measure to the whole block.
      const c = cur.getBoundingClientRect();
      const r = (outside && gE ? gE : e).getBoundingClientRect();
      let gap = dir === "r" ? r.left - c.right : dir === "l" ? c.left - r.right : dir === "d" ? r.top - c.bottom : c.top - r.bottom;
      if (gap < -10) continue;
      gap = Math.max(0, gap);
      const overlap = horiz ? Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top) : Math.min(c.right, r.right) - Math.max(c.left, r.left);
      const drift = horiz ? Math.abs((r.top + r.bottom - c.top - c.bottom) / 2) : Math.abs((r.left + r.right - c.left - c.right) / 2);
      const s = overlap > 4 ? gap + drift * 0.25 : gap + drift * 2 + 1e5;
      if (gCur && gE === gCur) { if (s < is) { is = s; inGroup = e; } continue; }
      if (overlap > 4) { if (s < bs) { bs = s; best = e; } }
      // Not lined up: only allowed when it takes you into another zone (grid -> header, dock -> top)
      else if (zoneOf(e) !== zone) { if (s < ns) { ns = s; near = e; } }
    }
    // Inside a group (front-door card) moves stay inside it while there's somewhere to go
    let target = inGroup || best || near;
    if (target && zoneOf(target) !== zone) {
      const z = target.closest("[data-zone]");
      const entry = z && z.querySelector("[data-entry]");
      if (entry && visible(entry)) target = entry;
    }
    if (target) focusEl(target);
  }
  // Called by the TV app for every remote arrow / OK press (see MainActivity.dispatchKeyEvent)
  window.__tvKey = function (k) {
    if (cfg.debugNav) {
      const a = document.activeElement, r = a && a.getBoundingClientRect();
      console.log("tvKey " + k + " active=" + (a ? (a.getAttribute("aria-label") || a.id || a.tagName) : "-") + (r ? " @" + Math.round(r.left) + "," + Math.round(r.top) + " " + Math.round(r.width) + "x" + Math.round(r.height) : "") + " inW=" + window.innerWidth);
      setTimeout(() => { const b = document.activeElement; console.log("tvKey after " + (b ? (b.getAttribute("aria-label") || b.id || b.tagName) : "-")); }, 50);
    }
    if (k === "ok") {
      const a = document.activeElement;
      if (a && a !== document.body && focusables().includes(a)) a.click();
      else move("r"); // nothing selected yet: select the first item instead of acting
      return;
    }
    move(k);
  };
  // Keyboard (PC preview, or a keyboard plugged into the TV)
  document.addEventListener("keydown", (e) => {
    const dir = { ArrowUp: "u", ArrowDown: "d", ArrowLeft: "l", ArrowRight: "r" }[e.key];
    if (dir) { e.preventDefault(); move(dir); return; }
    if (e.key === "Enter") {
      const a = document.activeElement;
      if (a && a.getAttribute("role") === "button" && a.tagName !== "BUTTON" && a.tagName !== "A") { e.preventDefault(); a.click(); }
    }
  });

  // ---------- Back ----------
  // Native calls window.onTvBack(); return true if the page handled it.
  window.backHandlers = [];
  window.onTvBack = function () {
    for (let i = window.backHandlers.length - 1; i >= 0; i--) if (window.backHandlers[i]()) return true;
    if (!/index\.html$/.test(location.pathname)) { location.href = "index.html"; return true; }
    return false;
  };

  // ---------- Hubitat helpers ----------
  function attr(dev, name) {
    if (!dev) return undefined;
    const a = dev.attributes;
    if (Array.isArray(a)) { const f = a.find((x) => x.name === name); return f ? f.currentValue : undefined; }
    return a ? a[name] : undefined;
  }
  async function devices() {
    const list = await api.hub("devices/all");
    const map = {};
    (list || []).forEach((d) => (map[String(d.id)] = d));
    return map;
  }
  window.hubAttr = attr;
  window.hubDevices = devices;

  document.addEventListener("DOMContentLoaded", () => {
    startClock();
    const ownScenes = document.body.hasAttribute("data-scenes"); // index/ambient start their own (with the clock)
    if (cfg.theme === "wallpapers") startWallpaper();
    else if (!ownScenes) {
      // other pages: the current scene's photo, no clock
      const st = $("#stage"), w = el("div", "wall show");
      const fixed = api.getPref("scene");
      const id = fixed && fixed !== "auto" ? fixed : autoScene(null);
      w.style.backgroundImage = "url(scenes/scene-" + id + ".jpg)";
      const fb = st && $(".wall-fallback", st);
      if (st) st.insertBefore(w, fb ? fb.nextSibling : st.firstChild);
    }
    setTimeout(() => { if (!focusables().includes(document.activeElement)) move("r"); }, 300);
  });
})();
