// Privacy cleanup list for Google TV (tested on a Hisense Google TV).
// Shown read-only in Glass Home settings; switched off/on from the PC with launcher\privacy.ps1
// (pm disable-user / pm enable — fully reversible, nothing is uninstalled).
// Sources: couch-tv tv-home/tools/privacy-list.txt (MIT, github.com/Seagey/couch-tv) for the Google
// entries, plus Hisense/VIDAA promo and telemetry packages found on a Hisense Google TV.
// Never on this list: launchers, setup, Play Services/Store, system UI, keyboard, remote, voice,
// Bluetooth, HDMI-CEC, TV inputs, tuner, updates, com.vt.tv.protector, core com.vt.* / com.mediatek.*.
window.PRIVACY_LIST = [
  // Google (Google TV / Android)
  { pkg: "com.google.android.feedback", name: "Google feedback", what: "Sends crash and feedback reports to Google", off: "The \"send feedback\" option after a crash stops sending" },
  { pkg: "com.android.adservices.api", name: "Ad services (Privacy Sandbox)", what: "Ad topics and ad measurement for apps", off: "Apps get no ad topics from the TV" },
  { pkg: "com.google.android.adservices.api", name: "Ad services (Google build)", what: "Same as above, Google's package name", off: "Apps get no ad topics from the TV" },
  { pkg: "com.android.ondevicepersonalization.services", name: "On-device personalization", what: "Ad and content personalization framework", off: "Nothing visible" },
  { pkg: "com.android.federatedcompute.services", name: "Federated compute", what: "Trains Google models on-device from usage", off: "Nothing visible" },
  { pkg: "com.android.tv.feedbackconsent", name: "TV feedback consent", what: "Feedback/usage-sharing prompt", off: "Nothing visible" },
  { pkg: "android.autoinstalls.config.google.gtvpai", name: "Google TV auto-installs", what: "Pushes promoted apps onto the TV", off: "No more silently added promo apps" },
  // ACR seen on some Android TVs (only switched off if present)
  { pkg: "tv.alphonso.alphonso_eula", name: "Alphonso ACR", what: "Recognises what's on screen for ad targeting", off: "Nothing visible" },
  // Hisense / VIDAA layer
  { pkg: "com.vidaa.oemtabcontentprovider", name: "VIDAA content tab", what: "Hisense promoted content rows", off: "Hisense promo row goes" },
  { pkg: "net.vidaatv.hisense.android.tv", name: "VIDAA TV services", what: "Hisense content/recommendation service", off: "Hisense recommendations stop" },
  { pkg: "com.vt.storemode", name: "Store demo mode", what: "Retail demo mode", off: "Nothing visible at home" },
  { pkg: "com.vt.hishow", name: "Hisense HiShow", what: "Hisense promotions", off: "Hisense promos stop" },
  { pkg: "com.vt.tv.mobiledeviceconnectiontips", name: "Phone connection tips", what: "Pop-up tips to connect a phone", off: "No more pop-up tips" }
];
