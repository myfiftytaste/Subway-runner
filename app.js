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

// Petit bonhomme qui court : bras et jambes pivotent à l'épaule et à la hanche
const RUNNER = (cls, name) => `<svg class="runner ${cls}" viewBox="0 0 20 26" role="img" aria-label="${name}">
  <circle cx="12.5" cy="3.5" r="2.6"/><path d="M12 7 9.5 15"/>
  <path class="arm a1" d="M11.4 9 7.5 12.5"/><path class="arm a2" d="M11.4 9 15.2 12"/>
  <path class="leg l1" d="M9.5 15 6 23"/><path class="leg l2" d="M9.5 15 13.6 22.6"/></svg>`;

// Mini-tracé pour la fiche de course, cadré sur ses propres limites
function miniRoute(l) {
  const pts = (l.trace ? [l.trace] : l.chains).map((c) => c.map(project));
  const flat = pts.flat(), xs = flat.map((p) => p[0]), ys = flat.map((p) => p[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const side = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  const d = pts.map((c) => "M" + c.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`).join("L")).join("");
  const w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  return `<svg class="mini${l.trace ? "" : " is-todo"}" style="--c:${l.color}" viewBox="${((w - side) / 2).toFixed(1)} ${((h - side) / 2).toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}" aria-hidden="true"><path d="${d}"/></svg>`;
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
  const donut = document.getElementById("donut"), sticker = document.getElementById("sticker");
  const hint = '<p class="hint">Survolez ou touchez une ligne pour voir son parcours.</p>';
  detail.innerHTML = hint;
  let selected = null, pinned = false;

  function select(l, pin = false) {
    selected = l;
    pinned = pin && !!l;
    svg.classList.toggle("has-focus", !!l);
    list.classList.toggle("has-focus", !!l);
    for (const x of lines) {
      for (const p of x.parts) p.classList.toggle("is-focus", x === l);
      x.button.setAttribute("aria-pressed", String(x === l));
    }
    donut.hidden = !!l;
    sticker.hidden = !l;
    if (!l) { detail.innerHTML = hint; return; }
    // Passe au premier plan dans chaque calque, sauf la trace : la déplacer relancerait son animation
    for (const p of l.parts) if (!p.querySelector(".run")) p.parentNode.appendChild(p);

    const stat = (name, value, unit = "") => `<div><dt>${name}</dt><dd>${value}${unit && `<small>${unit}</small>`}</dd></div>`;
    let title, stats;
    if (l.done) {
      title = `<b>Ligne ${label(l.id)}</b>${l.run.date ? ` · ${day(l.run.date)}` : ""}`;
      stats = stat("Distance", fmt(l.ranKm, 2), "km");
      if (l.run.time) stats += stat("Allure", pace(l.run.time, l.ranKm), "/km") + stat("Temps", duration(l.run.time));
    } else {
      title = `<b>Ligne ${label(l.id)}</b> · à venir`;
      stats = stat("Tracé", fmt(l.km, 1), "km") + stat("Stations", l.st);
    }
    sticker.innerHTML = `${miniRoute(l)}<div><p class="sticker-title">${title}</p><dl>${stats}</dl></div>`;

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
