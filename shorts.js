/* Neon Waypoint: homepage video blocks. One file. Needs <script src="shorts.js" defer></script> before </body>.
   Reads data/videos.json (kept fresh by the GitHub Action).
   1) The top button opens the newest long video.
   2) A "Newest guide" block under the hero: big thumbnail that plays in place, title, Watch on YouTube.
   3) A "Latest Shorts" grid (2 columns, first 6, "Show more" for the rest) sits under the hero, with a channel link below it. No Shorts yet = no rail. */
(function () {
  var ID = /^[A-Za-z0-9_-]{11}$/;
  var SHOWN = 6;
  var CHANNEL = "https://www.youtube.com/channel/UC72GnGlxY2Y8Sbrt71WDqLA";
  var CSS = [
    ".nw-home{position:relative;z-index:1;text-align:center;padding:36px 0 56px;background:linear-gradient(to bottom,rgba(7,10,26,0),rgba(7,10,26,.6) 14%)}",
    ".nw-home section+section{margin-top:64px}",
    ".nw-home h2{font-family:'Bowlby One',system-ui,sans-serif;font-weight:400;font-size:clamp(22px,4vw,32px);letter-spacing:.04em;text-transform:uppercase;color:#E4DCFF;text-shadow:0 0 14px rgba(250,34,124,.55)}",
    ".nw-home .nw-sub{color:var(--muted,#A9B3D6);margin:6px 24px 22px;font-size:16px}",
    ".nw-feature{width:min(640px,calc(100% - 32px));margin:0 auto}",
    ".nw-feature h2{margin-bottom:20px}",
    ".nw-feature .nw-frame{aspect-ratio:16/9;border-radius:18px}",
    ".nw-feature .nw-play{width:76px;height:76px;margin:-38px 0 0 -38px}",
    ".nw-feature .nw-play::after{left:29px;top:22px;border-left:25px solid #fff;border-top:16px solid transparent;border-bottom:16px solid transparent}",
    ".nw-feature .nw-ftitle{margin:16px 0 18px;font-size:clamp(17px,2.6vw,21px);line-height:1.35;color:#fff;font-weight:700}",
    ".nw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,300px));gap:30px 26px;justify-content:center;padding:6px 20px 8px}",
    ".nw-card{text-align:left;min-width:0}",
    ".nw-card.extra{display:none}",
    ".nw-grid.open .nw-card.extra{display:block}",
    ".nw-frame{position:relative;width:100%;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#141B3D;box-shadow:0 0 0 1.5px rgba(46,197,255,.55),0 10px 28px rgba(0,0,0,.45);transition:transform .15s ease,box-shadow .15s ease}",
    ".nw-frame:hover,.nw-frame:focus-within{transform:translateY(-3px);box-shadow:0 0 0 2px #FA227C,0 14px 34px rgba(250,34,124,.35)}",
    ".nw-thumb{position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:none;cursor:pointer}",
    ".nw-thumb:focus-visible{outline:2px solid #fff;outline-offset:-4px;border-radius:16px}",
    ".nw-frame img,.nw-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}",
    ".nw-play{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(11,16,38,.62);box-shadow:0 0 0 2px #fff inset,0 0 18px rgba(250,34,124,.6)}",
    ".nw-play::after{content:'';position:absolute;left:21px;top:16px;border-left:18px solid #fff;border-top:11px solid transparent;border-bottom:11px solid transparent}",
    ".nw-title{margin:12px 2px 4px;min-height:2.7em;font-size:15px;line-height:1.35;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
    ".nw-guide{display:block;min-height:1.5em;font-size:14px;font-weight:700;color:#2EC5FF;text-decoration:none;margin:0 2px}",
    "a.nw-guide:hover,a.nw-guide:focus-visible{color:#fff;text-decoration:underline;outline:none}",
    ".nw-all{display:inline-block;margin-top:8px;color:#fff;text-decoration:none;border:1.5px solid #2EC5FF;padding:12px 26px;border-radius:999px;font-size:15px;transition:background .15s ease,color .15s ease}",
    ".nw-all:hover,.nw-all:focus-visible{background:#2EC5FF;color:#0B1026;outline:none}",
    "button.nw-all{font-family:inherit;cursor:pointer;background:none}",
    "@media (max-width:640px){.nw-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px;padding:6px 16px 8px}.nw-card.playing{grid-column:1/-1;justify-self:center;width:min(300px,100%)}}",
    "@media (prefers-reduced-motion:reduce){.nw-frame,.nw-all{transition:none}}"
  ].join("\n");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function watch(id) { return "https://www.youtube.com/watch?v=" + id; }
  function link(a, href) { a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

  function addCss() {
    if (document.getElementById("nw-shorts-css")) return;
    var st = el("style");
    st.id = "nw-shorts-css";
    st.textContent = CSS;
    document.head.appendChild(st);
    var fl = el("link");
    fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Bowlby+One&display=swap";
    document.head.appendChild(fl);
  }

  function hero(newest) {
    var cta = document.querySelector("main .cta");
    if (!cta || !newest) return;
    cta.href = watch(newest.id);
    cta.textContent = "Watch the newest guide";
  }

  var active = null;
  function stopActive() {
    if (!active) return;
    active.frame.replaceChildren(active.thumb);
    active.card.classList.remove("playing");
    active = null;
  }

  function player(frame, v, c, hd) {
    var thumb = el("button", "nw-thumb");
    thumb.type = "button";
    thumb.setAttribute("aria-label", "Play: " + v.title);
    var img = el("img");
    img.loading = "lazy";
    img.alt = "";
    var base = "https://i.ytimg.com/vi/" + v.id + "/";
    if (hd) img.onerror = function () { img.onerror = null; img.src = base + "hqdefault.jpg"; };
    img.src = base + (hd ? "maxresdefault.jpg" : "hqdefault.jpg");
    thumb.appendChild(img);
    thumb.appendChild(el("span", "nw-play"));
    thumb.addEventListener("click", function () {
      stopActive();
      var p = document.createElement("iframe");
      p.src = "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&rel=0&playsinline=1";
      p.title = v.title;
      p.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      p.allowFullscreen = true;
      frame.replaceChildren(p);
      c.classList.add("playing");
      active = { frame: frame, thumb: thumb, card: c };
      if (window.matchMedia && matchMedia("(max-width:640px)").matches) setTimeout(function () { c.scrollIntoView({ block: "center", behavior: "smooth" }); }, 50);
    });
    frame.appendChild(thumb);
  }

  function card(s) {
    var c = el("article", "nw-card");
    var frame = el("div", "nw-frame");
    player(frame, s, c, false);
    c.appendChild(frame);
    c.appendChild(el("p", "nw-title", s.title));
    if (s.parent && ID.test(s.parent)) {
      c.appendChild(link(el("a", "nw-guide", "Related guide →"), watch(s.parent)));
    } else {
      c.appendChild(el("span", "nw-guide"));
    }
    return c;
  }

  function feature(v) {
    var sec = el("section", "nw-feature");
    sec.setAttribute("aria-label", "Newest guide");
    sec.appendChild(el("h2", "", "Newest guide"));
    var frame = el("div", "nw-frame");
    player(frame, v, sec, true);
    sec.appendChild(frame);
    sec.appendChild(el("p", "nw-ftitle", v.title));
    sec.appendChild(link(el("a", "cta", "Watch on YouTube"), watch(v.id)));
    return sec;
  }

  function build(data) {
    var shorts = (data.shorts || []).filter(function (s) { return ID.test(s.id); });
    var longs = (data.longs || []).filter(function (v) { return ID.test(v.id); });
    addCss();
    hero(longs[0]);
    if (!longs.length && !shorts.length) return;
    var home = el("div", "nw-home");
    home.id = "videos";
    if (longs.length) home.appendChild(feature(longs[0]));
    if (shorts.length) home.appendChild(shortsBlock(shorts));
    var main = document.querySelector("main");
    if (main && main.parentNode) main.parentNode.insertBefore(home, main.nextSibling);
    else document.body.appendChild(home);
  }

  function shortsBlock(shorts) {
    var sec = el("section", "");
    sec.id = "shorts";
    sec.setAttribute("aria-label", "Latest Shorts");
    sec.appendChild(el("h2", "", "Latest Shorts"));
    sec.appendChild(el("p", "nw-sub", "Clips from my GTA 6 sessions. Tap one to play."));
    var grid = el("div", "nw-grid");
    shorts.forEach(function (s, i) {
      var c = card(s);
      if (i >= SHOWN) c.classList.add("extra");
      grid.appendChild(c);
    });
    sec.appendChild(grid);
    var row = el("div", "nw-actions");
    row.style.marginTop = "22px";
    if (shorts.length > SHOWN) {
      var more = el("button", "nw-all", "Show more Shorts");
      more.type = "button";
      more.style.marginRight = "10px";
      more.addEventListener("click", function () { grid.classList.add("open"); more.remove(); });
      row.appendChild(more);
    }
    row.appendChild(link(el("a", "nw-all", "See all videos on YouTube"), CHANNEL));
    sec.appendChild(row);
    return sec;
  }

  fetch("data/videos.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) build(d); })
    .catch(function () { /* no data: the page stays as it was */ });
})();
