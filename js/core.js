// spice-bd core logic — pure functions, no DOM. Shared by app + Node tests.
(function (root) {
  'use strict';

  var DATA = root.SPICE_DATA;
  var SPICES = DATA.SPICES;
  var BLENDS = DATA.BLENDS;

  function norm(s) {
    return (s || '').toString().trim().toLowerCase();
  }

  // Search across Bengali name, English name and transliteration.
  function searchSpices(query, formFilter, favOnly, favSet) {
    var q = norm(query);
    return SPICES.filter(function (sp) {
      if (formFilter && formFilter !== 'all' && sp.form !== formFilter) return false;
      if (favOnly && !(favSet && favSet[sp.id])) return false;
      if (!q) return true;
      var hay = [sp.bn, sp.en, sp.tr].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function spiceById(id) {
    for (var i = 0; i < SPICES.length; i++) if (SPICES[i].id === id) return SPICES[i];
    return null;
  }

  function blendById(id) {
    for (var i = 0; i < BLENDS.length; i++) if (BLENDS[i].id === id) return BLENDS[i];
    return null;
  }

  // Blend math: grams per ingredient for a total weight. Rounded to 1 decimal;
  // the largest part absorbs the rounding remainder so parts sum to total.
  function blendGrams(blend, totalGrams) {
    if (!blend || !isFinite(totalGrams) || totalGrams <= 0) return null;
    var rows = blend.parts.map(function (p) {
      var sp = spiceById(p.spice);
      return { spice: p.spice, name: sp ? sp.en : p.spice, bn: sp ? sp.bn : '', pct: p.pct,
               grams: Math.round((totalGrams * p.pct / 100) * 10) / 10 };
    });
    var sum = rows.reduce(function (a, r) { return a + r.grams; }, 0);
    var diff = Math.round((totalGrams - sum) * 10) / 10;
    if (diff !== 0) {
      var biggest = rows[0];
      rows.forEach(function (r) { if (r.pct > biggest.pct) biggest = r; });
      biggest.grams = Math.round((biggest.grams + diff) * 10) / 10;
    }
    return rows;
  }

  function blendPctSum(blend) {
    return blend.parts.reduce(function (a, p) { return a + p.pct; }, 0);
  }

  // Quiz: n questions. Each asks "which spice matches this description?",
  // with 3 distractors drawn from other spices. rng is injectable for tests.
  function buildQuiz(n, rng) {
    rng = rng || Math.random;
    var pool = SPICES.slice();
    var questions = [];
    var count = Math.min(n, pool.length);
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(rng() * pool.length);
      var answer = pool.splice(idx, 1)[0];
      var others = SPICES.filter(function (s) { return s.id !== answer.id; });
      var options = [answer];
      while (options.length < 4) {
        var pick = others[Math.floor(rng() * others.length)];
        if (options.indexOf(pick) === -1) options.push(pick);
      }
      // Fisher-Yates shuffle with injected rng
      for (var j = options.length - 1; j > 0; j--) {
        var k = Math.floor(rng() * (j + 1));
        var tmp = options[j]; options[j] = options[k]; options[k] = tmp;
      }
      questions.push({ answerId: answer.id, clueEn: answer.descEn, clueBn: answer.descBn,
                       options: options.map(function (o) { return o.id; }) });
    }
    return questions;
  }

  // Storage shape validation for import.
  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'spice-bd') return false;
    if (obj.favourites && typeof obj.favourites !== 'object') return false;
    if (obj.box && typeof obj.box !== 'object') return false;
    if (obj.notes && typeof obj.notes !== 'object') return false;
    if (obj.bestScore !== undefined && (typeof obj.bestScore !== 'number' || obj.bestScore < 0)) return false;
    var ids = {};
    SPICES.forEach(function (s) { ids[s.id] = true; });
    var ok = true;
    ['favourites', 'box', 'notes'].forEach(function (key) {
      if (!obj[key]) return;
      Object.keys(obj[key]).forEach(function (id) { if (!ids[id]) ok = false; });
    });
    return ok;
  }

  function missingSpices(box) {
    return SPICES.filter(function (sp) { return !(box && box[sp.id]); });
  }

  function toBnDigits(s) {
    var map = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(s).replace(/[0-9]/g, function (d) { return map[d]; });
  }

  function fmtNum(n, lang) {
    var s = String(n);
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  var api = {
    searchSpices: searchSpices, spiceById: spiceById, blendById: blendById,
    blendGrams: blendGrams, blendPctSum: blendPctSum, buildQuiz: buildQuiz,
    validateBackup: validateBackup, missingSpices: missingSpices,
    toBnDigits: toBnDigits, fmtNum: fmtNum
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SPICE_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
