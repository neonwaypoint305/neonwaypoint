/* Neon Waypoint: homepage video blocks. One file. Needs <script src="shorts.js" defer></script> before </body>.
   Reads data/videos.json (kept fresh by the GitHub Action).
   1) The top button opens the newest long video, with its title under it.
   2) A "Latest Shorts" rail sits under the hero, with a channel link below it. No Shorts yet = no rail. */
(function () {
  var ID = /^[A-Za-z0-9_-]{11}$/;
  var CHANNEL = "https://www.youtube.com/channel/UC72GnGlxY2Y8Sbrt71WDqLA";
  var CSS = [
    ".nw-newest{display:block;margin:14px auto 0;max-width:min(88vw,520px);font-size:14px;line-height:1.4;color:#C9D2F0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0;transition:opacity .4s ease}",
    ".nw-newest.on{opacity:1}",
    ".nw-shorts{position:relative;z-index:1;padding:28px 0 56px;text-align:center;background:linear-gradient(to bottom,rgba(7,10,26,0),rgba(7,10,26,.6) 22%)}",
    ".nw-shorts h2{font-family:'Bowlby One',system-ui,sans-serif;font-weight:400;font-size:clamp(22px,4vw,32px);letter-spacing:.04em;text-transform:uppercase;color:#E4DCFF;text-shadow:0 0 14px rgba(250,34,124,.55)}",
    ".nw-shorts .nw-sub{color:var(--muted,#A9B3D6);margin:6px 24px 22px;font-size:16px}",
    ".nw-wrap{position:relative}",
    ".nw-rail{display:flex;gap:16px;overflow-x:auto;padding:6px 24px 18px;scroll-snap-type:x proximity;justify-content:safe center;scrollbar-width:none}",
    ".nw-rail::-webkit-scrollbar{display:none}",
    ".nw-card{flex:0 0 176px;scroll-snap-align:center;text-align:left}",
    ".nw-frame{position:relative;width:100%;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#141B3D;box-shadow:0 0 0 1.5px rgba(46,197,255,.55),0 10px 28px rgba(0,0,0,.45);transition:transform .15s ease,box-shadow .15s ease}",
    ".nw-frame:hover,.nw-frame:focus-within{transform:translateY(-3px);box-shadow:0 0 0 2px #FA227C,0 14px 34px rgba(250,34,124,.35)}",
    ".nw-thumb{position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:none;cursor:pointer}",
    ".nw-thumb:focus-visible{outline:2px solid #fff;outline-offset:-4px;border-radius:16px}",
    ".nw-frame img,.nw-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}",
    ".nw-play{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(11,16,38,.62);box-shadow:0 0 0 2px #fff inset,0 0 18px rgba(250,34,124,.6)}",
    ".nw-play::after{content:'';position:absolute;left:21px;top:16px;border-left:18px solid #fff;border-top:11px solid transparent;border-bottom:11px solid transparent}",
    ".nw-title{margin:10px 2px 4px;min-height:2.7em;font-size:14px;line-height:1.35;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
    ".nw-guide{display:block;min-height:1.5em;font-size:13px;font-weight:700;color:#2EC5FF;text-decoration:none;margin:0 2px}",
    "a.nw-guide:hover,a.nw-guide:focus-visible{color:#fff;text-decoration:underline;outline:none}",
    ".nw-arrow{position:absolute;top:calc(50% - 44px);width:40px;height:40px;border-radius:50%;border:1.5px solid #2EC5FF;background:rgba(11,16,38,.85);color:#fff;font-size:24px;line-height:1;cursor:pointer;display:none;z-index:2;padding:0 0 3px}",
    ".nw-arrow:hover,.nw-arrow:focus-visible{background:#2EC5FF;color:#0B1026;outline:none}",
    ".nw-prev{left:10px}.nw-next{right:10px}",
    ".nw-all{display:inline-block;margin-top:8px;color:#fff;text-decoration:none;border:1.5px solid #2EC5FF;padding:12px 26px;border-radius:999px;font-size:15px;transition:background .15s ease,color .15s ease}",
    ".nw-all:hover,.nw-all:focus-visible{background:#2EC5FF;color:#0B1026;outline:none}",
    "@media (max-width:520px){.nw-card{flex-basis:160px}.nw-arrow{display:none!important}}",
    "@media (prefers-reduced-motion:reduce){.nw-frame,.nw-newest,.nw-all{transition:none}}"
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
    var cap = el("span", "nw-newest", newest.title);
    cta.insertAdjacentElement("afterend", cap);
    requestAnimationFrame(function () { cap.className = "nw-newest on"; });
  }

  var active = null;
  function stopActive() {
    if (!active) return;
    active.frame.replaceChildren(active.thumb);
    active = null;
  }

  function card(s) {
    var c = el("article", "nw-card");
    var frame = el("div", "nw-frame");
    var thumb = el("button", "nw-thumb");
    thumb.type = "button";
    thumb.setAttribute("aria-label", "Play Short: " + s.title);
    var img = el("img");
    img.loading = "lazy";
    img.alt = "";
    img.src = "https://i.ytimg.com/vi/" + s.id + "/hqdefault.jpg";
    thumb.appendChild(img);
    thumb.appendChild(el("span", "nw-play"));
    thumb.addEventListener("click", function () {
      stopActive();
      var p = document.createElement("iframe");
      p.src = "https://www.youtube-nocookie.com/embed/" + s.id + "?autoplay=1&rel=0&playsinline=1";
      p.title = s.title;
      p.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      p.allowFullscreen = true;
      frame.replaceChildren(p);
      active = { frame: frame, thumb: thumb };
    });
    frame.appendChild(thumb);
    c.appendChild(frame);
    c.appendChild(el("p", "nw-title", s.title));
    if (s.parent && ID.test(s.parent)) {
      c.appendChild(link(el("a", "nw-guide", "Related guide →"), watch(s.parent)));
    } else {
      c.appendChild(el("span", "nw-guide"));
    }
    return c;
  }

  function arrows(wrap, rail) {
    var prev = el("button", "nw-arrow nw-prev", "‹");
    var next = el("button", "nw-arrow nw-next", "›");
    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Previous Shorts");
    next.setAttribute("aria-label", "Next Shorts");
    function step(dir) {
      var calm = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
      rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: calm ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    function sync() {
      var over = rail.scrollWidth > rail.clientWidth + 4;
      prev.style.display = over && rail.scrollLeft > 8 ? "block" : "none";
      next.style.display = over && rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 8 ? "block" : "none";
    }
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    wrap.appendChild(prev);
    wrap.appendChild(next);
    sync();
    setTimeout(sync, 600);
  }

  function build(data) {
    var shorts = (data.shorts || []).filter(function (s) { return ID.test(s.id); });
    var longs = (data.longs || []).filter(function (v) { return ID.test(v.id); });
    addCss();
    hero(longs[0]);
    if (!shorts.length) return;
    var sec = el("section", "nw-shorts");
    sec.id = "shorts";
    sec.setAttribute("aria-label", "Latest Shorts");
    sec.appendChild(el("h2", "", "Latest Shorts"));
    sec.appendChild(el("p", "nw-sub", "Clips from my GTA 6 sessions. Tap one to play."));
    var wrap = el("div", "nw-wrap");
    var rail = el("div", "nw-rail");
    shorts.forEach(function (s) { rail.appendChild(card(s)); });
    wrap.appendChild(rail);
    sec.appendChild(wrap);
    sec.appendChild(link(el("a", "nw-all", "See all videos on YouTube"), CHANNEL));
    var main = document.querySelector("main");
    if (main && main.parentNode) main.parentNode.insertBefore(sec, main.nextSibling);
    else document.body.appendChild(sec);
    arrows(wrap, rail);
  }

  fetch("data/videos.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) build(d); })
    .catch(function () { /* no data: the page stays as it was */ });
})();
