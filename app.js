// Métrava : carte des lignes de métro courues. Aucune dépendance, juste du SVG.
"use strict";

// Lien du bouton « Flux live Strava ». Vide : on renvoie vers la dernière course.
const STRAVA_PROFILE = ""; // ex. https://www.strava.com/athletes/12345678

// Ordre RATP. st = nombre de stations (open data IDFM), utile pour les stats.
const LINES = [
  { id: "1", route: "La Défense ↔ Château de Vincennes", st: 25 },
  { id: "2", route: "Porte Dauphine ↔ Nation", st: 25 },
  { id: "3", route: "Pont de Levallois ↔ Gallieni", st: 25 },
  { id: "3bis", route: "Gambetta ↔ Porte des Lilas", st: 4 },
  { id: "4", route: "Porte de Clignancourt ↔ Bagneux–Lucie Aubrac", st: 29 },
  { id: "5", route: "Bobigny–Pablo Picasso ↔ Place d'Italie", st: 22 },
  { id: "6", route: "Charles de Gaulle–Étoile ↔ Nation", st: 28 },
  { id: "7", route: "La Courneuve ↔ Villejuif / Mairie d'Ivry", st: 38 },
  { id: "7bis", route: "Louis Blanc ↔ Pré-Saint-Gervais", st: 8 },
  { id: "8", route: "Balard ↔ Créteil–Pointe du Lac", st: 38 },
  { id: "9", route: "Pont de Sèvres ↔ Mairie de Montreuil", st: 37 },
  { id: "10", route: "Boulogne–Pont de Saint-Cloud ↔ Gare d'Austerlitz", st: 23 },
  { id: "11", route: "Châtelet ↔ Rosny–Bois-Perrier", st: 19 },
  { id: "12", route: "Mairie d'Issy ↔ Mairie d'Aubervilliers", st: 31 },
  { id: "13", route: "Châtillon–Montrouge ↔ Saint-Denis / Les Courtilles", st: 32 },
  { id: "14", route: "Saint-Denis Pleyel ↔ Aéroport d'Orly", st: 21 },
];

const NS = "http://www.w3.org/2000/svg";
const LAT0 = 48.86, K = Math.cos(LAT0 * Math.PI / 180), SCALE = 1000;
const project = ([lon, lat]) => [(lon - 2.35) * K * SCALE, -(lat - LAT0) * SCALE];

// Polyline Google (précision 1e-5) → [[lon, lat], …]
function decode(str) {
  const out = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (let axis = 0; axis < 2; axis++) {
      let result = 0, shift = 0, b;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += d; else lon += d;
    }
    out.push([lon / 1e5, lat / 1e5]);
  }
  return out;
}

function km(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const dLat = (b[1] - a[1]) * Math.PI / 180, dLon = (b[0] - a[0]) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    d += 12742 * Math.asin(Math.sqrt(h));
  }
  return d;
}

// Les tracés IDFM arrivent en tronçons inter-stations dans le désordre :
// on les recolle bout à bout pour que l'animation parcoure la ligne d'un trait.
function chain(segments) {
  const key = (p) => p[0].toFixed(5) + "," + p[1].toFixed(5);
  const left = segments.map((s) => s.slice());
  const chains = [];
  while (left.length) {
    let c = left.shift();
    for (let grown = true; grown;) {
      grown = false;
      for (let i = 0; i < left.length; i++) {
        const s = left[i], head = key(c[0]), tail = key(c[c.length - 1]);
        if (key(s[0]) === tail) c = c.concat(s.slice(1));
        else if (key(s[s.length - 1]) === tail) c = c.concat(s.slice(0, -1).reverse());
        else if (key(s[s.length - 1]) === head) c = s.concat(c.slice(1));
        else if (key(s[0]) === head) c = s.slice(1).reverse().concat(c);
        else continue;
        left.splice(i, 1); grown = true; break;
      }
    }
    chains.push(c);
  }
  return chains;
}

