// Métrava : carte des lignes de métro courues. Aucune dépendance, juste du SVG.
"use strict";

// Lien du bouton « Flux live Strava ». Vide : on renvoie vers la dernière course.
const STRAVA_PROFILE = ""; // ex. https://www.strava.com/athletes/12345678

// Ordre RATP. min : temps de parcours terminus à terminus en métro, en minutes (Wikipédia,
// moyenne des deux sens). 7 : branche de Mairie d'Ivry, la valeur basse. 13 : non publié.
const LINES = [
  { id: "1", route: "La Défense ↔ Château de Vincennes", min: 35 },
  { id: "2", route: "Porte Dauphine ↔ Nation", min: 34 },
  { id: "3", route: "Pont de Levallois ↔ Gallieni", min: 31.5 },
  { id: "3bis", route: "Gambetta ↔ Porte des Lilas", min: 4 },
  { id: "4", route: "Porte de Clignancourt ↔ Bagneux–Lucie Aubrac", min: 35.5 },
  { id: "5", route: "Bobigny–Pablo Picasso ↔ Place d'Italie", min: 35 },
  { id: "6", route: "Charles de Gaulle–Étoile ↔ Nation", min: 33 },
  { id: "7", route: "La Courneuve ↔ Villejuif / Mairie d'Ivry", min: 48 },
  { id: "7bis", route: "Louis Blanc ↔ Pré-Saint-Gervais", min: 8 },
  { id: "8", route: "Balard ↔ Créteil–Pointe du Lac", min: 52 },
  { id: "9", route: "Pont de Sèvres ↔ Mairie de Montreuil", min: 52 },
  { id: "10", route: "Boulogne–Pont de Saint-Cloud ↔ Gare d'Austerlitz", min: 28.5 },
  { id: "11", route: "Châtelet ↔ Rosny–Bois-Perrier", min: 25 },
  { id: "12", route: "Mairie d'Issy ↔ Mairie d'Aubervilliers", min: 38.5 },
  { id: "13", route: "Châtillon–Montrouge ↔ Saint-Denis / Les Courtilles", min: null },
  { id: "14", route: "Saint-Denis Pleyel ↔ Aéroport d'Orly", min: 42 },
];
const PASSED_M = 350;        // une station compte si notre trace passe à moins de 350 m
const LEFT_BANK = [5, 6, 7, 13, 14, 15]; // arrondissements de la rive gauche
const DEV_MIN_M = 30;        // en dessous, l'écart avec le tracé officiel n'est pas hachuré
const M_PER_UNIT = 111.195;  // une unité de carte = 1/1000 de degré de latitude

const I18N = {
  fr: {
    locale: "fr-FR", other: "EN", otherLabel: "Read in English",
    live: "Flux live Strava",
    title: "Paris, ligne par ligne.",
    lede: "Tobias et moi courons depuis plusieurs années. Arrivés à Paris, peut-être rapidement lassés des quais et parcs, une drôle de quête s'est formée dans notre esprit : courir (dans l'ordre bien sûr) les 16 lignes du métro parisien. Cette carte interactive en est la trace.",
    mapTitle: "Carte du métro parisien : traces de course en orange, lignes restantes en pointillés",
    hint: "Survolez ou touchez une ligne pour voir son parcours.",
    onStrava: "Voir la course sur Strava",
    notYet: (n) => `${n} stations, pas encore courue.`,
    roundel: (id, done) => `Ligne ${id}, ${done ? "courue" : "à courir"}`,
    linesRun: "lignes courues", kmRun: "courus", lastRun: "dernière course",
    ofNetwork: "du réseau", ofStations: "des stations", outOf: (a, b) => `${a} sur ${b}`,
    line: "Ligne", upcoming: "à venir", distance: "Distance", pace: "Allure", time: "Temps", offset: "Écart moyen", route: "Tracé", stations: "Stations",
    run: "Couru", toCome: "À venir",
    numbers: "En chiffres",
    numbersHint: "Survolez ou touchez un chiffre pour le voir sur la carte.",
    devLabel: "d'écart moyen avec le tracé officiel",
    seineLabel: "traversées de la Seine, rive à rive",
    portesLabel: (n) => `portes de Paris franchies, sur ${n}`,
    timeLabel: (metro) => `courus, contre ${metro} en métro*`,
    timeNote: "* Temps de parcours d'un terminus à l'autre, rame à l'heure et sans incident à bord. Source : Wikipédia.",
    histTitle: "Distribution des stations de métro selon notre nombre de passages",
    histSub: (n) => `${n} stations au total. Une station compte quand notre trace passe à moins de ${PASSED_M} m.`,
    bar: (k) => (k === 0 ? "jamais<small>(à venir)</small>" : `${k} fois`),
    barAria: (k, n) => `${n} stations passées ${k === 0 ? "aucune fois" : `${k} fois`}`,
    credits1: "Tracés des lignes et stations : Île-de-France Mobilités. Fond de carte : Ville de Paris. Courses enregistrées sur Strava.",
    credits2: "Couru avec Tobias. Carte et site : Mathéo Gunay.",
  },
  en: {
    locale: "en-GB", other: "FR", otherLabel: "Lire en français",
    live: "Live Strava feed",
    title: "Paris, line by line.",
    lede: "Tobias and I have been running for years. When we moved to Paris, perhaps quickly tired of the riverbanks and parks, an odd quest took shape: run all 16 lines of the Paris metro (in order, of course). This interactive map is its trace.",
    mapTitle: "Map of the Paris metro: our runs in orange, lines still to run dotted",
    hint: "Hover or tap a line to see its run.",
    onStrava: "See the run on Strava",
    notYet: (n) => `${n} stations, not run yet.`,
    roundel: (id, done) => `Line ${id}, ${done ? "run" : "to run"}`,
    linesRun: "lines run", kmRun: "run", lastRun: "last run",
    ofNetwork: "of the network", ofStations: "of stations", outOf: (a, b) => `${a} of ${b}`,
    line: "Line", upcoming: "coming up", distance: "Distance", pace: "Pace", time: "Time", offset: "Avg. offset", route: "Route", stations: "Stations",
    run: "Run", toCome: "To come",
    numbers: "By the numbers",
    numbersHint: "Hover or tap a figure to see it on the map.",
    devLabel: "average offset from the official route",
    seineLabel: "Seine crossings, bank to bank",
    portesLabel: (n) => `city gates passed, out of ${n}`,
    timeLabel: (metro) => `running, against ${metro} by metro*`,
    timeNote: "* End-to-end travel time, train on schedule and no incident on board. Source: Wikipedia (fr).",
    histTitle: "Metro stations by how many times we passed them",
    histSub: (n) => `${n} stations in all. A station counts when our trace passes within ${PASSED_M} m.`,
    bar: (k) => (k === 0 ? "never<small>(to come)</small>" : `${k}×`),
    barAria: (k, n) => `${n} stations passed ${k === 0 ? "never" : `${k} times`}`,
    credits1: "Lines and stations: Île-de-France Mobilités. Base map: Ville de Paris. Runs recorded on Strava.",
    credits2: "Run with Tobias. Map and site: Mathéo Gunay.",
  },
};

// Langue : #en ou #fr dans l'adresse, sinon le dernier choix, sinon celle du navigateur
const store = { get: () => { try { return localStorage.getItem("lang"); } catch { return null; } }, set: (v) => { try { localStorage.setItem("lang", v); } catch { /* navigation privée */ } } };
let lang = ["fr", "en"].find((l) => location.hash === "#" + l) || store.get() || (navigator.language.startsWith("fr") ? "fr" : "en");
const T = () => I18N[lang];

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

// Point le plus proche de p sur le segment ab, en coordonnées de carte
function nearestOnSegment(p, a, b) {
  const bx = b[0] - a[0], by = b[1] - a[1], L = bx * bx + by * by;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by) / L)) : 0;
  return [a[0] + t * bx, a[1] + t * by];
}
function nearestOn(p, edges) {
  let best = null, d = Infinity;
  for (const [a, b] of edges) {
    const q = nearestOnSegment(p, a, b), e = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (e < d) { d = e; best = q; }
  }
  return { q: best, m: Math.sqrt(d) * M_PER_UNIT };
}
const edgesOf = (chains) => chains.flatMap((c) => { const p = c.map(project); return p.slice(1).map((b, i) => [p[i], b]); });

// Points régulièrement espacés le long d'une trace
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step);
    for (let t = 1; t <= n; t++) out.push([a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n]);
  }
  return out;
}

function insidePolygon([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Texte lisible sur la couleur officielle de la ligne
function textOn(hex) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#1E2B32" : "#FFFFFF";
}

const fmt = (n, d = 0) => n.toLocaleString(T().locale, { minimumFractionDigits: d, maximumFractionDigits: d });
const label = (id) => `<span>${id.replace("bis", "<sup>bis</sup>")}</span>`;
const day = (iso, opts = { day: "numeric", month: "long", year: "numeric" }) => new Date(iso + "T12:00").toLocaleDateString(T().locale, opts);
const pace = (sec, km) => { const s = Math.round(sec / km); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const duration = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`; };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = () => matchMedia("(max-width: 860px)").matches;

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
  const [metro, fond, runs, stations] = await Promise.all(["metro-lines", "paris-fond", "runs", "stations"].map((f) => get(f + ".json")));
  return { metro, fond, runs, stations };
}

load().then(({ metro, fond, runs, stations }) => {
  const svg = document.getElementById("svg");

  const lines = LINES.map((meta, i) => {
    const raw = metro[meta.id];
    const segs = raw.s.map(decode);
    const run = runs[meta.id] || null;
    const trace = run && run.trace ? decode(run.trace) : null;
    const chains = chain(segs);
    return {
      ...meta, i, color: "#" + raw.c, segs, chains, edges: edgesOf(chains),
      st: stations[meta.id].length,
      km: segs.reduce((s, p) => s + km(p), 0),
      run, trace, done: !!run,
      ranKm: run ? (run.km || (trace ? km(trace) : segs.reduce((s, p) => s + km(p), 0))) : 0,
    };
  });
  const done = lines.filter((l) => l.done);

  // ——— Calculs : écarts, stations, portes, Seine ———
  for (const l of done.filter((x) => x.trace)) {
    const samples = resample(l.trace.map(project), 25 / M_PER_UNIT);
    const hits = samples.map((p) => ({ p, ...nearestOn(p, l.edges) }));
    l.devMean = hits.reduce((s, h) => s + h.m, 0) / hits.length;
    l.devMax = Math.max(...hits.map((h) => h.m));
    l.devD = hits.filter((h) => h.m > DEV_MIN_M).map(({ p, q }) => `M${p[0].toFixed(2)},${p[1].toFixed(2)}L${q[0].toFixed(2)},${q[1].toFixed(2)}`).join("");
    l.traceEdges = l.trace.map(project).slice(1).map((b, k) => [project(l.trace[k]), b]);
  }

  // Une station par nom, avec les lignes qui la desservent et celles qu'on a vraiment longées
  const byName = new Map();
  for (const l of lines) {
    for (const [name, lon, lat] of stations[l.id]) {
      const key = norm(name);
      const s = byName.get(key) || { name, pts: [], lines: [], passed: [] };
      s.pts.push(project([lon, lat]));
      s.lines.push(l.id);
      if (l.done && (!l.traceEdges || nearestOn(project([lon, lat]), l.traceEdges).m <= PASSED_M)) s.passed.push(l.id);
      byName.set(key, s);
    }
  }
  const uniq = [...byName.values()].map((s) => ({ ...s, p: [s.pts.reduce((a, q) => a + q[0], 0) / s.pts.length, s.pts.reduce((a, q) => a + q[1], 0) / s.pts.length] }));
  const portes = uniq.filter((s) => /^porte\b/i.test(s.name));

  // Traversées de la Seine : changement de rive d'un point de trace au suivant, rive lue sur l'arrondissement
  const arrs = fond.arr.map((r) => decode(r));
  const bank = (p) => {
    const i = arrs.findIndex((poly) => insidePolygon(p, poly));
    if (i >= 0) return LEFT_BANK.includes(i + 1) ? "L" : "R";
    if (p[1] > 48.875 && p[0] < 2.28) return p[0] < 2.2555 ? "L" : "R"; // pont de Neuilly : La Défense en face, Neuilly de ce côté
    return null; // ailleurs hors de Paris : on garde la dernière rive connue
  };
  const crossings = [];
  for (const l of done.filter((x) => x.trace)) {
    let last = null, prev = null;
    for (const p of l.trace) {
      const b = bank(p);
      if (b && last && b !== last) crossings.push(project([(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2]));
      if (b) { last = b; prev = p; }
    }
  }

  // ——— Carte ———
  const framed = [...fond.arr.flatMap((r) => decode(r)), ...lines.flatMap((l) => l.trace || [])].map(project);
  const xs = framed.map((p) => p[0]), ys = framed.map((p) => p[1]);
  const pad = 3;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  svg.setAttribute("viewBox", box.join(" "));

  // --u = unités SVG par pixel écran, pour garder des traits de la même épaisseur à toutes les tailles
  const scale = document.getElementById("scale");
  let unit = 1;
  const sizeUnit = () => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    unit = Math.max(box[2] / r.width, box[3] / r.height);
    svg.style.setProperty("--u", unit.toFixed(4));
    // 1 km = 1/111,2 degré de latitude ; on prend la plus grande longueur ronde qui tient en ~110 px
    const pxPerKm = 1000 / M_PER_UNIT / unit;
    const kmBar = [5, 2, 1, 0.5].find((k) => k * pxPerKm <= 110) || 0.5;
    scale.style.setProperty("--w", (kmBar * pxPerKm).toFixed(1) + "px");
    scale.querySelector("span").textContent = `${fmt(kmBar, kmBar < 1 ? 1 : 0)} km`;
  };
  sizeUnit();
  new ResizeObserver(sizeUnit).observe(svg);

  const base = el("g", {}, svg);
  for (const r of fond.arr) el("path", { d: toD([decode(r)]) + "Z", class: "arr" }, base);
  for (const r of fond.eau) el("path", { d: toD([decode(r)]) + "Z", class: "eau" }, base);

  // Calques : lignes à faire, tracés officiels, écarts, nos traces, zones de survol, repères
  const layers = ["todo", "ghost", "dev", "run", "hit"].reduce((o, k) => ({ ...o, [k]: el("g", {}, svg) }), {});
  const marks = el("g", { class: "marks" }, svg);
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
      l.parts.push(ghost);
      if (l.devD) { const dev = part("dev"); el("path", { d: l.devD, class: "devs" }, dev); l.parts.push(dev); }
      const run = part("run");
      l.runPath = el("path", { d, class: "run", pathLength: 1 }, run);
      l.parts.push(run);
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

  // ——— Pastilles ———
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
    b.addEventListener("click", () => toggle({ line: l }));
    b.addEventListener("mouseenter", () => !pinned && show({ line: l }));
    b.addEventListener("mouseleave", () => !pinned && show(null));
    b.addEventListener("focus", () => show({ line: l }));
    li.appendChild(b);
    list.appendChild(li);
    l.button = b;
  }
  for (const l of lines) {
    l.g.addEventListener("click", (e) => { e.stopPropagation(); toggle({ line: l }); });
    l.g.addEventListener("mouseenter", () => !pinned && show({ line: l }));
    l.g.addEventListener("mouseleave", () => !pinned && show(null));
  }

  // ——— Ce que montre la carte : rien, une ligne isolée, les écarts, ou des repères ———
  const detail = document.getElementById("detail");
  const map = document.getElementById("map"), sticker = document.getElementById("sticker"), leader = document.getElementById("leader");
  let view = null, pinned = false, fill = null;
  const same = (a, b) => !!a && !!b && (a.line ? a.line === b.line : a.key === b.key);

  function toggle(v) { if (pinned && same(view, v)) { pinned = false; show(null); } else { show(v); pinned = true; } }

  function show(v) {
    if (same(view, v) || (!view && !v)) return; // déjà affiché : surtout ne pas relancer le remplissage orange
    view = v;
    if (!v) pinned = false;
    const l = v && v.line;
    svg.classList.toggle("has-focus", !!l);
    svg.classList.toggle("show-dev", !!v && v.key === "dev");
    svg.classList.toggle("has-marks", !!v && !!v.marks);
    list.classList.toggle("has-focus", !!l);
    for (const x of lines) {
      for (const p of x.parts) p.classList.toggle("is-focus", x === l);
      x.button.setAttribute("aria-pressed", String(x === l));
    }
    for (const b of document.querySelectorAll("[data-view]")) b.setAttribute("aria-pressed", String(!!v && b.dataset.view === v.key));
    document.getElementById("bars").classList.toggle("has-focus", !!v && String(v.key).startsWith("bar"));
    if (fill) { fill.cancel(); fill = null; }
    drawMarks(v && v.marks);
    sticker.hidden = !l;
    if (!l) { leader.classList.remove("is-on"); renderDetail(null); return; }

    // Passe au premier plan, sauf la trace et la zone de survol : les déplacer relancerait l'animation ou le survol
    for (const p of l.parts) if (!(l.runPath && p.contains(l.runPath)) && p !== l.g) p.parentNode.appendChild(p);
    renderSticker(l);
    // La ligne apparaît d'abord dans sa couleur, puis notre trace la remplit en orange
    if (l.done && !reduced) {
      fill = l.runPath.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: Math.min(3200, 900 + l.ranKm * 90), delay: 350, easing: "cubic-bezier(.45, 0, .3, 1)", fill: "backwards" });
    }
    renderDetail(l);
  }
  svg.addEventListener("click", () => show(null));
  // Filet de sécurité : sortir de la carte rend toujours la vue d'ensemble, sauf ligne épinglée au clic
  map.addEventListener("mouseleave", () => { if (!pinned && view && view.line) show(null); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") show(null); });

  function renderDetail(l) {
    const t = T();
    if (!l) { detail.innerHTML = `<p class="hint">${t.hint}</p>`; return; }
    const link = l.run && l.run.strava ? `<p class="facts"><a href="${l.run.strava}" target="_blank" rel="noopener">${t.onStrava}</a></p>` : `<p class="facts">${t.notYet(l.st)}</p>`;
    detail.innerHTML = `<p class="route">${l.route}</p>${link}`;
  }

  function renderSticker(l) {
    const t = T();
    const stat = (name, value, unitTxt = "") => `<div><dt>${name}</dt><dd>${value}${unitTxt && `<small>${unitTxt}</small>`}</dd></div>`;
    let title, stats;
    if (l.done) {
      title = `<b>${t.line} ${label(l.id)}</b>${l.run.date ? ` · <span class="when">${day(l.run.date)}</span>` : ""}`;
      stats = stat(t.distance, fmt(l.ranKm, 2), "km");
      if (l.run.time) stats += stat(t.pace, pace(l.run.time, l.ranKm), "/km") + stat(t.time, duration(l.run.time));
      if (l.devMean != null) stats += stat(t.offset, fmt(l.devMean), "m");
    } else {
      title = `<b>${t.line} ${label(l.id)}</b> · ${t.upcoming}`;
      stats = stat(t.route, fmt(l.km, 1), "km") + stat(t.stations, l.st);
    }
    sticker.innerHTML = `<p class="sticker-title">${title}</p><dl>${stats}</dl>`;
    placeSticker(l);
  }

  // Repères : ponts franchis, ou stations toujours nommées sans chevauchement.
  // Les noms se posent par ordre d'importance (correspondances d'abord) ; un nom qui n'a
  // plus de place libre autour de sa station est sauté plutôt que de recouvrir un autre.
  function drawMarks(m) {
    marks.replaceChildren();
    if (!m) return;
    const r = 3.4 * unit;
    for (const p of m.bridges || []) el("circle", { cx: p[0], cy: p[1], r: r * 1.3, class: "bridge", "stroke-width": 1.6 * unit }, marks);
    const sts = [...(m.stations || [])].sort((a, b) => b.lines.length - a.lines.length || b.passed.length - a.passed.length || a.name.length - b.name.length);
    if (!sts.length) return;
    const fs = (sts.length > 15 ? 9.5 : 11) * unit, h = fs, gap = r + 2 * unit;
    const dots = sts.map((s) => [s.p[0] - r, s.p[1] - r, s.p[0] + r, s.p[1] + r]);
    const placed = [];
    const hit = (b, list) => list.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const labels = el("g", {}, marks);
    for (const s of sts) {
      el("circle", { cx: s.p[0], cy: s.p[1], r, class: "st" + (s.passed.length ? "" : " is-zero"), "stroke-width": 1.2 * unit }, marks);
      const txt = el("text", { "font-size": fs, "stroke-width": 3 * unit }, labels);
      txt.textContent = s.name;
      const w = txt.getComputedTextLength(), [x, y] = s.p; // largeur réelle, police chargée comprise
      // À droite, à gauche, dessus, dessous, puis en diagonale
      const tries = [[x + gap, y + h * 0.35, "start"], [x - gap, y + h * 0.35, "end"], [x, y - gap, "middle"], [x, y + gap + h * 0.8, "middle"],
        [x + gap * 0.7, y - gap * 0.7, "start"], [x - gap * 0.7, y - gap * 0.7, "end"], [x + gap * 0.7, y + gap * 0.7 + h * 0.7, "start"], [x - gap * 0.7, y + gap * 0.7 + h * 0.7, "end"]];
      const spot = tries.find(([tx, ty, anchor]) => {
        const x0 = anchor === "start" ? tx : anchor === "end" ? tx - w : tx - w / 2;
        const bb = [x0 - unit, ty - h * 0.95, x0 + w + unit, ty + h * 0.3];
        const inside = bb[0] >= box[0] && bb[1] >= box[1] && bb[2] <= box[0] + box[2] && bb[3] <= box[1] + box[3];
        if (!inside || hit(bb, placed) || hit(bb, dots)) return false;
        placed.push(bb);
        return true;
      });
      if (!spot) { txt.remove(); continue; }
      txt.setAttribute("x", spot[0]); txt.setAttribute("y", spot[1]); txt.setAttribute("text-anchor", spot[2]);
    }
    marks.appendChild(labels); // les noms passent au-dessus de tous les points
  }

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
  new ResizeObserver(() => { if (view && view.line) placeSticker(view.line); else if (view) drawMarks(view.marks); }).observe(map);

  // ——— Chiffres de la colonne ———
  const sum = (arr, f) => arr.reduce((t, l) => t + f(l), 0);
  const ranKm = sum(done, (l) => l.ranKm);
  const last = done.map((l) => l.run.date).filter(Boolean).sort().pop();
  const live = document.getElementById("live");
  const latest = done.filter((l) => l.run.strava).sort((a, b) => (a.run.date < b.run.date ? 1 : -1))[0];
  live.href = STRAVA_PROFILE || (latest ? latest.run.strava : live.href);

  // Anneau : part des kilomètres (tracés officiels) et des stations vraiment longées
  const passedCount = uniq.filter((s) => s.passed.length).length;
  const ratios = [
    { key: "km", ring: "ring-km", value: sum(done, (l) => l.km) / sum(lines, (l) => l.km), a: () => fmt(sum(done, (l) => l.km)), b: () => `${fmt(sum(lines, (l) => l.km))} km`, label: "ofNetwork" },
    { key: "st", ring: "ring-st", value: passedCount / uniq.length, a: () => passedCount, b: () => uniq.length, label: "ofStations" },
  ];
  for (const r of ratios) document.getElementById(r.ring).style.setProperty("--p", (r.value * 100).toFixed(1));

  // Écarts, Seine, portes, temps
  const devLines = done.filter((l) => l.devMean != null).sort((a, b) => a.devMean - b.devMean);
  const devAll = devLines.length ? sum(devLines, (l) => l.devMean * l.ranKm) / sum(devLines, (l) => l.ranKm) : 0;
  const portesPassed = portes.filter((s) => s.passed.length);
  const timed = done.filter((l) => l.run.time && l.min);

  // Histogramme : combien de stations passées 0, 1, 2… fois. L'échelle va jusqu'au maximum possible, lignes à venir comprises.
  const maxK = Math.max(...uniq.map((s) => s.lines.length));
  const buckets = Array.from({ length: maxK + 1 }, (_, k) => uniq.filter((s) => s.passed.length === k));
  const tallest = Math.max(...buckets.map((b) => b.length), 1);

  const VIEWS = {
    dev: { key: "dev" },
    seine: { key: "seine", marks: { bridges: crossings } },
    portes: { key: "portes", marks: { stations: portes } },
  };
  buckets.forEach((b, k) => { VIEWS["bar" + k] = { key: "bar" + k, marks: { stations: b } }; });

  // Un seul jeu d'écouteurs, posé sur les conteneurs : le contenu peut être redessiné (langue) sans en rajouter
  for (const holder of [document.getElementById("facts"), document.getElementById("bars")]) {
    const target = (e) => { const n = e.target.closest("[data-view]"); return n && VIEWS[n.dataset.view]; };
    holder.addEventListener("mouseover", (e) => { const v = target(e); if (v && !pinned) show(v); });
    holder.addEventListener("mouseleave", () => !pinned && show(null));
    holder.addEventListener("focusin", (e) => { const v = target(e); if (v) show(v); });
    holder.addEventListener("click", (e) => {
      const v = target(e);
      if (!v) return;
      toggle(v);
      if (phone() && view) map.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  }

  function paint() {
    const t = T();
    document.documentElement.lang = lang;
    for (const n of document.querySelectorAll("[data-i18n]")) n.textContent = t[n.dataset.i18n];
    const langBtn = document.getElementById("lang");
    langBtn.textContent = t.other;
    langBtn.setAttribute("aria-label", t.otherLabel);
    for (const l of lines) l.button.setAttribute("aria-label", t.roundel(l.id.replace("bis", " bis"), l.done));

    document.getElementById("stats").innerHTML = `
      <div><dt>${t.linesRun}</dt><dd>${done.length}<small>/ ${lines.length}</small></dd></div>
      <div><dt>${t.kmRun}</dt><dd>${fmt(ranKm)}<small>km</small></dd></div>
      ${last ? `<div class="last"><dt>${t.lastRun}</dt><dd>${day(last, { day: "numeric", month: "short" })}</dd></div>` : ""}`;

    const legend = document.getElementById("donut-legend");
    const firstPaint = !legend.children.length;
    legend.innerHTML = ratios.map((r) => `<div class="${r.key}"><dd data-to="${Math.round(r.value * 100)}">${firstPaint ? 0 : Math.round(r.value * 100)} %</dd><dt>${t[r.label]}</dt><small>${t.outOf(r.a(), r.b())}</small></div>`).join("");
    if (firstPaint) countUp(legend);

    // Frise : numéro, puis la date de la course sur un fil très fin
    for (const l of lines) {
      const when = l.done && l.run.date ? `<span>${day(l.run.date, { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>` : "";
      l.seg.innerHTML = `<i></i><b>${l.id.replace("bis", "<sup>bis</sup>")}</b><div class="when">${when}</div>`;
    }

    const facts = [];
    if (devLines.length) {
      facts.push({ view: "dev", big: `${fmt(devAll)}<small>m</small>`, lbl: t.devLabel });
    }
    facts.push({ view: "seine", big: crossings.length, lbl: t.seineLabel });
    facts.push({ view: "portes", big: portesPassed.length, lbl: t.portesLabel(portes.length) });
    if (timed.length) {
      const ran = sum(timed, (l) => l.run.time), byMetro = sum(timed, (l) => l.min * 60);
      facts.push({ big: duration(ran), lbl: t.timeLabel(duration(byMetro)) });
    }
    const pressed = (k) => String(!!view && view.key === k);
    document.getElementById("facts").innerHTML = facts.map((f) => f.view
      ? `<button class="fact" type="button" data-view="${f.view}" aria-pressed="${pressed(f.view)}"><span class="big">${f.big}</span><span class="lbl">${f.lbl}</span></button>`
      : `<div class="fact"><span class="big">${f.big}</span><span class="lbl">${f.lbl}</span></div>`).join("");

    document.getElementById("hist-sub").textContent = t.histSub(uniq.length);
    document.getElementById("bars").innerHTML = buckets.map((b, k) =>
      `<button class="bar${k === 0 ? " is-zero" : ""}" type="button" data-view="bar${k}" aria-pressed="${pressed("bar" + k)}" aria-label="${t.barAria(k, b.length)}" style="--h:${(b.length / tallest * 100).toFixed(1)}%"><span class="v">${b.length}</span><i></i><span class="k">${t.bar(k)}</span></button>`).join("");

    if (view && view.line) renderSticker(view.line);
    renderDetail(view && view.line);
  }

  // Les pourcentages comptent au même rythme que l'anneau s'enroule (1,9 s après 0,5 s)
  function countUp(legend) {
    const t0 = performance.now() + (reduced ? -1e4 : 500);
    const tick = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / 1900));
      const e = 1 - (1 - k) ** 3;
      for (const c of legend.querySelectorAll("[data-to]")) c.textContent = `${Math.round(c.dataset.to * e)} %`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Frise numérotée, et Tobias et moi au bout de la dernière ligne courue
  const track = document.getElementById("track"), runners = document.getElementById("runners");
  runners.innerHTML = RUNNER("r-matheo", "Mathéo") + RUNNER("r-tobias", "Tobias");
  animateRunners([...runners.children]);
  for (const l of lines) {
    const s = document.createElement("div");
    s.className = "seg" + (l.done ? " is-done" : "");
    s.style.setProperty("--km", l.km.toFixed(2));
    s.style.setProperty("--c", l.color);
    track.appendChild(s);
    l.seg = s;
  }
  paint();

  document.getElementById("lang").addEventListener("click", () => {
    lang = lang === "fr" ? "en" : "fr";
    store.set(lang);
    paint();
  });

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
