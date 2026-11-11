/* Fun Padel : générateur de planning à partenaires tournants (utilisé par la page admin).
   Chaque tour, on fait jouer en priorité ceux qui ont le moins joué (puis ceux qui se reposent depuis le plus longtemps),
   puis on forme les équipes en évitant de rejouer avec le même partenaire et en variant les adversaires.
   Plusieurs plannings complets sont essayés et le meilleur est gardé. */
(function (root) {
  "use strict";

  function rng(seed) {   // générateur pseudo-aléatoire reproductible (mulberry32)
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function matchsParTour(n, terrains) { return Math.max(0, Math.min(terrains, Math.floor(n / 4))); }

  // Répartition attendue : combien de joueurs feront combien de matchs
  function apercu(n, terrains, tours) {
    const k = matchsParTour(n, terrains), places = k * 4 * tours;
    if (!k) return { k: 0, total: 0, bas: 0, haut: 0, nbHaut: 0 };
    const bas = Math.floor(places / n), nbHaut = places - bas * n;
    return { k, total: k * tours, bas, haut: nbHaut ? bas + 1 : bas, nbHaut };
  }

  // Nombre de tours pour que chacun joue au moins « cible » matchs
  function toursPour(n, terrains, cible) {
    const k = matchsParTour(n, terrains);
    return k ? Math.ceil((n * cible) / (4 * k)) : 0;
  }

  function essai(n, terrains, tours, rand, iterParTour) {
    const k = matchsParTour(n, terrains);
    const jeux = new Array(n).fill(0), dernier = new Array(n).fill(-1);
    const part = Array.from({ length: n }, () => new Array(n).fill(0));
    const adv = Array.from({ length: n }, () => new Array(n).fill(0));
    const matchs = [];

    const coutMatch = (a1, a2, b1, b2) =>
      1000 * (part[a1][a2] + part[b1][b2]) +
      10 * (adv[a1][b1] * adv[a1][b1] + adv[a1][b2] * adv[a1][b2] + adv[a2][b1] * adv[a2][b1] + adv[a2][b2] * adv[a2][b2]) +
      (adv[a1][b1] + adv[a1][b2] + adv[a2][b1] + adv[a2][b2]);
    const coutPlace = (s, m) => coutMatch(s[4 * m], s[4 * m + 1], s[4 * m + 2], s[4 * m + 3]);

    for (let t = 0; t < tours; t++) {
      // 1. Qui joue : ceux qui ont le moins joué, puis ceux qui attendent depuis le plus longtemps
      const bruit = Array.from({ length: n }, () => rand());
      const ordre = Array.from({ length: n }, (_, i) => i)
        .sort((x, y) => jeux[x] - jeux[y] || dernier[x] - dernier[y] || bruit[x] - bruit[y]);
      const s = ordre.slice(0, 4 * k);
      for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }

      // 2. Composition des équipes : échanges successifs tant que ça n'empire pas
      const couts = Array.from({ length: k }, (_, m) => coutPlace(s, m));
      for (let it = 0; it < iterParTour; it++) {
        const i = Math.floor(rand() * 4 * k), j = Math.floor(rand() * 4 * k);
        const mi = i >> 2, mj = j >> 2;
        if (i === j) continue;
        // échanger deux joueurs de la même équipe ne change rien
        if (mi === mj && ((i & 2) === (j & 2))) continue;
        const avant = couts[mi] + (mi === mj ? 0 : couts[mj]);
        [s[i], s[j]] = [s[j], s[i]];
        const ci = coutPlace(s, mi), cj = mi === mj ? 0 : coutPlace(s, mj);
        if (ci + cj <= avant) { couts[mi] = ci; if (mi !== mj) couts[mj] = cj; }
        else [s[i], s[j]] = [s[j], s[i]];
      }

      // 3. Enregistrement du tour
      for (let m = 0; m < k; m++) {
        const [a1, a2, b1, b2] = s.slice(4 * m, 4 * m + 4);
        part[a1][a2]++; part[a2][a1]++; part[b1][b2]++; part[b2][b1]++;
        for (const x of [a1, a2]) for (const y of [b1, b2]) { adv[x][y]++; adv[y][x]++; }
        for (const x of [a1, a2, b1, b2]) { jeux[x]++; dernier[x] = t; }
        matchs.push([t + 1, m + 1, a1, a2, b1, b2]);
      }
    }
    return matchs;
  }

  // Qualité d'un planning (aussi utilisé pour afficher les indicateurs dans l'admin)
  function analyser(n, matchs) {
    const jeux = new Array(n).fill(0);
    const part = new Map(), adv = new Map(), cle = (x, y) => x < y ? x * 1000 + y : y * 1000 + x;
    const add = (map, x, y) => map.set(cle(x, y), (map.get(cle(x, y)) || 0) + 1);
    const parTour = new Map();
    for (const [t, , a1, a2, b1, b2] of matchs) {
      add(part, a1, a2); add(part, b1, b2);
      for (const x of [a1, a2]) for (const y of [b1, b2]) add(adv, x, y);
      for (const x of [a1, a2, b1, b2]) { jeux[x]++; if (!parTour.has(t)) parTour.set(t, new Set()); parTour.get(t).add(x); }
    }
    let partRep = 0, advRep = 0, advMax = 0;
    part.forEach(v => { if (v > 1) partRep += v - 1; });
    adv.forEach(v => { if (v > 1) advRep += v - 1; advMax = Math.max(advMax, v); });
    // repos le plus long entre deux matchs d'un même joueur
    const tours = [...parTour.keys()].sort((a, b) => a - b);
    let attenteMax = 0;
    for (let p = 0; p < n; p++) {
      const joues = tours.filter(t => parTour.get(t).has(p));
      for (let i = 1; i < joues.length; i++) attenteMax = Math.max(attenteMax, joues[i] - joues[i - 1] - 1);
    }
    const min = n ? Math.min(...jeux) : 0, max = n ? Math.max(...jeux) : 0;
    const repartition = {};
    jeux.forEach(j => { repartition[j] = (repartition[j] || 0) + 1; });
    return { jeux, min, max, repartition, partenairesRepetes: partRep, adversairesRepetes: advRep, adversairesMax: advMax, attenteMax };
  }

  function note(a) { return a.partenairesRepetes * 1e6 + (a.max - a.min) * 1e5 + a.adversairesRepetes * 100 + a.adversairesMax * 10 + a.attenteMax; }

  // n joueurs, terrains, tours ; renvoie { matchs: [[tour, terrain, A1, A2, B1, B2], …], analyse, graine }
  function generer({ joueurs: n, terrains, tours, graine, essais }) {
    if (n < 4) throw new Error("Il faut au moins 4 joueurs.");
    if (terrains < 1 || tours < 1) throw new Error("Il faut au moins 1 terrain et 1 tour.");
    const k = matchsParTour(n, terrains);
    const seed = graine == null ? Math.floor(Math.random() * 2 ** 31) : graine;
    const rand = rng(seed);
    const nbEssais = essais || Math.max(8, Math.min(60, Math.round(60000 / (tours * k * 4 * k + 1))));
    const iter = 250 * k + 200;
    let meilleur = null, meilleureNote = Infinity, meilleureAnalyse = null;
    for (let e = 0; e < nbEssais; e++) {
      const m = essai(n, terrains, tours, rand, iter), a = analyser(n, m), s = note(a);
      if (s < meilleureNote) { meilleur = m; meilleureNote = s; meilleureAnalyse = a; }
      if (s === 0) break;
    }
    return { matchs: meilleur, analyse: meilleureAnalyse, graine: seed };
  }

  root.FunPadelPlanning = { generer, analyser, apercu, toursPour, matchsParTour };
  if (typeof module !== "undefined") module.exports = root.FunPadelPlanning;
})(typeof window !== "undefined" ? window : globalThis);
