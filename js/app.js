// spice-bd app — DOM wiring. Depends on SPICE_DATA + SPICE_CORE.
(function () {
  'use strict';

  var DATA = window.SPICE_DATA;
  var CORE = window.SPICE_CORE;
  var SPICES = DATA.SPICES;
  var BLENDS = DATA.BLENDS;
  var STORE_KEY = 'spice-bd-v1';
  var LANG_KEY = 'spice-bd-lang';

  var lang = localStorage.getItem(LANG_KEY) || 'en';
  var state = load() || { favourites: {}, box: {}, notes: {}, bestScore: 0 };

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function t(key) { return DATA.I18N[lang][key] || DATA.I18N.en[key] || key; }
  function L(en, bn) { return lang === 'bn' ? bn : en; }
  function fmt(n) { return CORE.fmtNum(n, lang); }
  function heatLabel(h) { return t('heat' + h); }
  function formLabel(f) { return t('form' + f.charAt(0).toUpperCase() + f.slice(1)); }

  function $(id) { return document.getElementById(id); }

  // ---------- i18n ----------
  function applyI18n() {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    $('langToggle').textContent = lang === 'bn' ? 'English' : 'বাংলা';
    renderFormFilter();
    renderSpices();
    renderBlend();
    renderBox();
    renderQuizIntro();
    renderDataSummary();
  }

  // ---------- Tabs ----------
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      $('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  $('langToggle').addEventListener('click', function () {
    lang = lang === 'bn' ? 'en' : 'bn';
    localStorage.setItem(LANG_KEY, lang);
    applyI18n();
  });

  // ---------- Spices ----------
  function renderFormFilter() {
    var sel = $('formFilter');
    var cur = sel.value || 'all';
    sel.innerHTML = '';
    var all = document.createElement('option');
    all.value = 'all'; all.textContent = t('allForms'); sel.appendChild(all);
    DATA.FORMS.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f; o.textContent = formLabel(f); sel.appendChild(o);
    });
    sel.value = cur;
  }

  function spiceCard(sp) {
    var card = document.createElement('article');
    card.className = 'card';
    var fav = state.favourites[sp.id];
    card.innerHTML =
      '<button class="fav-btn' + (fav ? ' on' : '') + '" type="button" aria-label="Favourite ' + sp.en + '" aria-pressed="' + !!fav + '">' + (fav ? '★' : '☆') + '</button>' +
      '<div class="card-bn">' + sp.bn + '</div>' +
      '<h3>' + sp.en + '</h3>' +
      '<p class="card-tr">' + sp.tr + '</p>' +
      '<p class="card-flavour">' + L(sp.flavourEn, sp.flavourBn) + '</p>' +
      '<p class="card-meta"><span class="pill">' + formLabel(sp.form) + '</span> ' +
      '<span class="pill heat-' + sp.heat + '">' + '🌶'.repeat(sp.heat) + ' ' + heatLabel(sp.heat) + '</span></p>' +
      '<button class="btn small detail-btn" type="button">' + (lang === 'bn' ? 'বিস্তারিত' : 'Details') + ' →</button>';
    card.querySelector('.fav-btn').addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (state.favourites[sp.id]) delete state.favourites[sp.id];
      else state.favourites[sp.id] = true;
      save(); renderSpices();
    });
    card.querySelector('.detail-btn').addEventListener('click', function () { openDetail(sp); });
    return card;
  }

  function renderSpices() {
    var q = $('searchInput').value;
    var form = $('formFilter').value || 'all';
    var favOnly = $('favOnly').checked;
    var list = CORE.searchSpices(q, form, favOnly, state.favourites);
    var grid = $('spiceGrid');
    grid.innerHTML = '';
    list.forEach(function (sp) { grid.appendChild(spiceCard(sp)); });
    $('noResults').classList.toggle('hidden', list.length > 0);
    $('spiceCount').textContent = fmt(list.length) + ' / ' + fmt(SPICES.length) + ' ' + t('spicesCount');
  }

  $('searchInput').addEventListener('input', renderSpices);
  $('formFilter').addEventListener('change', renderSpices);
  $('favOnly').addEventListener('change', renderSpices);

  // ---------- Detail dialog ----------
  function openDetail(sp) {
    var body = $('detailBody');
    var shelf = sp.shelf > 0
      ? t('shelf') + ' ' + fmt(sp.shelf) + ' ' + t('months')
      : t('freshUse');
    var note = state.notes[sp.id] || '';
    body.innerHTML =
      '<h2>' + sp.en + ' <span class="detail-bn">' + sp.bn + '</span></h2>' +
      '<p class="card-tr">' + sp.tr + ' · ' + formLabel(sp.form) + ' · ' + '🌶'.repeat(sp.heat) + ' ' + heatLabel(sp.heat) + '</p>' +
      '<p>' + L(sp.descEn, sp.descBn) + '</p>' +
      '<h3>' + t('flavour') + '</h3><p>' + L(sp.flavourEn, sp.flavourBn) + '</p>' +
      '<h3>' + t('dishes') + '</h3><p>' + (lang === 'bn' ? sp.dishesBn : sp.dishesEn).join(' · ') + '</p>' +
      '<h3>' + t('substitute') + '</h3><p>' + L(sp.subEn, sp.subBn) + '</p>' +
      '<h3>' + t('tip') + '</h3><p>' + L(sp.tipEn, sp.tipBn) + '</p>' +
      '<p class="muted">' + shelf + '</p>' +
      '<label class="note-label" for="detailNote">' + (lang === 'bn' ? 'আমার নোট' : 'My note') + '</label>' +
      '<textarea id="detailNote" rows="2" placeholder="' + t('notePh') + '">' + note.replace(/</g, '&lt;') + '</textarea>' +
      '<p id="noteSaved" class="ok hidden">' + t('noteSaved') + '</p>';
    var ta = body.querySelector('#detailNote');
    ta.addEventListener('input', function () {
      var v = ta.value.trim();
      if (v) state.notes[sp.id] = v; else delete state.notes[sp.id];
      save();
      body.querySelector('#noteSaved').classList.remove('hidden');
    });
    var dlg = $('detailDialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  $('dialogClose').addEventListener('click', function () { $('detailDialog').close(); });
  $('detailDialog').addEventListener('click', function (e) {
    if (e.target === $('detailDialog')) $('detailDialog').close();
  });

  // ---------- Blends ----------
  function renderBlendSelect() {
    var sel = $('blendSelect');
    sel.innerHTML = '';
    BLENDS.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b.id; o.textContent = L(b.en, b.bn) + ' — ' + b.tr; sel.appendChild(o);
    });
  }

  function renderBlend() {
    var blend = CORE.blendById($('blendSelect').value) || BLENDS[0];
    $('blendDesc').textContent = L(blend.descEn, blend.descBn);
    var total = parseFloat($('blendTotal').value);
    var err = $('blendError');
    if (!isFinite(total) || total < 10 || total > 5000) {
      err.textContent = lang === 'bn' ? 'মোট পরিমাণ ১০–৫০০০ গ্রামের মধ্যে লিখুন।' : 'Total must be between 10 and 5000 grams.';
      err.classList.remove('hidden');
      $('blendRows').innerHTML = '';
      $('blendBar').innerHTML = '';
      return;
    }
    err.classList.add('hidden');
    var rows = CORE.blendGrams(blend, total);
    var ul = $('blendRows');
    ul.innerHTML = '';
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + r.name + ' <span class="muted">(' + r.bn + ')</span></span><strong>' + fmt(r.grams) + ' g · ' + fmt(r.pct) + '%</strong>';
      ul.appendChild(li);
    });
    var bar = $('blendBar');
    bar.innerHTML = '';
    rows.forEach(function (r) {
      var seg = document.createElement('span');
      seg.style.width = r.pct + '%';
      seg.title = r.name + ' ' + r.pct + '%';
      bar.appendChild(seg);
    });
  }

  $('blendSelect').addEventListener('change', renderBlend);
  $('blendTotal').addEventListener('input', renderBlend);
  $('blendCopy').addEventListener('click', function () {
    var blend = CORE.blendById($('blendSelect').value) || BLENDS[0];
    var total = parseFloat($('blendTotal').value);
    var rows = CORE.blendGrams(blend, total);
    if (!rows) return;
    var lines = [L(blend.en, blend.bn) + ' — ' + total + ' g'];
    rows.forEach(function (r) { lines.push('- ' + r.name + ' (' + r.bn + '): ' + r.grams + ' g (' + r.pct + '%)'); });
    copyText(lines.join('\n'), $('blendCopied'));
  });

  // ---------- Spice box ----------
  function renderBox() {
    var list = $('boxList');
    list.innerHTML = '';
    SPICES.forEach(function (sp) {
      var row = document.createElement('label');
      row.className = 'box-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state.box[sp.id];
      cb.addEventListener('change', function () {
        if (cb.checked) state.box[sp.id] = true; else delete state.box[sp.id];
        save(); renderBox();
      });
      row.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = sp.en + ' (' + sp.bn + ')';
      row.appendChild(span);
      list.appendChild(row);
    });
    var have = Object.keys(state.box).length;
    var missing = CORE.missingSpices(state.box);
    $('boxCount').textContent = fmt(have) + ' ' + t('boxHave') + ' · ' + fmt(missing.length) + ' ' + t('boxMissing') + ' / ' + fmt(SPICES.length);
    var shop = $('shopList');
    shop.innerHTML = '';
    missing.forEach(function (sp) {
      var li = document.createElement('li');
      li.textContent = sp.en + ' (' + sp.bn + ')';
      shop.appendChild(li);
    });
    $('shopCount').textContent = fmt(missing.length);
    $('boxEmpty').classList.toggle('hidden', missing.length > 0);
    $('boxCopy').disabled = missing.length === 0;
  }

  $('boxCopy').addEventListener('click', function () {
    var missing = CORE.missingSpices(state.box);
    if (!missing.length) return;
    var lines = [t('boxShop') + ':'];
    missing.forEach(function (sp) { lines.push('- ' + sp.en + ' (' + sp.bn + ')'); });
    copyText(lines.join('\n'), $('boxCopied'));
  });

  // ---------- Quiz ----------
  var quiz = null;
  function renderQuizIntro() {
    $('quizBest').textContent = fmt(state.bestScore) + ' / 10';
    $('quizIntro').textContent = lang === 'bn'
      ? 'বর্ণনা পড়ে সঠিক মসলাটি চিনুন। ১০টি প্রশ্ন, প্রতিটিতে ৪টি বিকল্প।'
      : 'Read the description and pick the right spice. 10 questions, 4 options each.';
  }

  function startQuiz() {
    quiz = { questions: CORE.buildQuiz(10), idx: 0, score: 0 };
    $('quizStart').classList.add('hidden');
    $('quizDone').classList.add('hidden');
    $('quizPlay').classList.remove('hidden');
    showQuestion();
  }

  function showQuestion() {
    var q = quiz.questions[quiz.idx];
    $('quizNum').textContent = fmt(quiz.idx + 1);
    $('quizTotal').textContent = fmt(quiz.questions.length);
    $('quizScore').textContent = fmt(quiz.score);
    $('quizClue').textContent = L(q.clueEn, q.clueBn);
    $('quizFeedback').textContent = '';
    $('quizFeedback').className = 'quiz-feedback';
    $('quizNext').classList.add('hidden');
    var opts = $('quizOptions');
    opts.innerHTML = '';
    q.options.forEach(function (id) {
      var sp = CORE.spiceById(id);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = sp.en + ' (' + sp.bn + ')';
      b.addEventListener('click', function () { answerQuiz(b, sp.id, q); });
      opts.appendChild(b);
    });
  }

  function answerQuiz(btn, pickedId, q) {
    var correct = pickedId === q.answerId;
    var fb = $('quizFeedback');
    var answer = CORE.spiceById(q.answerId);
    if (correct) {
      quiz.score++;
      fb.textContent = '✓ ' + t('quizCorrect');
      fb.className = 'quiz-feedback ok-text';
    } else {
      fb.textContent = '✕ ' + t('quizWrong') + ' ' + answer.en + ' (' + answer.bn + ').';
      fb.className = 'quiz-feedback err-text';
    }
    $('quizScore').textContent = fmt(quiz.score);
    document.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.disabled = true;
      if (b.textContent.indexOf(answer.en) === 0) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    $('quizNext').classList.remove('hidden');
    $('quizNext').textContent = quiz.idx + 1 < quiz.questions.length
      ? (lang === 'bn' ? 'পরের প্রশ্ন →' : 'Next →')
      : (lang === 'bn' ? 'ফলাফল দেখুন →' : 'See results →');
  }

  $('quizNext').addEventListener('click', function () {
    quiz.idx++;
    if (quiz.idx < quiz.questions.length) showQuestion();
    else finishQuiz();
  });

  function finishQuiz() {
    $('quizPlay').classList.add('hidden');
    $('quizDone').classList.remove('hidden');
    $('quizFinal').textContent = fmt(quiz.score) + ' / ' + fmt(quiz.questions.length);
    if (quiz.score > state.bestScore) { state.bestScore = quiz.score; save(); }
    $('quizBest2').textContent = fmt(state.bestScore) + ' / 10';
  }

  $('quizStartBtn').addEventListener('click', startQuiz);
  $('quizAgain').addEventListener('click', startQuiz);

  // ---------- Data ----------
  function renderDataSummary() {
    var favs = Object.keys(state.favourites).length;
    var have = Object.keys(state.box).length;
    var notes = Object.keys(state.notes).length;
    $('dataSummary').textContent = lang === 'bn'
      ? 'প্রিয়: ' + fmt(favs) + ' · বাক্সে আছে: ' + fmt(have) + ' · নোট: ' + fmt(notes) + ' · সেরা কুইজ স্কোর: ' + fmt(state.bestScore) + ' / 10'
      : 'Favourites: ' + fmt(favs) + ' · In spice box: ' + fmt(have) + ' · Notes: ' + fmt(notes) + ' · Best quiz score: ' + fmt(state.bestScore) + ' / 10';
  }

  $('exportBtn').addEventListener('click', function () {
    var backup = { app: 'spice-bd', version: 1, exportedAt: new Date().toISOString(),
      favourites: state.favourites, box: state.box, notes: state.notes, bestScore: state.bestScore };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'spice-bd-backup.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    showDataMsg(lang === 'bn' ? 'তথ্য এক্সপোর্ট হয়েছে।' : 'Data exported.');
  });

  $('importFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        if (!CORE.validateBackup(obj)) throw new Error('invalid');
        state.favourites = obj.favourites || {};
        state.box = obj.box || {};
        state.notes = obj.notes || {};
        state.bestScore = obj.bestScore || 0;
        save();
        showDataMsg(t('importOk'));
        applyI18n();
      } catch (err) { showDataErr(t('importBad')); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function showDataMsg(msg) {
    $('dataMsg').textContent = msg;
    $('dataMsg').classList.remove('hidden');
    $('dataErr').classList.add('hidden');
  }
  function showDataErr(msg) {
    $('dataErr').textContent = msg;
    $('dataErr').classList.remove('hidden');
    $('dataMsg').classList.add('hidden');
  }

  $('eraseBtn').addEventListener('click', function () { $('eraseBox').classList.remove('hidden'); });
  $('eraseConfirmBtn').addEventListener('click', function () {
    if ($('eraseInput').value.trim() !== 'DELETE') {
      showDataErr(lang === 'bn' ? 'মুছতে হলে ঠিক DELETE লিখুন।' : 'Type DELETE exactly to erase.');
      return;
    }
    state = { favourites: {}, box: {}, notes: {}, bestScore: 0 };
    save();
    $('eraseInput').value = '';
    $('eraseBox').classList.add('hidden');
    $('eraseDone').classList.remove('hidden');
    renderQuizIntro();
    applyI18n();
  });

  // ---------- helpers ----------
  function copyText(text, okEl) {
    function done() { if (okEl) okEl.classList.remove('hidden'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---------- init ----------
  renderBlendSelect();
  applyI18n();
})();
