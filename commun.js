/* Fun Padel : outils communs au site participants et à la page admin (connexion Supabase, session organisateur, heures). */
(function (root) {
  "use strict";
  const C = root.FUN_PADEL || {};
  const URL0 = String(C.url || "").trim().replace(/\/+$/, "");
  const KEY = String(C.cle || "").trim();
  const configure = /^https?:\/\/[^/\s]+$/.test(URL0) && KEY.length > 20 && !/VOTRE/i.test(URL0 + KEY);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Session organisateur (partagée entre admin.html et index.html, même site) ---------- */
  const SESSION = "fp_admin_session";
  const session = () => store.get(SESSION, null);
  function garder(d) {
    const s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), email: d.user ? d.user.email : (session() || {}).email };
    store.set(SESSION, s); return s;
  }
  let enCours = null;
  async function sessionValide() {
    const s = session();
    if (!s || !s.refresh_token) return null;
    if (s.expires_at * 1000 > Date.now() + 60000) return s;
    if (!enCours) enCours = (async () => {
      try {
        const r = await fetch(`${URL0}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        if (r.status === 400 || r.status === 401 || r.status === 403) { store.set(SESSION, null); return null; }
        if (!r.ok) return null;
        return garder(await r.json());
      } catch { return null; } finally { setTimeout(() => { enCours = null; }, 0); }
    })();
    return enCours;
  }
  async function entetes(extra) {
    const s = await sessionValide();
    return { apikey: KEY, Authorization: `Bearer ${s ? s.access_token : KEY}`, ...(extra || {}) };
  }
  async function auth(chemin, corps) {
    const r = await fetch(`${URL0}/auth/v1/${chemin}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(d.msg || d.error_description || d.message || d.error || ("Erreur " + r.status)); e.code = d.error_code || d.code || r.status; throw e; }
    return d;
  }
  async function deconnexion() {
    const s = session(); store.set(SESSION, null);
    if (s) try { await fetch(`${URL0}/auth/v1/logout`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}` } }); } catch {}
  }

  /* ---------- Heures dans le fuseau du tournoi ---------- */
  const fmtCache = new Map();
  function parties(ms, tz) {
    if (!fmtCache.has(tz)) fmtCache.set(tz, new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const o = {}; for (const p of fmtCache.get(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  const decalage = (ms, tz) => { const p = parties(ms, tz); return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000; };
  // « 2026-12-05 » + « 14:00 » dans le fuseau tz → instant UTC (ms)
  function versUtc(date, heure, tz) {
    const [y, m, d] = date.split("-").map(Number), [h, mi] = heure.split(":").map(Number);
    const naif = Date.UTC(y, m - 1, d, h, mi);
    let ms = naif - decalage(naif, tz) * 60000;
    const o2 = decalage(ms, tz); ms = naif - o2 * 60000;
    return ms;
  }
  // instant → { date: "2026-12-05", heure: "14:00" } dans le fuseau tz
  function depuisUtc(ms, tz) {
    const p = parties(ms, tz), z = n => String(n).padStart(2, "0");
    return { date: `${p.y}-${z(p.mo)}-${z(p.d)}`, heure: `${z(p.h)}:${z(p.mi)}` };
  }
  const heure = (ms, tz) => { const p = parties(ms, tz); return `${p.h}h${String(p.mi).padStart(2, "0")}`; };
  const hm = m => `${Math.floor(m / 60) % 24}h${String(m % 60).padStart(2, "0")}`;
  const dateLongue = (date, avecAnnee) => new Date(date + "T12:00:00Z").toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", ...(avecAnnee ? { year: "numeric" } : {}) });
  const memeJour = (ms, date, tz) => depuisUtc(ms, tz).date === date;

  root.FP = { URL: URL0, KEY, REST: URL0 + "/rest/v1/", configure, store, esc, session, garder, sessionValide, entetes, auth, deconnexion, versUtc, depuisUtc, heure, hm, dateLongue, memeJour };
})(window);
