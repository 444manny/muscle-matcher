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
function renderExercises(data){
  results.innerHTML='';
  data.forEach(r=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>#${r.id ?? '—'} ${escapeHtml(r.name)}</strong> <span class="muted">· ${escapeHtml(r.muscle||'')}</span><br>
      <em class="muted">${escapeHtml(r.equipment||'')} ${r.difficulty? '· '+escapeHtml(r.difficulty):''}</em><br>
      ${escapeHtml(r.description||'')}`;
    results.appendChild(li);
  });
}

// Dashboard
const createForm = document.getElementById('create-workout');
const workoutsList = document.getElementById('workouts');
if (createForm && workoutsList) {
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = [];
    const exId = document.getElementById('exId').value;
    if (exId) items.push({ exercise_id:Number(exId), sets:Number(document.getElementById('exSets').value), reps:Number(document.getElementById('exReps').value), weight:Number(document.getElementById('exWeight').value||0) });
    const res = await fetch('/api/workouts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: document.getElementById('wname').value, notes: document.getElementById('wnotes').value, items }) });
    if (res.ok) { document.getElementById('wname').value=''; document.getElementById('wnotes').value=''; await loadWorkouts(); } else { alert('Error creating workout'); }
  });
  async function loadWorkouts(){
    const res = await fetch('/api/workouts');
    const data = await res.json();
    workoutsList.innerHTML='';
    data.forEach(w=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(w.name)}</strong> <span class="muted">· ${new Date(w.created_at.replace(' ','T')+'Z').toLocaleString()}</span><br>
      <em class="muted">${escapeHtml(w.notes||'')}</em>
      <ul class="list" style="margin-top:8px">${w.items.map(it=>`<li>${escapeHtml(it.exercise_name)} — ${it.sets}x${it.reps} ${it.weight? '@'+it.weight+'kg':''}</li>`).join('')}</ul>
      <button class="button ghost" data-id="${w.id}">Delete</button>`;
      workoutsList.appendChild(li);
      li.querySelector('button').addEventListener('click', async ()=>{
        if (!confirm('Delete this workout?')) return;
        const del = await fetch('/api/workouts/'+w.id, { method:'DELETE' });
        if (del.ok) loadWorkouts();
      });
    });
  }
  loadWorkouts();
}
function escapeHtml(str){ return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }