// Stravatp : carte des lignes de métro courues. Aucune dépendance, juste du SVG.
"use strict";

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
  const sizeUnit = () => {
    const r = svg.getBoundingClientRect();
    if (r.width && r.height) svg.style.setProperty("--u", Math.max(box[2] / r.width, box[3] / r.height).toFixed(4));
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
    b.addEventListener("click", () => select(selected === l ? null : l, true));
    b.addEventListener("mouseenter", () => !pinned && select(l));
    b.addEventListener("mouseleave", () => !pinned && select(null));
    b.addEventListener("focus", () => select(l));
    li.appendChild(b);
    list.appendChild(li);
    l.button = b;
  }

  const detail = document.getElementById("detail");
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
    if (!l) { detail.innerHTML = hint; return; }
    for (const p of l.parts) p.parentNode.appendChild(p); // passe au premier plan dans chaque calque
    let facts;
    if (l.done) {
      const when = l.run.date ? ` le ${new Date(l.run.date + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : "";
      facts = `${fmt(l.ranKm, 1)} km courus${when}. Tracé officiel : ${fmt(l.km, 1)} km, ${l.st} stations.`;
      if (l.run.strava) facts += ` <a href="${l.run.strava}" target="_blank" rel="noopener">Voir la course sur Strava</a>`;
    } else {
      facts = `${fmt(l.km, 1)} km, ${l.st} stations. Pas encore courue.`;
    }
    detail.innerHTML = `<p class="route">Ligne ${label(l.id)} · ${l.route}</p><p class="facts">${facts}</p>`;
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
  const doneKm = done.reduce((s, l) => s + l.ranKm, 0);
  const totalKm = lines.reduce((s, l) => s + l.km, 0);
  const stations = done.reduce((s, l) => s + l.st, 0);
  document.getElementById("stats").innerHTML = `
    <div><dt>lignes courues</dt><dd>${done.length}<small>/ ${lines.length}</small></dd></div>
    <div><dt>sur ${fmt(totalKm)} km de réseau</dt><dd>${fmt(doneKm)}<small>km</small></dd></div>
    <div><dt>stations dépassées</dt><dd>${stations}</dd></div>`;

  const strip = document.getElementById("strip");
  for (const l of lines) {
    const s = document.createElement("span");
    s.className = l.done ? "is-done" : "";
    s.style.setProperty("--km", l.km.toFixed(2));
    s.style.setProperty("--c", l.color);
    strip.appendChild(s);
  }
}).catch((err) => {
  document.getElementById("detail").innerHTML = '<p class="hint">La carte n\'a pas pu charger ses données. Rechargez la page.</p>';
  console.error(err);
});
