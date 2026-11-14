/* Glass Home web demo — fake security cameras.
 * Each camera is a crop of one of the app's own scene photos, drawn like a camera feed: slow pan,
 * grain, vignette, timestamp, rippling water on the dock camera, one night-vision camera.
 * DemoCams.still(src) -> Promise<jpeg data URL> (stands in for go2rtc /api/frame.jpeg)
 * DemoCams.play(canvas, src) -> animated live view (used by demo-cams/stream.html). */
window.DemoCams = (function () {
  "use strict";
  var BASE = new URL("../scenes/", document.currentScript.src).href;
  // crop = [x, y, w, h] in the 1920×1080 source, 16:9
  var CAMS = {
    lakefront: { n: 1, label: "LAKEFRONT", img: "scene-night.jpg", crop: [240, 236, 1520, 855] },
    dock: { n: 2, label: "DOCK", img: "scene-water.jpg", crop: [260, 290, 1400, 788], water: 0.36 },
    ridge: { n: 3, label: "RIDGE", img: "scene-golden.jpg", crop: [420, 250, 1200, 675] },
    valley: { n: 4, label: "VALLEY", img: "scene-dawn.jpg", crop: [700, 420, 1150, 647] },
    trail: { n: 5, label: "TRAIL IR", img: "scene-fog.jpg", crop: [310, 260, 1300, 731], ir: true }
  };
  var imgs = {};
  function load(file) {
    if (!imgs[file]) {
      imgs[file] = new Promise(function (res, rej) {
        var i = new Image();
        i.onload = function () { res(i); };
        i.onerror = rej;
        i.src = BASE + file;
      });
    }
    return imgs[file];
  }

  // a few tiles of grain, picked at random each frame
  var grain = [];
  function makeGrain() {
    for (var k = 0; k < 4; k++) {
      var c = document.createElement("canvas");
      c.width = c.height = 200;
      var g = c.getContext("2d"), d = g.createImageData(200, 200);
      for (var i = 0; i < d.data.length; i += 4) {
        var v = Math.random() * 255;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
      grain.push(c);
    }
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stamp(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "  " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function draw(ctx, cam, img, t, W, H) {
    if (!grain.length) makeGrain();
    var c = cam.crop, z = 1.08;
    // slow pan back and forth inside the crop
    var sw = c[2] / z, sh = c[3] / z;
    var px = (Math.sin(t / 22 + cam.n) * 0.5 + 0.5) * (c[2] - sw);
    var py = (Math.cos(t / 31 + cam.n) * 0.5 + 0.5) * (c[3] - sh);
    var sx = c[0] + px, sy = c[1] + py;
    ctx.save();
    ctx.filter = cam.ir ? "grayscale(1) contrast(1.35) brightness(1.1)" : "saturate(0.82) contrast(1.06)";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    if (cam.water) {
      // ripple: redraw thin strips below the waterline with a small sideways wobble
      var y0 = Math.round(H * cam.water), step = 3, ky = sh / H;
      for (var y = y0; y < H; y += step) {
        var depth = (y - y0) / (H - y0);
        var off = Math.sin(y * 0.09 + t * 2.2) * (1.2 + depth * 2.6) + Math.sin(y * 0.031 - t * 1.3) * 1.5;
        ctx.drawImage(img, sx, sy + y * ky, sw, step * ky, off, y, W, step);
      }
    }
    ctx.restore();
    if (cam.ir) { ctx.fillStyle = "rgba(60,255,120,0.10)"; ctx.globalCompositeOperation = "multiply"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
    // grain
    ctx.save();
    ctx.globalAlpha = cam.ir ? 0.12 : 0.07;
    ctx.globalCompositeOperation = "overlay";
    var pat = ctx.createPattern(grain[Math.floor(Math.random() * grain.length)], "repeat");
    ctx.translate(Math.random() * 200, Math.random() * 200);
    ctx.fillStyle = pat;
    ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.restore();
    // vignette
    var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    // on-screen text, like a real camera: timestamp + camera id, top left
    var fs = Math.max(11, Math.round(H * 0.032));
    ctx.font = "600 " + fs + "px ui-monospace, Consolas, 'Courier New', monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 3;
    ctx.fillText("CAM " + pad(cam.n) + "  " + cam.label + "   " + stamp(new Date()), W - Math.round(fs * 0.9), Math.round(fs * 0.8));
    ctx.textAlign = "left";
    ctx.shadowBlur = 0;
  }

  function still(src) {
    var cam = CAMS[src];
    if (!cam) return Promise.reject(new Error("no such demo camera"));
    return load(cam.img).then(function (img) {
      var cv = document.createElement("canvas");
      cv.width = 960; cv.height = 540;
      draw(cv.getContext("2d"), cam, img, Date.now() / 1000, 960, 540);
      return cv.toDataURL("image/jpeg", 0.82);
    });
  }

  function play(canvas, src) {
    var cam = CAMS[src];
    if (!cam) return Promise.reject(new Error("no such demo camera"));
    return load(cam.img).then(function (img) {
      var ctx = canvas.getContext("2d"), last = 0;
      function size() {
        var r = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.min(1920, Math.round(window.innerWidth * r));
        canvas.height = Math.round(canvas.width * 9 / 16);
      }
      size();
      window.addEventListener("resize", size);
      (function frame(ts) {
        if (ts - last > 40) { last = ts; draw(ctx, cam, img, ts / 1000, canvas.width, canvas.height); } // ~25 fps
        requestAnimationFrame(frame);
      })(0);
    });
  }

  return { cams: CAMS, still: still, play: play };
})();
