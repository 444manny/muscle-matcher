// Search page
const searchForm = document.getElementById('search-form');
const results = document.getElementById('results');
if (searchForm && results) {
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      muscle: document.getElementById('muscle').value,
      equipment: document.getElementById('equipment').value,
      difficulty: document.getElementById('difficulty').value,
      q: document.getElementById('q').value
    });
    const res = await fetch('/api/exercises?' + params.toString());
    const data = await res.json();
    renderExercises(data);
  });
  document.getElementById('fetch-wger').addEventListener('click', async () => {
    const muscle = document.getElementById('muscle').value || 'Chest';
    const res = await fetch('/api/external/wger?muscle=' + encodeURIComponent(muscle));
    const data = await res.json();
    const mapped = (data.items || []).map((x, i) => ({ id:'ext-'+i, name:x.name, description:x.description, equipment:x.equipment, difficulty:'—', muscle:x.muscles }));
    renderExercises(mapped);
  });
}
function renderExercises(data, opts = {}) {
  results.innerHTML = '';
  const isExternal = !!opts.external;

  const pretty = s => String(s || '').trim()
    .replace(/\s+/g, ' ')
    .replace(/^([a-z])/ , (m, c) => c.toUpperCase()); // sentence-case first letter

  data.forEach((r) => {
    const name = pretty(r.name || 'Exercise');
    const muscles = pretty(r.muscles || '');
    const equipment = pretty(r.equipment || 'Bodyweight');
    const descRaw = (r.description || '').replace(/\s+/g, ' ').trim();
    const desc = descRaw.length > 220 ? descRaw.slice(0, 220) + '…' : descRaw;

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      ${muscles ? `<span class="muted"> · ${escapeHtml(muscles)}</span>` : ''}
      <br>
      <em class="muted">${escapeHtml(equipment)}</em>
      ${desc ? `<br><span>${escapeHtml(desc)}</span>` : ''}
      ${isExternal ? `<br><span class="muted small">source: wger</span>` : ''}
    `;
    results.appendChild(li);
  });

  // show/hide the note under the list
  const note = document.getElementById('ext-note');
  if (note) note.style.display = isExternal ? 'block' : 'none';

  if (!data.length) {
    const li = document.createElement('li');
    li.innerHTML = `<em class="muted">No results found.</em>`;
    results.appendChild(li);
  }
}


// Dashboard
const createForm = document.getElementById('create-workout');
const workoutsList = document.getElementById('workouts');

if (createForm && workoutsList) {
  console.log('[MM] binding create-workout form');
  const byId = (id) => document.getElementById(id);
  const val  = (id, def='') => (byId(id)?.value ?? def);

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const exName = (val('exName').trim());
    const items = exName ? [{
      exercise_name: exName,
      sets: Number(val('exSets', 3)),
      reps: Number(val('exReps', 10)),
      weight: Number(val('exWeight', 0))
    }] : [];

    const payload = { name: val('wname'), notes: val('wnotes'), items };

    const res = await fetch('/api/workouts', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      alert(err.error || `Request failed (${res.status})`);
      return;
    }

    // Clear inputs
    byId('wname').value = '';
    byId('wnotes').value = '';
    if (byId('exName'))   byId('exName').value   = '';
    if (byId('exSets'))   byId('exSets').value   = '3';
    if (byId('exReps'))   byId('exReps').value   = '10';
    if (byId('exWeight')) byId('exWeight').value = '';

    // Reload list from server
    await loadWorkouts();
  });

  async function loadWorkouts() {
    const res = await fetch('/api/workouts');
    if (!res.ok) { console.warn('GET /api/workouts failed', res.status); return; }
    const data = await res.json();
    renderWorkouts(data);
  }

  function renderWorkouts(data){
    workoutsList.innerHTML = '';
    if (!Array.isArray(data) || !data.length) {
      workoutsList.innerHTML = `<li class="muted">No workouts yet.</li>`;
      return;
    }
    data.forEach(w => {
      const when = w.created_at
        ? new Date((w.created_at + '').replace(' ', 'T') + 'Z').toLocaleString()
        : '';
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${escapeHtml(w.name || '')}</strong>
        ${when ? `<span class="muted"> · ${escapeHtml(when)}</span>` : ''}
        <br>
        <em class="muted">${escapeHtml(w.notes || '')}</em>
        <ul class="list" style="margin-top:8px">
          ${(w.items || []).map(it =>
            `<li>${escapeHtml(it.exercise_name || '')} — ${it.sets}x${it.reps}${it.weight ? ' @' + it.weight + 'kg' : ''}</li>`
          ).join('')}
        </ul>
        <button class="button ghost" data-id="${w.id}">Delete</button>
      `;
      workoutsList.appendChild(li);

      li.querySelector('button').addEventListener('click', async () => {
        if (!confirm('Delete this workout?')) return;
        const del = await fetch('/api/workouts/' + w.id, { method: 'DELETE' });
        if (del.ok) loadWorkouts();
      });
    });
  }

  loadWorkouts();
}

function escapeHtml(str){ return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }