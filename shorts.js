/* Neon Waypoint: Shorts rail. One file. Add <script src="shorts.js" defer></script> before </body>.
   Reads data/videos.json (kept fresh by the GitHub Action). Shows nothing if there are no Shorts yet. */
(function () {
  var ID = /^[A-Za-z0-9_-]{11}$/;
  var CHANNEL = "https://www.youtube.com/channel/UC72GnGlxY2Y8Sbrt71WDqLA";
  var CSS = [
    ".nw-shorts{position:relative;z-index:1;padding:8px 0 56px;text-align:center}",
    ".nw-shorts h2{font-family:'Bowlby One',system-ui,sans-serif;font-weight:400;font-size:clamp(22px,4vw,32px);letter-spacing:.04em;text-transform:uppercase;color:#E4DCFF;text-shadow:0 0 14px rgba(250,34,124,.55)}",
    ".nw-shorts .nw-sub{color:var(--muted,#A9B3D6);margin:6px 24px 22px;font-size:16px}",
    ".nw-rail{display:flex;gap:16px;overflow-x:auto;padding:6px 24px 18px;scroll-snap-type:x proximity;justify-content:safe center;scrollbar-width:thin;scrollbar-color:#FA227C #141B3D}",
    ".nw-card{flex:0 0 190px;scroll-snap-align:center;text-align:left}",
    ".nw-frame{position:relative;display:block;width:100%;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#141B3D;border:0;padding:0;cursor:pointer;box-shadow:0 0 0 1.5px rgba(46,197,255,.55),0 10px 28px rgba(0,0,0,.45);transition:transform .15s ease,box-shadow .15s ease}",
    ".nw-frame:hover,.nw-frame:focus-visible{transform:translateY(-3px);box-shadow:0 0 0 2px #FA227C,0 14px 34px rgba(250,34,124,.35);outline:none}",
    ".nw-frame img,.nw-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}",
    ".nw-play{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(11,16,38,.62);box-shadow:0 0 0 2px #fff inset,0 0 18px rgba(250,34,124,.6)}",
    ".nw-play::after{content:'';position:absolute;left:21px;top:16px;border-left:18px solid #fff;border-top:11px solid transparent;border-bottom:11px solid transparent}",
    ".nw-title{margin:10px 2px 6px;font-size:14px;line-height:1.35;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
    ".nw-guide{display:inline-block;font-size:14px;font-weight:700;color:#2EC5FF;text-decoration:none;margin:0 2px}",
    ".nw-guide:hover,.nw-guide:focus-visible{color:#fff;text-decoration:underline;outline:none}",
    ".nw-more{margin-top:6px}",
    "@media (max-width:520px){.nw-card{flex-basis:160px}}",
    "@media (prefers-reduced-motion:reduce){.nw-frame{transition:none}}"
  ].join("\n");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function watch(id) { return "https://www.youtube.com/watch?v=" + id; }

  function card(s) {
    var c = el("article", "nw-card");
    var f = el("button", "nw-frame");
    f.type = "button";
    f.setAttribute("aria-label", "Play Short: " + s.title);
    var img = el("img");
    img.loading = "lazy";
    img.alt = "";
    img.src = "https://i.ytimg.com/vi/" + s.id + "/hqdefault.jpg";
    f.appendChild(img);
    f.appendChild(el("span", "nw-play"));
    f.addEventListener("click", function () {
      var p = document.createElement("iframe");
      p.src = "https://www.youtube-nocookie.com/embed/" + s.id + "?autoplay=1&rel=0&playsinline=1";
      p.title = s.title;
      p.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      p.allowFullscreen = true;
      f.replaceChildren(p);
      f.style.cursor = "default";
    });
    c.appendChild(f);
    c.appendChild(el("p", "nw-title", s.title));
    var a = el("a", "nw-guide", s.parent ? "Watch the full guide →" : "More on YouTube →");
    a.href = s.parent && ID.test(s.parent) ? watch(s.parent) : CHANNEL;
    a.target = "_blank";
    a.rel = "noopener";
    c.appendChild(a);
    return c;
  }

  function build(data) {
    var shorts = (data.shorts || []).filter(function (s) { return ID.test(s.id); });
    if (!shorts.length) return;
    if (!document.getElementById("nw-shorts-css")) {
      var st = el("style");
      st.id = "nw-shorts-css";
      st.textContent = CSS;
      document.head.appendChild(st);
      var fl = el("link");
      fl.rel = "stylesheet";
      fl.href = "https://fonts.googleapis.com/css2?family=Bowlby+One&display=swap";
      document.head.appendChild(fl);
    }
    var sec = el("section", "nw-shorts");
    sec.id = "shorts";
    sec.setAttribute("aria-label", "Quick fix Shorts");
    sec.appendChild(el("h2", "", "Quick fixes"));
    sec.appendChild(el("p", "nw-sub", "Under a minute each. The full guide is one tap away."));
    var rail = el("div", "nw-rail");
    shorts.forEach(function (s) { rail.appendChild(card(s)); });
    sec.appendChild(rail);
    var longs = (data.longs || []).filter(function (v) { return ID.test(v.id); });
    if (longs.length) {
      var b = el("a", "cta nw-more", "Watch the newest full guide");
      b.href = watch(longs[0].id);
      b.target = "_blank";
      b.rel = "noopener";
      sec.appendChild(b);
    }
    var main = document.querySelector("main");
    if (main && main.parentNode) main.parentNode.insertBefore(sec, main.nextSibling);
    else document.body.appendChild(sec);
  }

  fetch("data/videos.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) build(d); })
    .catch(function () { /* no data, no section */ });
})();
