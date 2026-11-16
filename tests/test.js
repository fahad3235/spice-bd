// spice-bd tests — run with: node tests/test.js
// Covers data integrity, search, blend math, quiz generation, backup validation.
'use strict';

const assert = require('node:assert');
const DATA = require('../js/data.js');
const CORE = require('../js/core.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + ': ' + e.message); process.exitCode = 1; }
}

// Seeded rng so quiz tests are deterministic.
function seeded(seed) {
  let s = seed;
  return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

console.log('data integrity');
check('24 spices, unique ids, all required fields present', () => {
  assert.strictEqual(DATA.SPICES.length, 24);
  const ids = new Set();
  for (const sp of DATA.SPICES) {
    assert.ok(sp.id && !ids.has(sp.id), 'dup/missing id: ' + sp.id);
    ids.add(sp.id);
    for (const f of ['bn', 'en', 'tr', 'form', 'flavourEn', 'flavourBn', 'descEn', 'descBn', 'subEn', 'subBn', 'tipEn', 'tipBn']) {
      assert.ok(typeof sp[f] === 'string' && sp[f].trim().length > 0, sp.id + ' missing ' + f);
    }
    assert.ok(Number.isInteger(sp.heat) && sp.heat >= 0 && sp.heat <= 3, sp.id + ' heat out of range');
    assert.ok(DATA.FORMS.includes(sp.form), sp.id + ' bad form ' + sp.form);
    assert.ok(Array.isArray(sp.dishesEn) && sp.dishesEn.length >= 4, sp.id + ' needs >=4 dishes');
    assert.strictEqual(sp.dishesEn.length, sp.dishesBn.length, sp.id + ' dish count EN/BN mismatch');
    assert.ok(Number.isInteger(sp.shelf) && sp.shelf >= 0, sp.id + ' bad shelf');
  }
});
check('4 blends, every part references a real spice, parts sum to 100', () => {
  assert.strictEqual(DATA.BLENDS.length, 4);
  for (const b of DATA.BLENDS) {
    assert.strictEqual(CORE.blendPctSum(b), 100, b.id + ' parts do not sum to 100');
    assert.ok(b.parts.length >= 4, b.id + ' too few parts');
    for (const p of b.parts) assert.ok(CORE.spiceById(p.spice), b.id + ' unknown spice ' + p.spice);
  }
});
check('i18n: en + bn share the same keys', () => {
  const en = Object.keys(DATA.I18N.en).sort();
  const bn = Object.keys(DATA.I18N.bn).sort();
  assert.deepStrictEqual(bn, en);
});

console.log('search');
check('empty query returns all 24', () => {
  assert.strictEqual(CORE.searchSpices('', 'all', false, {}).length, 24);
});
check('Bengali search finds holud', () => {
  const r = CORE.searchSpices('হলুদ', 'all', false, {});
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].id, 'holud');
});
check('English + transliteration search work', () => {
  assert.strictEqual(CORE.searchSpices('turmeric', 'all', false, {})[0].id, 'holud');
  assert.strictEqual(CORE.searchSpices('jira', 'all', false, {})[0].id, 'jira');
});
check('form filter narrows results', () => {
  const seeds = CORE.searchSpices('', 'seed', false, {});
  assert.ok(seeds.length > 0 && seeds.every((s) => s.form === 'seed'));
  assert.ok(seeds.length < 24);
});
check('favourites-only filter', () => {
  assert.strictEqual(CORE.searchSpices('', 'all', true, { jira: true }).length, 1);
  assert.strictEqual(CORE.searchSpices('', 'all', true, {}).length, 0);
});
check('no match returns empty list', () => {
  assert.strictEqual(CORE.searchSpices('zzzqqq', 'all', false, {}).length, 0);
});

console.log('blend math');
check('garam masala 100g sums to exactly 100g', () => {
  const rows = CORE.blendGrams(CORE.blendById('garam-masala'), 100);
  assert.strictEqual(rows.reduce((a, r) => a + r.grams, 0), 100);
  assert.strictEqual(rows.find((r) => r.spice === 'dhonia').grams, 30);
});
check('250g panchforon: 50g each, sums to 250', () => {
  const rows = CORE.blendGrams(CORE.blendById('panchforon'), 250);
  assert.ok(rows.every((r) => r.grams === 50));
  assert.strictEqual(rows.reduce((a, r) => a + r.grams, 0), 250);
});
check('odd total 333g still sums exactly (rounding remainder absorbed)', () => {
  for (const b of DATA.BLENDS) {
    const rows = CORE.blendGrams(b, 333);
    const sum = rows.reduce((a, r) => a + r.grams, 0);
    assert.ok(Math.abs(sum - 333) < 0.001, b.id + ' sums to ' + sum);
  }
});
check('invalid totals return null', () => {
  assert.strictEqual(CORE.blendGrams(CORE.blendById('garam-masala'), 0), null);
  assert.strictEqual(CORE.blendGrams(CORE.blendById('garam-masala'), -5), null);
  assert.strictEqual(CORE.blendGrams(null, 100), null);
});

console.log('quiz');
check('buildQuiz returns 10 questions, answer among 4 unique options', () => {
  const qs = CORE.buildQuiz(10, seeded(42));
  assert.strictEqual(qs.length, 10);
  const seen = new Set();
  for (const q of qs) {
    assert.ok(!seen.has(q.answerId), 'duplicate answer ' + q.answerId);
    seen.add(q.answerId);
    assert.strictEqual(q.options.length, 4);
    assert.strictEqual(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.answerId));
    assert.ok(q.clueEn.length > 20 && q.clueBn.length > 10);
  }
});
check('quiz is deterministic with same seed', () => {
  assert.deepStrictEqual(CORE.buildQuiz(10, seeded(7)), CORE.buildQuiz(10, seeded(7)));
});

console.log('backup validation');
check('valid backup passes, bad ones fail', () => {
  assert.strictEqual(CORE.validateBackup({ app: 'spice-bd', favourites: { jira: true }, box: {}, notes: {}, bestScore: 7 }), true);
  assert.strictEqual(CORE.validateBackup({ app: 'spice-bd' }), true);
  assert.strictEqual(CORE.validateBackup(null), false);
  assert.strictEqual(CORE.validateBackup({ app: 'other' }), false);
  assert.strictEqual(CORE.validateBackup({ app: 'spice-bd', favourites: { nosuchspice: true } }), false);
  assert.strictEqual(CORE.validateBackup({ app: 'spice-bd', bestScore: -1 }), false);
});
check('missingSpices lists exactly the unticked ones', () => {
  assert.strictEqual(CORE.missingSpices({}).length, 24);
  assert.strictEqual(CORE.missingSpices({ jira: true, holud: true }).length, 22);
});

console.log('digits');
check('Bengali digits convert correctly', () => {
  assert.strictEqual(CORE.toBnDigits('2026'), '২০২৬');
  assert.strictEqual(CORE.fmtNum(24, 'bn'), '২৪');
  assert.strictEqual(CORE.fmtNum(24, 'en'), '24');
});

console.log(passed + ' checks passed');