const toD = (lines) => lines.map((pts) => "M" + pts.map((p) => project(p).map((v) => v.toFixed(1)).join(",")).join("L")).join("");

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

// Texte lisible sur la couleur officielle de la ligne
function textOn(hex) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#1E2B32" : "#FFFFFF";
}

const fmt = (n, d = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const label = (id) => `<span>${id.replace("bis", "<sup>bis</sup>")}</span>`;
const day = (iso, opts = { day: "numeric", month: "long", year: "numeric" }) => new Date(iso + "T12:00").toLocaleDateString("fr-FR", opts);
const pace = (sec, km) => { const s = Math.round(sec / km); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const duration = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, "0")}` : `${m} min`; };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Coureur articulé : la hanche est fixe, cuisses, tibias, bras et avant-bras sont recalculés à chaque image
const RUNNER = (cls, name) => `<svg class="runner ${cls}" viewBox="-12 -16 24 30" role="img" aria-label="${name}">
  <path class="back leg"/><path class="back arm"/><path class="torso"/><circle class="head" r="2.7"/>
  <path class="front leg"/><path class="front arm"/></svg>`;

// Point à « len » de p dans la direction « deg » : 0° vers le bas, positif vers l'avant
const reach = ([x, y], len, deg) => [x + len * Math.sin(deg * Math.PI / 180), y + len * Math.cos(deg * Math.PI / 180)];
const xy = (p) => p.map((v) => v.toFixed(2)).join(",");

// Une foulée complète pour φ de 0 à 2π
function pose(r, phi) {
  const hip = [0, 0.9 * Math.cos(2 * phi)]; // le corps descend à chaque appui
  const shoulder = reach(hip, 9, 168); // buste penché de 12° vers l'avant
  const leg = (f) => {
    const thigh = 28 * Math.sin(f);
    const knee = 10 + 75 * Math.max(0, Math.cos(f + 0.4)) ** 3; // genou très plié en début de retour de jambe
    const k = reach(hip, 6.6, thigh);
    return `M${xy(hip)}L${xy(k)}L${xy(reach(k, 6.6, thigh - knee))}`;
  };
  const arm = (a) => { const e = reach(shoulder, 5, a); return `M${xy(shoulder)}L${xy(e)}L${xy(reach(e, 4.4, a + 95))}`; };
  r.frontLeg.setAttribute("d", leg(phi));
  r.backLeg.setAttribute("d", leg(phi + Math.PI));
  r.frontArm.setAttribute("d", arm(-34 * Math.sin(phi))); // chaque bras part à l'opposé de la jambe du même côté
  r.backArm.setAttribute("d", arm(34 * Math.sin(phi)));
  r.torso.setAttribute("d", `M${xy(hip)}L${xy(shoulder)}`);
  const head = reach(shoulder, 3.6, 168);
  r.head.setAttribute("cx", head[0].toFixed(2));
  r.head.setAttribute("cy", head[1].toFixed(2));
}

function animateRunners(svgs) {
  const rs = svgs.map((s) => ({
    frontLeg: s.querySelector(".front.leg"), backLeg: s.querySelector(".back.leg"),
    frontArm: s.querySelector(".front.arm"), backArm: s.querySelector(".back.arm"),
    torso: s.querySelector(".torso"), head: s.querySelector(".head"),
  }));
  const frame = (now) => {
    rs.forEach((r, i) => pose(r, (now / 700) * 2 * Math.PI + i * 2.3)); // 700 ms la foulée, Tobias décalé
    if (!reduced) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function load() {
  if (window.__DATA) return window.__DATA; // version tout-en-un (aperçu)
  const get = (f) => fetch("data/" + f).then((r) => r.json());
  const [metro, fond, runs] = await Promise.all([get("metro-lines.json"), get("paris-fond.json"), get("runs.json")]);
  return { metro, fond, runs };
}

load().then(({ metro, fond, runs }) => {
  const svg = document.getElementById("svg");

  const lines = LINES.map((meta, i) => {
    const raw = metro[meta.id];
    const segs = raw.s.map(decode);
    const run = runs[meta.id] || null;
    const trace = run && run.trace ? decode(run.trace) : null;
    return {
      ...meta, i, color: "#" + raw.c, segs,
      chains: chain(segs),
      km: segs.reduce((s, p) => s + km(p), 0),
      run, trace, done: !!run,
      ranKm: run ? (run.km || (trace ? km(trace) : segs.reduce((s, p) => s + km(p), 0))) : 0,
    };
  });

  // Cadre : Paris et mes traces, avec une marge. Les antennes de banlieue restantes filent hors champ.
  const framed = [...fond.arr.flatMap((r) => decode(r)), ...lines.flatMap((l) => l.trace || [])].map(project);
  const xs = framed.map((p) => p[0]), ys = framed.map((p) => p[1]);
  const pad = 3;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  svg.setAttribute("viewBox", box.join(" "));

  // --u = unités SVG par pixel écran, pour garder des traits de la même épaisseur à toutes les tailles
  const scale = document.getElementById("scale");
  const sizeUnit = () => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const u = Math.max(box[2] / r.width, box[3] / r.height);
    svg.style.setProperty("--u", u.toFixed(4));
    // 1 km = 1/111,2 degré de latitude ; on prend la plus grande longueur ronde qui tient en ~110 px
    const pxPerKm = 1000 / 111.195 / u;
    const kmBar = [5, 2, 1, 0.5].find((k) => k * pxPerKm <= 110) || 0.5;
    scale.style.setProperty("--w", (kmBar * pxPerKm).toFixed(1) + "px");
    scale.querySelector("span").textContent = `${fmt(kmBar, kmBar < 1 ? 1 : 0)} km`;
  };
  sizeUnit();
  new ResizeObserver(sizeUnit).observe(svg);

  const base = el("g", {}, svg);
  for (const r of fond.arr) el("path", { d: toD([decode(r)]) + "Z", class: "arr" }, base);
  for (const r of fond.eau) el("path", { d: toD([decode(r)]) + "Z", class: "eau" }, base);

  // Calques : lignes à faire, puis tracés officiels des lignes faites, puis mes traces GPS par-dessus tout
  const layers = ["todo", "ghost", "run", "hit"].reduce((o, k) => ({ ...o, [k]: el("g", {}, svg) }), {});
  let order = 0;
  for (const l of lines) {
    const style = `--c:${l.color};--i:${l.done ? order++ : l.i}`;
    const part = (layer) => el("g", { class: "line", "data-line": l.id, style }, layers[layer]);
    const official = toD(l.chains);
    l.parts = [];
    if (l.done) {
      // Sans trace GPS, on retombe sur le tracé officiel
      const d = l.trace ? toD([l.trace]) : official;
      const ghost = part("ghost");
      if (l.trace) el("path", { d: official, class: "ghost" }, ghost);
      const run = part("run");
      el("path", { d, class: "run", pathLength: 1 }, run);
      l.parts.push(ghost, run);
    } else {
      l.parts.push(part("todo"));
      el("path", { d: official, class: "todo" }, l.parts[0]);
    }
    const hit = part("hit");
    el("path", { d: official, class: "hit" }, hit);
    if (l.trace) el("path", { d: toD([l.trace]), class: "hit" }, hit);
    l.parts.push(hit);
    l.g = hit;
  }

  // Pastilles
  const list = document.getElementById("roundels");
  for (const l of lines) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "roundel " + (l.done ? "is-done" : "is-todo");
    b.style.setProperty("--c", l.color);
    b.style.setProperty("--t", textOn(l.color.slice(1)));
    b.innerHTML = label(l.id);
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", `Ligne ${l.id.replace("bis", " bis")}, ${l.done ? "courue" : "à courir"}`);
    b.addEventListener("click", () => select(selected === l && pinned ? null : l, true));
    b.addEventListener("mouseenter", () => !pinned && select(l));
    b.addEventListener("mouseleave", () => !pinned && select(null));
    b.addEventListener("focus", () => select(l));
    li.appendChild(b);
    list.appendChild(li);
    l.button = b;
  }

  const detail = document.getElementById("detail");
  const map = document.getElementById("map"), sticker = document.getElementById("sticker"), leader = document.getElementById("leader");
  const hint = '<p class="hint">Survolez ou touchez une ligne pour voir son parcours.</p>';
  detail.innerHTML = hint;
  let selected = null, pinned = false, fill = null;

  // Carte → pixels de la figure : même calcul que preserveAspectRatio="xMidYMid meet"
  const toScreen = () => {
    const W = map.clientWidth, H = map.clientHeight, k = Math.min(W / box[2], H / box[3]);
    const ox = (W - box[2] * k) / 2, oy = (H - box[3] * k) / 2;
    return ([x, y]) => [ox + (x - box[0]) * k, oy + (y - box[1]) * k];
  };

  // Pose la fiche dans la zone libre la plus proche de la ligne isolée.
  // Grille de 8 px : les cases que touche la ligne (+16 px de marge) sont prises,
  // une table de sommes dit en une opération si un rectangle candidat est libre.
  function placeSticker(l) {
    const C = 8, W = map.clientWidth, H = map.clientHeight;
    const cols = Math.ceil(W / C), rows = Math.ceil(H / C);
    const busy = new Uint8Array(cols * rows);
    const mark = (x, y, r) => {
      const cx = Math.floor(x / C), cy = Math.floor(y / C);
      for (let j = Math.max(0, cy - r); j <= Math.min(rows - 1, cy + r); j++)
        for (let i = Math.max(0, cx - r); i <= Math.min(cols - 1, cx + r); i++) busy[j * cols + i] = 1;
    };
    const s2p = toScreen(), pts = [];
    for (const c of [...(l.trace ? [l.trace] : []), ...l.chains]) {
      const p = c.map((q) => s2p(project(q)));
      p.forEach((b, i) => {
        const a = p[i - 1];
        const n = a ? Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4) : 1;
        for (let t = 1; t <= n; t++) pts.push(a ? [a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n] : b);
      });
    }
    for (const [x, y] of pts) mark(x, y, 2);
    mark(12, 20, 4); // flèche nord

    const S = new Uint32Array((cols + 1) * (rows + 1)), w1 = cols + 1;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) S[(j + 1) * w1 + i + 1] = busy[j * cols + i] + S[j * w1 + i + 1] + S[(j + 1) * w1 + i] - S[j * w1 + i];

    const w = sticker.offsetWidth, h = sticker.offsetHeight;
    const wc = Math.ceil(w / C), hc = Math.ceil(h / C);
    const sparse = pts.filter((_, k) => k % 3 === 0);
    const mid = pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length], [0, 0]);
    let best = null;
    for (let j = 0; j + hc <= rows; j++)
      for (let i = 0; i + wc <= cols; i++) {
        const hits = S[(j + hc) * w1 + i + wc] - S[j * w1 + i + wc] - S[(j + hc) * w1 + i] + S[j * w1 + i];
        if (best && hits > best.hits) continue;
        const cx = (i + wc / 2) * C, cy = (j + hc / 2) * C;
        let near = Infinity;
        for (const [x, y] of sparse) near = Math.min(near, (x - cx) ** 2 + (y - cy) ** 2);
        const score = Math.sqrt(near) + 0.25 * Math.hypot(cx - mid[0], cy - mid[1]);
        if (!best || hits < best.hits || score < best.score) best = { hits, score, x: i * C, y: j * C };
      }
    const x = Math.min(best.x, W - w), y = Math.min(best.y, H - h);
    sticker.style.setProperty("--tx", x + "px");
    sticker.style.setProperty("--ty", y + "px");

    // Trait d'ancrage : du bord de la fiche au point de la ligne le plus proche
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let q = null, d = Infinity;
    for (const p of pts) {
      const e = Math.hypot(p[0] - clamp(p[0], x, x + w), p[1] - clamp(p[1], y, y + h));
      if (e < d) { d = e; q = p; }
    }
    const from = [clamp(q[0], x, x + w), clamp(q[1], y, y + h)];
    const [line, dot] = leader.children;
    line.setAttribute("x1", from[0]); line.setAttribute("y1", from[1]);
    line.setAttribute("x2", q[0]); line.setAttribute("y2", q[1]);
    dot.setAttribute("cx", q[0]); dot.setAttribute("cy", q[1]);
    leader.classList.toggle("is-on", d > 6);
  }
  new ResizeObserver(() => selected && placeSticker(selected)).observe(map);

  function select(l, pin = false) {
    selected = l;
    pinned = pin && !!l;
    svg.classList.toggle("has-focus", !!l);
    list.classList.toggle("has-focus", !!l);
    for (const x of lines) {
      for (const p of x.parts) p.classList.toggle("is-focus", x === l);
      x.button.setAttribute("aria-pressed", String(x === l));
    }
    if (fill) { fill.cancel(); fill = null; }
    sticker.hidden = !l;
    if (!l) { leader.classList.remove("is-on"); detail.innerHTML = hint; return; }
    // Passe au premier plan dans chaque calque, sauf la trace : la déplacer relancerait son animation CSS d'arrivée
    for (const p of l.parts) if (!p.querySelector(".run")) p.parentNode.appendChild(p);

    const stat = (name, value, unit = "") => `<div><dt>${name}</dt><dd>${value}${unit && `<small>${unit}</small>`}</dd></div>`;
    let title, stats;
    if (l.done) {
      title = `<b>Ligne ${label(l.id)}</b>${l.run.date ? ` · ${day(l.run.date)}` : ""}`;
      stats = stat("Distance", fmt(l.ranKm, 2), "km");
      if (l.run.time) stats += stat("Allure", pace(l.run.time, l.ranKm), "/km") + stat("Temps", duration(l.run.time));
      // La ligne apparaît d'abord dans sa couleur, puis notre trace la remplit en orange
      if (!reduced) {
        const run = l.parts.find((p) => p.querySelector(".run")).querySelector(".run");
        fill = run.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
          { duration: Math.min(3200, 900 + l.ranKm * 90), delay: 350, easing: "cubic-bezier(.45, 0, .3, 1)", fill: "backwards" });
      }
    } else {
      title = `<b>Ligne ${label(l.id)}</b> · à venir`;
      stats = stat("Tracé", fmt(l.km, 1), "km") + stat("Stations", l.st);
    }
    sticker.innerHTML = `<p class="sticker-title">${title}</p><dl>${stats}</dl>`;
    placeSticker(l);

    const link = l.run && l.run.strava ? `<p class="facts"><a href="${l.run.strava}" target="_blank" rel="noopener">Voir la course sur Strava</a></p>` : `<p class="facts">${l.st} stations, pas encore courue.</p>`;
    detail.innerHTML = `<p class="route">${l.route}</p>${link}`;
  }

  for (const l of lines) {
    l.g.addEventListener("click", (e) => { e.stopPropagation(); select(selected === l && pinned ? null : l, true); });
    l.g.addEventListener("mouseenter", () => !pinned && select(l));
    l.g.addEventListener("mouseleave", () => !pinned && select(null));
  }
  svg.addEventListener("click", () => select(null));
  document.addEventListener("keydown", (e) => e.key === "Escape" && select(null));

  // Chiffres
  const done = lines.filter((l) => l.done);
  const sum = (arr, f) => arr.reduce((t, l) => t + f(l), 0);
  const ranKm = sum(done, (l) => l.ranKm);
  const last = done.map((l) => l.run.date).filter(Boolean).sort().pop();
  document.getElementById("stats").innerHTML = `
    <div><dt>lignes courues</dt><dd>${done.length}<small>/ ${lines.length}</small></dd></div>
    <div><dt>courus</dt><dd>${fmt(ranKm)}<small>km</small></dd></div>
    ${last ? `<div class="last"><dt>dernière course</dt><dd>${day(last, { day: "numeric", month: "short" })}</dd></div>` : ""}`;

  const live = document.getElementById("live");
  const latest = done.filter((l) => l.run.strava).sort((a, b) => (a.run.date < b.run.date ? 1 : -1))[0];
  live.href = STRAVA_PROFILE || (latest ? latest.run.strava : live.href);

  // Anneau : part des kilomètres (tracés officiels) et des stations des lignes courues
  const ratios = [
    { key: "km", ring: "ring-km", value: sum(done, (l) => l.km) / sum(lines, (l) => l.km), label: "du réseau", sub: `${fmt(sum(done, (l) => l.km))} sur ${fmt(sum(lines, (l) => l.km))} km` },
    { key: "st", ring: "ring-st", value: sum(done, (l) => l.st) / sum(lines, (l) => l.st), label: "des stations", sub: `${sum(done, (l) => l.st)} sur ${sum(lines, (l) => l.st)}` },
  ];
  const legend = document.getElementById("donut-legend");
  legend.innerHTML = ratios.map((r) => `<div class="${r.key}"><dd data-to="${Math.round(r.value * 100)}">0 %</dd><dt>${r.label}</dt><small>${r.sub}</small></div>`).join("");
  for (const r of ratios) document.getElementById(r.ring).style.setProperty("--p", (r.value * 100).toFixed(1));
  // Les pourcentages comptent au même rythme que l'anneau s'enroule (1,9 s après 0,5 s)
  const counters = [...legend.querySelectorAll("[data-to]")];
  const t0 = performance.now() + (reduced ? -1e4 : 500);
  const tick = (now) => {
    const k = Math.min(1, Math.max(0, (now - t0) / 1900));
    const e = 1 - (1 - k) ** 3;
    for (const c of counters) c.textContent = `${Math.round(c.dataset.to * e)} %`;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Frise numérotée, et Tobias et moi au bout de la dernière ligne courue
  const track = document.getElementById("track"), runners = document.getElementById("runners");
  runners.innerHTML = RUNNER("r-matheo", "Mathéo") + RUNNER("r-tobias", "Tobias");
  animateRunners([...runners.children]);
  for (const l of lines) {
    const s = document.createElement("div");
    s.className = "seg" + (l.done ? " is-done" : "");
    s.style.setProperty("--km", l.km.toFixed(2));
    s.style.setProperty("--c", l.color);
    s.innerHTML = `<i></i><b>${l.id.replace("bis", "<sup>bis</sup>")}</b>`;
    track.appendChild(s);
    l.seg = s;
  }
  const lastDone = lines.reduce((k, l, i) => (l.done ? i : k), -1);
  const place = () => {
    const seg = lastDone >= 0 ? lines[lastDone].seg : null;
    const x = seg ? seg.offsetLeft + seg.offsetWidth - runners.offsetWidth + 4 : 0;
    runners.style.setProperty("--x", Math.max(0, x) + "px");
  };
  requestAnimationFrame(() => requestAnimationFrame(place)); // laisse partir la transition depuis 0
  let firstSize = true; // le premier appel arrive tout de suite : on ne coupe pas la course d'arrivée
  new ResizeObserver(() => {
    if (firstSize) { firstSize = false; return; }
    runners.style.transition = "none";
    place();
  }).observe(track);
}).catch((err) => {
  document.getElementById("detail").innerHTML = '<p class="hint">La carte n\'a pas pu charger ses données. Rechargez la page.</p>';
  console.error(err);
});
