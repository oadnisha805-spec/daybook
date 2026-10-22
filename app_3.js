(function () {
  var KEY = 'daybook.tasks.v1';
  var CATS = ['Work', 'Personal', 'Study', 'Other'];
  var tasks = [];
  var filter = 'all';
  var cat = 'all';
  var query = '';
  var editingId = null;
  var newId = null;
  var toastTimer = null;

  var $ = function (id) { return document.getElementById(id); };
  var list = $('list');

  /* ---------- dates ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return iso(new Date()); }
  function offsetStr(days) { var d = new Date(); d.setDate(d.getDate() + days); return iso(d); }
  function parseLocal(s) { return new Date(s + 'T00:00:00'); }
  function formatDue(s) {
    var diff = Math.round((parseLocal(s) - parseLocal(todayStr())) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return parseLocal(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function isOverdue(t) { return !t.done && t.due && t.due < todayStr(); }

  /* ---------- storage ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function saveToLocalStorage() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) { /* storage unavailable */ }
  }
  function loadFromLocalStorage() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw === null) return null;
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (e) { return null; }
  }
  function seed() {
    return [
      { id: uid(), title: 'Send project update to the team', cat: 'Work', due: todayStr(), done: false },
      { id: uid(), title: 'Book dentist appointment', cat: 'Personal', due: offsetStr(1), done: false },
      { id: uid(), title: 'Review chapter 4 notes', cat: 'Study', due: offsetStr(2), done: false },
      { id: uid(), title: 'Renew library card', cat: 'Personal', due: offsetStr(-1), done: false },
      { id: uid(), title: 'Prepare slides for Monday review', cat: 'Work', due: '', done: true }
    ];
  }

  /* ---------- icons ---------- */
  var ICONS = {
    grip: '<svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="4" cy="9" r="1.5"/><circle cx="10" cy="9" r="1.5"/><circle cx="4" cy="14" r="1.5"/><circle cx="10" cy="14" r="1.5"/></svg>',
    check: '<svg viewBox="0 0 14 14" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2.5l2.5 2.5L5.5 13H3v-2.5z"/></svg>',
    del: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>'
  };
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /* ---------- filtering ---------- */
  function matches(t) {
    if (filter === 'active' && t.done) return false;
    if (filter === 'done' && !t.done) return false;
    if (cat !== 'all' && t.cat !== cat) return false;
    if (query && t.title.toLowerCase().indexOf(query) === -1) return false;
    return true;
  }

  /* ---------- rendering ---------- */
  function createItem(t) {
    if (t.id === editingId) return createEditItem(t);
    var over = isOverdue(t);
    var li = el('li', 'task' + (t.done ? ' done' : '') + (over ? ' overdue' : ''));
    li.dataset.id = t.id;
    if (t.id === newId) li.classList.add('enter');

    var grip = el('button', 'grip', ICONS.grip);
    grip.type = 'button';
    grip.setAttribute('aria-label', 'Reorder ' + t.title);
    grip.addEventListener('pointerdown', function (e) { startDrag(e, li, grip); });
    grip.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveBy(t.id, -1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveBy(t.id, 1); }
    });

    var check = el('button', 'check', ICONS.check);
    check.type = 'button';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(t.done));
    check.setAttribute('aria-label', 'Mark "' + t.title + '" complete');
    check.addEventListener('click', function () { toggle(t.id, li, check); });

    var body = el('div', 'body');
    var title = el('span', 'title');
    title.textContent = t.title;
    title.addEventListener('dblclick', function () { startEdit(t.id); });
    body.appendChild(title);
    var meta = el('div', 'meta');
    var pill = el('span', 'pill');
    pill.dataset.cat = t.cat;
    pill.textContent = t.cat;
    meta.appendChild(pill);
    if (t.due) {
      var due = el('span', 'due');
      due.textContent = 'Due ' + formatDue(t.due);
      meta.appendChild(due);
      if (over) { var b = el('span', 'badge-over'); b.textContent = 'Overdue'; meta.appendChild(b); }
    }
    body.appendChild(meta);

    var acts = el('div', 'acts');
    var edit = el('button', 'icon-btn', ICONS.edit);
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Edit ' + t.title);
    edit.addEventListener('click', function () { startEdit(t.id); });
    var del = el('button', 'icon-btn del', ICONS.del);
    del.type = 'button';
    del.setAttribute('aria-label', 'Delete ' + t.title);
    del.addEventListener('click', function () { removeTask(t.id, li); });
    acts.appendChild(edit);
    acts.appendChild(del);

    li.appendChild(grip);
    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(acts);
    return li;
  }

  function createEditItem(t) {
    var li = el('li', 'task editing');
    li.dataset.id = t.id;
    var form = el('form', 'edit-form');
    form.noValidate = true;
    var text = el('input', 'field');
    text.type = 'text';
    text.value = t.title;
    text.maxLength = 140;
    text.setAttribute('aria-label', 'Task name');
    var sel = el('select', 'field');
    sel.setAttribute('aria-label', 'Category');
    CATS.forEach(function (c) {
      var o = document.createElement('option');
      o.textContent = c;
      if (c === t.cat) o.selected = true;
      sel.appendChild(o);
    });
    var date = el('input', 'field');
    date.type = 'date';
    date.value = t.due || '';
    date.setAttribute('aria-label', 'Due date');
    var save = el('button', 'btn primary');
    save.type = 'submit';
    save.textContent = 'Save';
    var cancel = el('button', 'btn');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    form.appendChild(text);
    form.appendChild(sel);
    form.appendChild(date);
    form.appendChild(save);
    form.appendChild(cancel);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = text.value.trim();
      if (!v) { text.focus(); return; }
      t.title = v; t.cat = sel.value; t.due = date.value;
      editingId = null;
      saveToLocalStorage();
      render();
    });
    cancel.addEventListener('click', function () { editingId = null; render(); });
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { editingId = null; render(); }
    });
    li.appendChild(form);
    setTimeout(function () { text.focus(); text.select(); }, 0);
    return li;
  }

  function updateSummary() {
    var total = tasks.length;
    var done = tasks.filter(function (t) { return t.done; }).length;
    var active = total - done;
    var pct = total ? Math.round(done / total * 100) : 0;
    $('progText').textContent = done + ' of ' + total + ' done';
    $('progPct').textContent = pct + '%';
    $('progFill').style.width = pct + '%';
    $('progBar').setAttribute('aria-valuenow', String(pct));
    $('nAll').textContent = total;
    $('nActive').textContent = active;
    $('nDone').textContent = done;
    $('left').textContent = active + (active === 1 ? ' task left' : ' tasks left');
    $('clearDone').disabled = done === 0;
    document.querySelectorAll('[data-cat-chip]').forEach(function (chip) {
      var c = chip.getAttribute('data-cat-chip');
      var n = c === 'all' ? total : tasks.filter(function (t) { return t.cat === c; }).length;
      chip.querySelector('.n').textContent = n;
    });
  }

  function render() {
    var vis = tasks.filter(matches);
    list.replaceChildren.apply(list, vis.map(createItem));
    newId = null;
    var empty = $('empty');
    if (vis.length === 0) {
      empty.hidden = false;
      if (tasks.length === 0) {
        empty.innerHTML = '<strong>Nothing on the list</strong>Add your first task above.';
      } else {
        empty.innerHTML = '<strong>No matching tasks</strong>Try a different filter or search.';
      }
    } else {
      empty.hidden = true;
    }
    updateSummary();
  }

  function buildChips() {
    var host = $('cats');
    host.replaceChildren();
    ['all'].concat(CATS).forEach(function (c) {
      var b = el('button', 'chip');
      b.type = 'button';
      b.setAttribute('data-cat-chip', c);
      b.setAttribute('aria-pressed', String(c === cat));
      b.innerHTML = '<span></span><span class="n">0</span>';
      b.firstChild.textContent = c === 'all' ? 'All categories' : c;
      b.addEventListener('click', function () {
        cat = c;
        host.querySelectorAll('.chip').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.getAttribute('data-cat-chip') === cat));
        });
        render();
      });
      host.appendChild(b);
    });
  }

  /* ---------- actions ---------- */
  function addTask(title, c, due) {
    var t = { id: uid(), title: title, cat: c, due: due, done: false };
    tasks.unshift(t);
    newId = t.id;
    saveToLocalStorage();
    render();
  }

  function toggle(id, li, check) {
    var t = tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    t.done = !t.done;
    saveToLocalStorage();
    li.classList.toggle('done', t.done);
    li.classList.toggle('overdue', isOverdue(t));
    check.setAttribute('aria-checked', String(t.done));
    updateSummary();
    if (!matches(t)) {
      li.classList.add('leaving');
      setTimeout(render, 320);
    } else if (li.querySelector('.badge-over') && t.done) {
      render();
    }
  }

  function startEdit(id) { editingId = id; render(); }

  function showToast(msg, undo) {
    var host = $('toastHost');
    clearTimeout(toastTimer);
    host.replaceChildren();
    var box = el('div', 'toast');
    box.setAttribute('role', 'status');
    var span = document.createElement('span');
    span.textContent = msg;
    var btn = el('button');
    btn.type = 'button';
    btn.textContent = 'Undo';
    btn.addEventListener('click', function () { undo(); host.replaceChildren(); });
    box.appendChild(span);
    box.appendChild(btn);
    host.appendChild(box);
    toastTimer = setTimeout(function () { host.replaceChildren(); }, 6000);
  }

  function removeTask(id, li) {
    var snapshot = tasks.slice();
    li.classList.add('leaving');
    setTimeout(function () {
      tasks = tasks.filter(function (t) { return t.id !== id; });
      saveToLocalStorage();
      render();
      showToast('Task deleted', function () { tasks = snapshot; saveToLocalStorage(); render(); });
    }, 300);
  }

  function clearCompleted() {
    var snapshot = tasks.slice();
    var n = tasks.filter(function (t) { return t.done; }).length;
    if (!n) return;
    tasks = tasks.filter(function (t) { return !t.done; });
    saveToLocalStorage();
    render();
    showToast(n + (n === 1 ? ' completed task cleared' : ' completed tasks cleared'), function () { tasks = snapshot; saveToLocalStorage(); render(); });
  }

  /* ---------- reordering ---------- */
  function commitOrder() {
    var ids = Array.prototype.map.call(list.children, function (li) { return li.dataset.id; });
    var positions = [];
    tasks.forEach(function (t, i) { if (ids.indexOf(t.id) !== -1) positions.push(i); });
    var byId = {};
    tasks.forEach(function (t) { byId[t.id] = t; });
    ids.forEach(function (id, i) { tasks[positions[i]] = byId[id]; });
    saveToLocalStorage();
  }

  function startDrag(e, li, handle) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    li.classList.add('dragging');
    function move(ev) {
      var y = ev.clientY;
      var sibs = Array.prototype.filter.call(list.children, function (s) { return s !== li; });
      var before = null;
      for (var i = 0; i < sibs.length; i++) {
        var r = sibs[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) { before = sibs[i]; break; }
      }
      if (before) { if (li.nextSibling !== before) list.insertBefore(li, before); }
      else if (list.lastChild !== li) { list.appendChild(li); }
    }
    function up() {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      li.classList.remove('dragging');
      commitOrder();
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function moveBy(id, dir) {
    var vis = tasks.filter(matches);
    var idx = vis.findIndex(function (t) { return t.id === id; });
    var other = vis[idx + dir];
    if (!other) return;
    var a = tasks.findIndex(function (t) { return t.id === id; });
    var b = tasks.findIndex(function (t) { return t.id === other.id; });
    var tmp = tasks[a]; tasks[a] = tasks[b]; tasks[b] = tmp;
    saveToLocalStorage();
    render();
    var item = list.querySelector('[data-id="' + id + '"] .grip');
    if (item) item.focus();
  }

  /* ---------- wiring ---------- */
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('newTitle');
    var v = input.value.trim();
    var hint = $('addHint');
    if (!v) {
      hint.textContent = 'Enter a task name before adding.';
      var f = $('addForm');
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      input.focus();
      return;
    }
    hint.textContent = '';
    addTask(v, $('newCat').value, $('newDue').value);
    input.value = '';
    $('newDue').value = '';
    input.focus();
  });
  $('newTitle').addEventListener('input', function () { $('addHint').textContent = ''; });

  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-filter');
      document.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });
  $('search').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); render(); });
  $('clearDone').addEventListener('click', clearCompleted);

  $('today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  var stored = loadFromLocalStorage();
  tasks = stored === null ? seed() : stored;
  if (stored === null) saveToLocalStorage();
  buildChips();
  render();
})();
