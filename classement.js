/* Fun Padel : calcul du classement individuel selon les règles choisies pour le tournoi. */
(function (root) {
  "use strict";

  const REGLES_DEFAUT = {
    mode: "bonus",            // "points" | "victoires" | "bareme" | "bonus"
    bonus_type: "ecart",      // mode bonus : "fixe" | "ecart" (bonus = écart du match) | "fixe_ecart" (les deux)
    bonus: 10,                // bonus fixe par victoire (la moitié pour un nul)
    plafond: 0,               // écart maximum compté dans le bonus (0 = pas de plafond)
    victoire: 3, nul: 1, defaite: 0, defaite_serree: 1, ecart_serre: 3,   // mode barème
    moyenne: "auto",          // "auto" (si tout le monde n'a pas le même nombre de matchs) | "oui" | "non"
    departages: ["diff", "pts", "ecart"]
  };

  const MODES = {
    points: { nom: "Points marqués", court: "Pts" },
    victoires: { nom: "Victoires d'abord", court: "Vict." },
    bareme: { nom: "Barème championnat", court: "Pts" },
    bonus: { nom: "Points + bonus victoire", court: "Total" }
  };
  const DEPARTAGES = {
    diff: "différence de points",
    pts: "points marqués",
    v: "nombre de victoires",
    ecart: "plus large victoire",
    conc: "moins de points encaissés"
  };

  const regles = r => ({ ...REGLES_DEFAUT, ...(r || {}) });
  const TYPES_BONUS = { fixe: "Fixe", ecart: "Égal à l'écart", fixe_ecart: "Fixe + écart" };
  // Bonus reçu par chaque gagnant pour une victoire avec cet écart (hors part fixe des nuls)
  const ecartCompte = (R, marge) => R.plafond > 0 ? Math.min(marge, R.plafond) : marge;
  function bonusVictoire(R, marge) {
    const fixe = R.bonus_type === "ecart" ? 0 : R.bonus;
    const ec = R.bonus_type === "fixe" ? 0 : ecartCompte(R, marge);
    return fixe + ec;
  }
  const arrondi = x => Math.round(x * 1000) / 1000;

  /* P : noms des joueurs du planning ; M : [[tour, terrain, A1, A2, B1, B2]] ; scores : {indexMatch: {a, b}}
     nomA(p, tour) : nom de la personne qui occupe la place p à ce tour (remplaçants compris) */
  function calculer({ P, M, scores, nomA, regles: r0 }) {
    const R = regles(r0);
    const parNom = new Map();
    const get = n => {
      if (!parNom.has(n)) parNom.set(n, { name: n, j: 0, v: 0, nul: 0, d: 0, serrees: 0, pts: 0, conc: 0, diff: 0, ecart: 0, bonusEcart: 0, planned: 0 });
      return parNom.get(n);
    };
    P.forEach(n => get(n));
    // Nombre de matchs prévus par place du planning : sert à décider de la moyenne automatique
    const prevus = new Array(P.length).fill(0);
    M.forEach((m, i) => {
      m.slice(2).forEach(p => { prevus[p]++; });
      const noms = m.slice(2).map(p => nomA(p, m[0]));
      noms.forEach(n => get(n).planned++);
      const s = scores[i]; if (!s) return;
      for (const [equipe, f, c] of [[noms.slice(0, 2), s.a, s.b], [noms.slice(2), s.b, s.a]]) for (const n of equipe) {
        const x = get(n); x.j++; x.pts += f; x.conc += c; x.diff += f - c;
        if (f > c) { x.v++; x.ecart = Math.max(x.ecart, f - c); x.bonusEcart += ecartCompte(R, f - c); }
        else if (f === c) x.nul++;
        else { x.d++; if (c - f <= R.ecart_serre) x.serrees++; }
      }
    });
    const inegal = prevus.some(v => v !== prevus[0]);
    const moyenne = R.moyenne === "oui" || (R.moyenne === "auto" && inegal);

    const valeur = x => {
      switch (R.mode) {
        case "points": return x.pts;
        case "victoires": return x.v + x.nul / 2;
        case "bareme": return x.v * R.victoire + x.nul * R.nul + x.serrees * R.defaite_serree + (x.d - x.serrees) * R.defaite;
        default: return x.pts + (R.bonus_type === "ecart" ? 0 : R.bonus * (x.v + x.nul / 2)) + (R.bonus_type === "fixe" ? 0 : x.bonusEcart);
      }
    };
    const crit = (x, k) => {
      const div = moyenne ? x.j : 1;
      switch (k) {
        case "diff": return x.diff / div;
        case "pts": return x.pts / div;
        case "v": return x.v / div;
        case "ecart": return x.ecart;
        case "conc": return -x.conc / div;
        default: return 0;
      }
    };
    const tous = [...parNom.values()].filter(x => x.planned > 0 || x.j > 0);
    const classes = tous.filter(x => x.j > 0).map(x => {
      const total = valeur(x), score = moyenne ? total / x.j : total;
      return { ...x, mode: R.mode, total, score, cles: [score, ...R.departages.map(k => crit(x, k))].map(arrondi) };
    }).sort((a, b) => {
      for (let i = 0; i < a.cles.length; i++) if (a.cles[i] !== b.cles[i]) return b.cles[i] - a.cles[i];
      return a.name.localeCompare(b.name, "fr");
    });
    let rang = 0, prec = null;
    classes.forEach((x, k) => {
      if (!prec || x.cles.some((v, i) => v !== prec.cles[i])) rang = k + 1;
      x.rank = rang; x.exaequo = false; prec = x;
    });
    classes.forEach((x, k) => { x.exaequo = classes.some((y, l) => l !== k && y.rank === x.rank); });
    const attente = tous.filter(x => x.j === 0).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return { byName: parNom, ranked: classes, waiting: attente, moyenne, regles: R };
  }

  // Affichage de la valeur principale (« 125 », « 31,4 », « 4 »)
  function format(x, moyenne) {
    if (moyenne && x.cles && x.score <= 1 && x.mode === "victoires") return `${Math.round(x.score * 100)} %`;
    const v = moyenne ? x.score : x.total;
    return Number.isInteger(v) ? String(v) : v.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  }
  function unite(R, moyenne) {
    if (R.mode === "victoires") return moyenne ? "de victoires" : "victoires";
    return moyenne ? "points par match" : "points";
  }
  function entete(R, moyenne) { return moyenne ? (R.mode === "victoires" ? "% V" : "Moy.") : MODES[R.mode].court; }

  // Phrase d'explication affichée sous le classement
  function expliquer(r0, cible, moyenne) {
    const R = regles(r0);
    const ex = cible ? `${cible}-${Math.max(0, cible - 5)}` : "25-20";
    const [g, p] = ex.split("-").map(Number);
    let base;
    if (R.mode === "points") base = `Chaque joueur reçoit les points marqués par son équipe (${ex} : ${g} points pour chaque gagnant, ${p} pour chaque perdant).`;
    else if (R.mode === "victoires") base = moyenne ? `Classement au pourcentage de victoires (un nul compte pour une demi-victoire).` : `Classement au nombre de victoires (un nul compte pour une demi-victoire).`;
    else if (R.mode === "bareme") base = `Victoire ${R.victoire} pts, nul ${R.nul} pt${R.nul > 1 ? "s" : ""}, défaite de ${R.ecart_serre} points d'écart ou moins ${R.defaite_serree} pt${R.defaite_serree > 1 ? "s" : ""}, autre défaite ${R.defaite} pt${R.defaite > 1 ? "s" : ""}.`;
    else {
      const c = cible || 25, ex1 = [c, c - 3], ex2 = [c, Math.max(0, c - 15)];
      const exemple = ([a, b]) => `${a}-${b} : ${a + bonusVictoire(R, a - b)} pour chaque gagnant, ${b} pour chaque perdant`;
      const quoi = R.bonus_type === "fixe" ? `plus ${R.bonus} points par victoire`
        : R.bonus_type === "ecart" ? `plus, en cas de victoire, un bonus égal à l'écart du match${R.plafond > 0 ? ` (${R.plafond} points maximum)` : ""}`
        : `plus, en cas de victoire, ${R.bonus} points et un bonus égal à l'écart du match${R.plafond > 0 ? ` (écart compté jusqu'à ${R.plafond} points)` : ""}`;
      base = `Chaque joueur reçoit les points marqués par son équipe, ${quoi}. Exemples : ${exemple(ex1)} ; ${exemple(ex2)}.`;
    }
    const moy = moyenne && R.mode !== "victoires" ? " Tout le monde ne jouant pas le même nombre de matchs, le classement se fait sur la moyenne par match." : moyenne ? " Tout le monde ne jouant pas le même nombre de matchs, on compare le pourcentage de matchs gagnés." : "";
    const dep = R.departages.length ? ` En cas d'égalité : ${R.departages.map(k => DEPARTAGES[k]).join(", puis ")}.` : "";
    return base + moy + dep;
  }

  root.FunPadelClassement = { calculer, format, unite, entete, expliquer, bonusVictoire, REGLES_DEFAUT, MODES, DEPARTAGES, TYPES_BONUS };
  if (typeof module !== "undefined") module.exports = root.FunPadelClassement;
})(typeof window !== "undefined" ? window : globalThis);
