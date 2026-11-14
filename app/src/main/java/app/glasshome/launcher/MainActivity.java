package app.glasshome.launcher;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * Glass Home: a Home-screen app for Android / Google TV that shows local web pages
 * (assets/web) full screen and gives them a small bridge to the TV:
 *   - list and open installed apps, with their official icons
 *   - talk to the Hubitat Maker API (the access token never reaches the page)
 *   - list wallpapers dropped into the app's own folder on the TV
 */
public class MainActivity extends Activity {

    private static final String HOME_URL = "file:///android_asset/web/index.html";
    private static final Pattern SAFE_PATH = Pattern.compile("^[A-Za-z0-9/_.\\-]{1,200}$");

    private WebView web;
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private JSONObject config = new JSONObject();
    private String appsCache = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadConfig();

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);              // wallpapers in the app's own folder
        s.setMediaPlaybackRequiresUserGesture(false); // camera streams autoplay
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        WebView.setWebContentsDebuggingEnabled(true); // chrome://inspect from a PC on the LAN via adb

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                // Take key focus as soon as a page is ready and leave "touch mode", otherwise
                // Android eats the first remote press just to switch out of touch mode.
                view.requestFocusFromTouch();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                android.util.Log.i("GlassHome", m.message());
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "GlassHome");
        web.loadUrl(startUrl(getIntent()));
        web.requestFocus(View.FOCUS_DOWN);
        hideSystemBars();
    }

    /** Optional extra "page" = dashboard | weather opens that page directly (used for testing). */
    private static String startUrl(Intent intent) {
        String page = intent == null ? null : intent.getStringExtra("page");
        if ("dashboard".equals(page)) return "file:///android_asset/web/dashboard.html";
        if ("weather".equals(page)) return "file:///android_asset/web/weather.html";
        if ("settings".equals(page)) return "file:///android_asset/web/settings.html";
        if ("ambient".equals(page)) return "file:///android_asset/web/ambient.html";
        return HOME_URL;
    }

    private void hideSystemBars() {
        WindowInsetsController c = getWindow().getInsetsController();
        if (c != null) {
            c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemBars();
        if (web != null) web.post(() -> web.requestFocusFromTouch());
        appsCache = null; // apps may have been installed/removed meanwhile
        if (web != null) web.evaluateJavascript("window.onTvResume && window.onTvResume()", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Home pressed while already in the launcher: go back to the home page.
        if (web != null && Intent.ACTION_MAIN.equals(intent.getAction())) {
            String url = web.getUrl();
            if (url == null || !url.startsWith(HOME_URL)) web.loadUrl(HOME_URL);
            else web.evaluateJavascript("window.onTvHome && window.onTvHome()", null);
        }
    }

    /**
     * Remote arrows and OK go straight to the page's own navigation (window.__tvKey), so the
     * WebView never swallows a press (it used to eat the first one) or scrolls on its own.
     */
    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent ev) {
        String k = null;
        switch (ev.getKeyCode()) {
            case android.view.KeyEvent.KEYCODE_DPAD_UP: k = "u"; break;
            case android.view.KeyEvent.KEYCODE_DPAD_DOWN: k = "d"; break;
            case android.view.KeyEvent.KEYCODE_DPAD_LEFT: k = "l"; break;
            case android.view.KeyEvent.KEYCODE_DPAD_RIGHT: k = "r"; break;
            case android.view.KeyEvent.KEYCODE_DPAD_CENTER:
            case android.view.KeyEvent.KEYCODE_ENTER:
            case android.view.KeyEvent.KEYCODE_NUMPAD_ENTER: k = "ok"; break;
            default: break;
        }
        if (k == null || web == null) return super.dispatchKeyEvent(ev);
        android.util.Log.i("GlassHome", "key " + k + " action=" + ev.getAction() + " repeat=" + ev.getRepeatCount());
        if (ev.getAction() == android.view.KeyEvent.ACTION_DOWN && (!"ok".equals(k) || ev.getRepeatCount() == 0)) {
            web.evaluateJavascript("window.__tvKey && window.__tvKey('" + k + "')", null);
        }
        return true;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Let the page close overlays / full-screen cameras first; otherwise go back a page.
        web.evaluateJavascript("(window.onTvBack && window.onTvBack()) ? 'handled' : 'no'", result -> {
            if (result != null && result.contains("handled")) return;
            if (web.canGoBack()) web.goBack();
            // On the home page itself Back does nothing: this is the Home screen.
        });
    }

    // ---------- config ----------

    private File configFile() {
        File dir = getExternalFilesDir(null);
        return new File(dir, "config.json");
    }

    private void loadConfig() {
        File f = configFile();
        try {
            if (f.exists()) {
                try (InputStream in = new FileInputStream(f)) {
                    config = new JSONObject(readAll(in));
                }
            }
        } catch (Exception e) {
            config = new JSONObject();
        }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toString(StandardCharsets.UTF_8.name());
    }

    // ---------- icons ----------

    private static Bitmap draw(Drawable d, int w, int h) {
        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        d.setBounds(0, 0, w, h);
        d.draw(c);
        return b;
    }

    /**
     * White logo from an official app icon: find the icon's background colour (sampled just
     * inside its edge), make everything close to that colour transparent, and paint the rest
     * white. Keeps the logo's own shape and cut-outs (Netflix N, YouTube play, Spotify waves).
     */
    private static Bitmap whiteLogo(Bitmap src) {
        int w = src.getWidth(), h = src.getHeight();
        float[][] probes = {{0.5f, 0.1f}, {0.1f, 0.5f}, {0.9f, 0.5f}, {0.5f, 0.9f},
                {0.22f, 0.22f}, {0.78f, 0.22f}, {0.22f, 0.78f}, {0.78f, 0.78f}};
        int[] rs = new int[probes.length], gs = new int[probes.length], bs = new int[probes.length];
        int n = 0;
        for (float[] p : probes) {
            int c = src.getPixel(Math.min(w - 1, (int) (p[0] * w)), Math.min(h - 1, (int) (p[1] * h)));
            if (Color.alpha(c) > 200) { rs[n] = Color.red(c); gs[n] = Color.green(c); bs[n] = Color.blue(c); n++; }
        }
        boolean hasBg = n >= 4;
        int br = 0, bg = 0, bb = 0;
        if (hasBg) { // median of the opaque probes
            Arrays.sort(rs, 0, n); Arrays.sort(gs, 0, n); Arrays.sort(bs, 0, n);
            br = rs[n / 2]; bg = gs[n / 2]; bb = bs[n / 2];
        }
        int[] px = new int[w * h];
        src.getPixels(px, 0, w, 0, 0, w, h);
        for (int i = 0; i < px.length; i++) {
            int c = px[i];
            int a = Color.alpha(c);
            float keep;
            if (!hasBg) {
                keep = a / 255f;
            } else {
                int dr = Color.red(c) - br, dg = Color.green(c) - bg, db = Color.blue(c) - bb;
                double d = Math.sqrt(dr * dr + dg * dg + db * db);
                keep = (float) Math.max(0, Math.min(1, (d - 35) / 60.0)) * (a / 255f);
            }
            px[i] = Color.argb(Math.round(keep * 255), 255, 255, 255);
        }
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        out.setPixels(px, 0, w, 0, 0, w, h);
        return out;
    }

    private static String dataUri(Bitmap b) {
        if (b == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.PNG, 100, out);
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    private String customLogo(String pkg) {
        File f = new File(getExternalFilesDir("logos"), pkg + ".png");
        return f.exists() ? "file://" + f.getAbsolutePath() : "";
    }

    /** Processed icons per app version, so returning to Home doesn't redo the slow icon work. */
    private final Map<String, JSONObject> iconCache = new java.util.HashMap<>();

    private String buildApps() throws Exception {
        PackageManager pm = getPackageManager();
        Map<String, ResolveInfo> found = new LinkedHashMap<>();
        for (String cat : Arrays.asList(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            Intent i = new Intent(Intent.ACTION_MAIN).addCategory(cat);
            List<ResolveInfo> list = pm.queryIntentActivities(i, 0);
            for (ResolveInfo r : list) {
                String pkg = r.activityInfo.packageName;
                if (pkg.equals(getPackageName())) continue;
                if (!found.containsKey(pkg)) found.put(pkg, r);
            }
        }
        JSONArray arr = new JSONArray();
        for (Map.Entry<String, ResolveInfo> e : found.entrySet()) {
            String pkg = e.getKey();
            ResolveInfo r = e.getValue();
            long updated = 0;
            try { updated = pm.getPackageInfo(pkg, 0).lastUpdateTime; } catch (Exception ignored) { }
            String key = pkg + ":" + updated;
            JSONObject cached = iconCache.get(key);
            if (cached != null) {
                cached.put("custom", customLogo(pkg));
                arr.put(cached);
                continue;
            }
            JSONObject o = new JSONObject();
            o.put("pkg", pkg);
            o.put("label", String.valueOf(r.loadLabel(pm)));
            Drawable icon = r.loadIcon(pm);
            Bitmap full = draw(icon, 192, 192);
            o.put("icon", dataUri(full));
            o.put("mono", dataUri(whiteLogo(full)));
            try {
                ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
                Drawable banner = ai.loadBanner(pm);
                if (banner == null) banner = r.activityInfo.loadBanner(pm);
                o.put("banner", banner != null ? dataUri(draw(banner, 320, 180)) : "");
            } catch (Exception ignored) {
                o.put("banner", "");
            }
            o.put("custom", customLogo(pkg));
            iconCache.put(key, o);
            arr.put(o);
        }
        return arr.toString();
    }

    // ---------- Hubitat ----------

    private String hubitat(String path) throws Exception {
        JSONObject h = config.optJSONObject("hubitat");
        if (h == null || h.optString("token").isEmpty()) throw new IllegalStateException("Hubitat is not configured");
        if (!SAFE_PATH.matcher(path).matches() || path.contains("..")) throw new IllegalArgumentException("bad path");
        String url = "http://" + h.getString("host") + "/apps/api/" + h.getString("appId") + "/" + path
                + "?access_token=" + URLEncoder.encode(h.getString("token"), "UTF-8");
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(5000);
        c.setReadTimeout(8000);
        try {
            int code = c.getResponseCode();
            InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
            String body = in == null ? "" : readAll(in);
            if (code >= 400) throw new IllegalStateException("Hubitat HTTP " + code);
            return body;
        } finally {
            c.disconnect();
        }
    }

    private void callback(String id, boolean ok, String body) {
        String js = "window.__glassCb && window.__glassCb(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(body) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    // ---------- bridge exposed to the pages as window.GlassHome ----------

    private class Bridge {
        /** Config without secrets. */
        @JavascriptInterface
        public String getConfig() {
            try {
                JSONObject copy = new JSONObject(config.toString());
                JSONObject h = copy.optJSONObject("hubitat");
                boolean hasToken = h != null && !h.optString("token").isEmpty();
                if (h != null) h.remove("token");
                copy.put("_hubitatReady", hasToken);
                copy.put("_configPath", configFile().getAbsolutePath());
                return copy.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void reloadConfig() {
            loadConfig();
        }

        @JavascriptInterface
        public void getApps(String cbId) {
            io.execute(() -> {
                try {
                    if (appsCache == null) appsCache = buildApps();
                    callback(cbId, true, appsCache);
                } catch (Exception e) {
                    callback(cbId, false, String.valueOf(e.getMessage()));
                }
            });
        }

        @JavascriptInterface
        public void launch(String pkg) {
            runOnUiThread(() -> {
                PackageManager pm = getPackageManager();
                Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
                if (i == null) i = pm.getLaunchIntentForPackage(pkg);
                if (i == null) return;
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    startActivity(i);
                } catch (ActivityNotFoundException ignored) {
                }
            });
        }

        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (ActivityNotFoundException ignored) {
                }
            });
        }

        /** Hubitat Maker API GET, e.g. "devices/all" or "devices/495/on". Result arrives via __glassCb. */
        @JavascriptInterface
        public void hub(String path, String cbId) {
            io.execute(() -> {
                try {
                    callback(cbId, true, hubitat(path));
                } catch (Exception e) {
                    callback(cbId, false, String.valueOf(e.getMessage()));
                }
            });
        }

        /** Wallpapers pushed to <app folder>/wallpapers/<set>/*.jpg -> {"day":["file://..."], ...} */
        @JavascriptInterface
        public String listWallpapers() {
            JSONObject out = new JSONObject();
            try {
                File root = getExternalFilesDir("wallpapers");
                File[] sets = root == null ? null : root.listFiles();
                if (sets != null) {
                    for (File set : sets) {
                        if (!set.isDirectory()) continue;
                        JSONArray arr = new JSONArray();
                        File[] imgs = set.listFiles();
                        if (imgs != null) {
                            Arrays.sort(imgs);
                            for (File img : imgs) {
                                String n = img.getName().toLowerCase();
                                if (n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".webp")) {
                                    arr.put("file://" + img.getAbsolutePath());
                                }
                            }
                        }
                        out.put(set.getName().toLowerCase(), arr);
                    }
                }
            } catch (Exception ignored) {
            }
            return out.toString();
        }

        // ----- small key/value store (kids mode, scene choice) — survives restarts -----

        @JavascriptInterface
        public String getPref(String key) {
            return getSharedPreferences("glass", MODE_PRIVATE).getString("p_" + key, "");
        }

        @JavascriptInterface
        public void setPref(String key, String value) {
            getSharedPreferences("glass", MODE_PRIVATE).edit().putString("p_" + key, value == null ? "" : value).apply();
        }

        // ----- quick buttons -----

        /** HDMI and other hardware inputs: [{id, label, connected}] */
        @JavascriptInterface
        public String listInputs() {
            JSONArray arr = new JSONArray();
            try {
                android.media.tv.TvInputManager tim = (android.media.tv.TvInputManager) getSystemService(TV_INPUT_SERVICE);
                if (tim == null) return "[]";
                for (android.media.tv.TvInputInfo info : tim.getTvInputList()) {
                    if (!info.isPassthroughInput()) continue;
                    if (info.isHidden(MainActivity.this)) continue;
                    JSONObject o = new JSONObject();
                    o.put("id", info.getId());
                    CharSequence custom = info.loadCustomLabel(MainActivity.this);
                    CharSequence label = custom != null && custom.length() > 0 ? custom : info.loadLabel(MainActivity.this);
                    o.put("label", label == null ? info.getId() : label.toString());
                    o.put("type", info.getType());
                    int st = tim.getInputState(info.getId());
                    o.put("connected", st != android.media.tv.TvInputManager.INPUT_STATE_DISCONNECTED);
                    arr.put(o);
                }
            } catch (Exception ignored) {
            }
            return arr.toString();
        }

        @JavascriptInterface
        public void openInput(String inputId) {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, android.media.tv.TvContract.buildChannelUriForPassthroughInput(inputId));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception ignored) {
                }
            });
        }

        /** The TV's own picture settings (on this Hisense: com.vt.customsettings picture menu). */
        @JavascriptInterface
        public void openPicture() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Settings.ACTION_DISPLAY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception e) {
                    try { startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { }
                }
            });
        }

        // ----- privacy screen (read-only; switching apps off/on is done from a PC with adb) -----

        /** ["pkg", ...] -> {"pkg": "on" | "off" | "missing"} */
        @JavascriptInterface
        public String packageStates(String json) {
            JSONObject out = new JSONObject();
            try {
                JSONArray arr = new JSONArray(json);
                PackageManager pm = getPackageManager();
                for (int i = 0; i < arr.length(); i++) {
                    String pkg = arr.getString(i);
                    String st;
                    try {
                        ApplicationInfo ai = pm.getApplicationInfo(pkg, PackageManager.MATCH_DISABLED_COMPONENTS);
                        int es = pm.getApplicationEnabledSetting(pkg);
                        boolean off = !ai.enabled || es == PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                                || es == PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER;
                        st = off ? "off" : "on";
                    } catch (PackageManager.NameNotFoundException e) {
                        st = "missing";
                    }
                    out.put(pkg, st);
                }
            } catch (Exception ignored) {
            }
            return out.toString();
        }

        @JavascriptInterface
        public void openTvSettings() {
            openSettings();
        }
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }
}
