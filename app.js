/* Beta Log — standalone training coach app
   Data lives in localStorage only. AI calls go straight to Anthropic's API
   using your own key (stored locally, never written into this file). */

const FOCUS_AREAS = ['Small holds','Bouldery pulling','Overhangs','High feet','Leg tension','Body tension','Hips to wall'];
const WALL_ANGLES = ['Overhang','Vertical','Slab','Roof'];
const HOLD_TYPES = ['Crimps','Slopers','Pockets','Pinches','Jugs'];
const FEELING_SCALE = [{v:1,l:'Flat'},{v:2,l:'Off'},{v:3,l:'Steady'},{v:4,l:'Strong'},{v:5,l:'Dialed'}];
const INTENSITY_OPTIONS = ['Easy','Moderate','Hard','Max effort'];
const SESSION_TYPE_OPTIONS = ['Climbing','Antagonist / Stabilizer','Mobility / Stretch','Strength'];
const PAIN_OPTIONS = ['None','Mild, manageable','Recurring issue','Something new'];
const DAY_TYPES = ['Indoor','Outdoor','Bouldering','Sport/Rope','Project','Power','Power-Endurance','Skills/Technique','Fun/Social'];
const FAILURE_POINT_OPTIONS = ["Grip/forearms gave out","Footwork broke down","Lost the sequence","Couldn't commit to the move","Got pumped","Couldn't reach the hold","Feet cut loose","Mental — backed off"];

// Original 24-item self-assessment (not Horst's wording — see chat).
// Category cycles every 3 items: mental, technique, physical — matching the pattern requested.
const QUESTIONS = [
  {t:"I feel anxious or tight heading into the crux of a climb.", cat:'mental'},
  {t:"My footwork gets sloppy right when a climb gets hard.", cat:'technique'},
  {t:"My forearms pump out even on climbs that are easy for me.", cat:'physical'},
  {t:"I talk myself out of trying a move before I've actually attempted it.", cat:'mental'},
  {t:"I have trouble committing my weight onto a small foothold at a crux.", cat:'technique'},
  {t:"I struggle to hold onto small or marginal holds I need to use.", cat:'physical'},
  {t:"I blow sequences on routes I've climbed cleanly before.", cat:'mental'},
  {t:"I stall at the start of a hard section and end up resting before trying again.", cat:'technique'},
  {t:"My upper arms fatigue before my forearms do.", cat:'physical'},
  {t:"I get distracted by what's happening around me (belayer, onlookers) while climbing.", cat:'mental'},
  {t:"I overlook holds that are there, just not obvious at first glance.", cat:'technique'},
  {t:'I get "sewing machine leg" (uncontrollable leg shake).', cat:'physical'},
  {t:"I struggle to picture myself completing a route before I leave the ground.", cat:'mental'},
  {t:"I can't quite reach a hold that should be within range.", cat:'technique'},
  {t:"I pump out on steep terrain no matter how big the holds are.", cat:'physical'},
  {t:"I grab gear, clip a draw, or take rather than risk falling on a move I'm unsure of.", cat:'mental'},
  {t:"My feet swing loose and cut off unexpectedly on steep terrain.", cat:'technique'},
  {t:"I get noticeably out of breath while climbing.", cat:'physical'},
  {t:"I climb more cautiously or hold back when people are watching.", cat:'mental'},
  {t:"I lose track of the sequence mid-climb, even after reading it from the ground.", cat:'technique'},
  {t:"My hands slip off sloping, pocketed, or pinched holds.", cat:'physical'},
  {t:"On a safe, well-protected route, I still hold back from giving it my full effort.", cat:'mental'},
  {t:"I misjudge which foothold to use and have to readjust mid-move.", cat:'technique'},
  {t:"I'm still noticeably sore the day after a climbing session.", cat:'physical'},
];
const SCALE_LABELS = ['Almost always','Often','About half','Occasionally','Seldom','Never'];

const PHASE_GUIDANCE = {
  'Skill & Stamina': "High-volume, mostly submaximal climbing to build technique, movement skill, and aerobic capacity. Keep most climbing well below max difficulty — avoid grinding on near-limit problems this phase. Roughly: 10-20 min warmup+mobility, 60-120+ min of varied submaximal climbing (build toward high vertical footage, only light-moderate pump), light strength/core work, cooldown.",
  'Max Strength & Power': "Lower-volume, high-intensity: near-limit bouldering and short, powerful efforts. Roughly: 15-25 min warmup+mobility, 30-60 min near-limit/hypergravity bouldering, 20-30 min finger-strength work (hangboard), 10-20 min pull-power work, 15-25 min core, 10-40 min antagonist/stabilizer + posterior chain (fine as a separate day), cooldown.",
  'Power-Endurance': "Moderate-high intensity with short rest, building the ability to climb pumped without falling apart. Roughly: 20-30 min progressive warmup, 30-60 min interval-style climbing (e.g. 4x4s or a similar sustained/pumpy protocol), 15-20 min finger strength-endurance, 10-20 min pull-muscle endurance, 15-25 min core, 20-40 min antagonist/posterior chain (fine as a separate day), cooldown.",
  'Taper': "Sharp drop in volume so the previous weeks' adaptations show up. Short sessions (20-40 min), one or two brief high-intensity touches early in the week, full rest days by the end. No new fatigue.",
};

const LS = {
  settings: 't4c_settings',
  entries: 't4c_entries',
  assessments: 't4c_assessments',
};

const App = {
  settings: { apiKey:'', cycleType:'3-2-1', cycleStartDate: todayISO(), gradeIndoor:'', gradeOutdoor:'' },
  entries: [],
  assessments: [],
  ui: { tab:'today', logDraft: freshLogDraft(), climbsDraft: [], climbLocationDraft:'Indoor', askDraft: freshAskDraft(),
        qDraft: {}, qOpen:false, expandedEntry:null, planLoading:false, planError:'', planText:'' },

  load() {
    try { const s = localStorage.getItem(LS.settings); if (s) this.settings = Object.assign(this.settings, JSON.parse(s)); } catch(e){}
    try { const e = localStorage.getItem(LS.entries); if (e) this.entries = JSON.parse(e); } catch(e){}
    try { const a = localStorage.getItem(LS.assessments); if (a) this.assessments = JSON.parse(a); } catch(e){}
    // schema migration: old single "grade" field -> gradeIndoor
    if (this.settings.grade && !this.settings.gradeIndoor) {
      this.settings.gradeIndoor = this.settings.grade;
      delete this.settings.grade;
      this.saveSettings();
    }
  },
  saveSettings() { localStorage.setItem(LS.settings, JSON.stringify(this.settings)); },
  saveEntries() { localStorage.setItem(LS.entries, JSON.stringify(this.entries)); },
  saveAssessments() { localStorage.setItem(LS.assessments, JSON.stringify(this.assessments)); },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
  },

  setTab(tab) { this.ui.tab = tab; this.render(); },
};

function todayISO(){ return new Date().toISOString().slice(0,10); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function freshLogDraft(){
  return { date: todayISO(), type:'Climbing', duration:60, feeling:3, intensity:'Moderate',
    dayTypes:[], dayTypesOther:'', focus:[], wallAngle:[], holdTypes:[], timeClimb:45, timeStrength:0, timeAntag:0, timeCore:0, timeMobility:0,
    failurePoints:[], failurePointsOther:'', pain:'None', notes:'' };
}
function freshAskDraft(){
  return { minutes:60, feeling:3, location:'Indoor', sessionTypes:['Climbing'], focusMode:'weak', focusPick:'', focusOther:'', focusSecondary:'' };
}

// ---- Cycle phase calculation ----
function getCyclePhases(cycleType){
  return cycleType === '4-3-2-1'
    ? [{name:'Skill & Stamina', weeks:4},{name:'Max Strength & Power', weeks:3},{name:'Power-Endurance', weeks:2},{name:'Taper', weeks:1}]
    : [{name:'Max Strength & Power', weeks:3},{name:'Power-Endurance', weeks:2},{name:'Taper', weeks:1}];
}
function getCycleState(settings){
  const phases = getCyclePhases(settings.cycleType);
  const totalWeeks = phases.reduce((s,p)=>s+p.weeks,0);
  const start = new Date(settings.cycleStartDate + 'T00:00:00');
  const today = new Date(todayISO() + 'T00:00:00');
  let daysSince = Math.round((today - start) / 86400000);
  if (daysSince < 0) daysSince = 0;
  const weekNum = Math.floor(daysSince / 7);
  const weekInCycle = weekNum % totalWeeks;
  const cycleNumber = Math.floor(weekNum / totalWeeks) + 1;
  let acc = 0;
  for (const p of phases) {
    if (weekInCycle < acc + p.weeks) {
      return { phaseName: p.name, weekOfPhase: weekInCycle - acc + 1, phaseLengthWeeks: p.weeks,
        cycleNumber, weekOfCycle: weekInCycle + 1, totalWeeksInCycle: totalWeeks };
    }
    acc += p.weeks;
  }
  return { phaseName: phases[0].name, weekOfPhase:1, phaseLengthWeeks: phases[0].weeks, cycleNumber, weekOfCycle:1, totalWeeksInCycle: totalWeeks };
}

// Manually pin the current phase/week (e.g. "I just finished 3 weeks, doing a taper/project week now",
// or "jump into week 2 of this phase"). Works by re-deriving cycleStartDate so today lands exactly on the
// requested week — normal date math then carries forward correctly from here.
function setPhaseManually(phaseName, weekOfPhase){
  const phases = getCyclePhases(App.settings.cycleType);
  const phase = phases.find(p => p.name === phaseName);
  if (!phase) return;
  weekOfPhase = Math.max(1, Math.min(phase.weeks, Number(weekOfPhase) || 1));
  let acc = 0;
  for (const p of phases) { if (p.name === phaseName) break; acc += p.weeks; }
  const weekInCycle = acc + (weekOfPhase - 1);
  const daysBack = weekInCycle * 7;
  const newStart = new Date(todayISO() + 'T00:00:00');
  newStart.setDate(newStart.getDate() - daysBack);
  App.settings.cycleStartDate = newStart.toISOString().slice(0,10);
  App.saveSettings();
  App.toast('Set to ' + phaseName + ', week ' + weekOfPhase);
  App.setTab('today');
}
function applyPhaseOverride(){
  const phaseName = document.getElementById('overridePhase').value;
  const week = document.getElementById('overrideWeek').value;
  setPhaseManually(phaseName, week);
}

// ---- Pattern detection (simple, transparent heuristics) ----
function detectPatterns(entries){
  const flags = [];
  const sorted = [...entries].sort((a,b)=> b.date.localeCompare(a.date));
  const last10 = sorted.slice(0,10);
  const last4Climbing = sorted.filter(e=>e.type==='Climbing').slice(0,4);

  const antagMinutes10 = last10.reduce((s,e)=> s + (Number(e.timeAntag)||0), 0);
  if (last10.length >= 6 && antagMinutes10 === 0) {
    flags.push("Antagonist/stabilizer work hasn't shown up in your last " + last10.length + " sessions. That's the piece most likely to quietly turn into shoulder or elbow trouble if it keeps getting skipped.");
  }

  if (last4Climbing.length === 4 && last4Climbing.every(e => e.intensity === 'Max effort' || e.intensity === 'Hard')) {
    flags.push("Your last 4 climbing sessions were all Hard/Max effort. Worth a lighter, skill- or mobility-focused day before stacking a 5th.");
  }

  const lastMobility = sorted.find(e => e.type === 'Mobility / Stretch' || Number(e.timeMobility) > 0);
  if (lastMobility) {
    const days = Math.round((new Date(todayISO()) - new Date(lastMobility.date)) / 86400000);
    if (days >= 10) flags.push("It's been " + days + " days since any mobility/stretch work showed up in the log.");
  } else if (sorted.length >= 6) {
    flags.push("No mobility/stretch work logged yet — worth adding on a non-climbing day.");
  }

  return flags;
}

// Weak-point profile: lowest-scoring category from the most recent assessment,
// blended with which FOCUS_AREAS have gotten the least attention in the log.
function getWeakPointProfile(){
  const latest = App.assessments[App.assessments.length - 1];
  let categoryRank = null;
  if (latest) {
    categoryRank = Object.entries(latest.scores).sort((a,b)=> a[1]-b[1]);
  }
  const counts = {};
  FOCUS_AREAS.forEach(a => counts[a] = 0);
  App.entries.forEach(e => (e.focus||[]).forEach(a => { counts[a] = (counts[a]||0) + 1; }));
  const leastWorked = Object.entries(counts).sort((a,b)=> a[1]-b[1]).slice(0,3).map(x=>x[0]);
  return { categoryRank, leastWorked };
}

function climbingSessionsSinceLastAssessment(){
  const last = App.assessments[App.assessments.length - 1];
  const cutoff = last ? last.date : '0000-00-00';
  return App.entries.filter(e => e.type === 'Climbing' && e.date > cutoff).length;
}

function getMostRecentPainStatus(entries){
  const sorted = [...entries].sort((a,b)=> b.date.localeCompare(a.date));
  const withPain = sorted.find(e => e.pain);
  return withPain ? withPain.pain : 'None logged yet';
}

// ---- Claude API call ----
async function askClaude(){
  const key = (App.settings.apiKey||'').trim();
  if (!key) { App.ui.planError = 'Add your Anthropic API key in Settings first.'; App.render(); return; }
  App.ui.planLoading = true; App.ui.planError=''; App.ui.planText=''; App.render();

  const cycle = getCycleState(App.settings);
  const guidance = PHASE_GUIDANCE[cycle.phaseName];
  const flags = detectPatterns(App.entries);
  const weak = getWeakPointProfile();
  const d = App.ui.askDraft;

  const recent = [...App.entries].sort((a,b)=> b.date.localeCompare(a.date)).slice(0,14).reverse().map(e => {
    const failureStr = [].concat(e.failurePoints||[], e.failurePointsOther||[]).filter(Boolean).join(', ');
    const dayTypeStr = [].concat(e.dayTypes||[], e.dayTypesOther||[]).filter(Boolean).join('/');
    const t = e.type==='Climbing' ? `${e.duration}min, ${e.intensity}, day type: ${dayTypeStr||'unspecified'}, feeling ${e.feeling}/5, focus: ${(e.focus||[]).join(', ')||'none'}${failureStr?', broke down on: '+failureStr:''}${e.pain && e.pain!=='None' ? ', PAIN: '+e.pain : ''}`
      : `${e.type}${e.notes ? ' - '+e.notes : ''}`;
    return `${e.date}: ${t}`;
  }).join('\n') || 'No prior entries yet.';

  const mostRecentPain = getMostRecentPainStatus(App.entries);

  let focusLine = '';
  if (d.focusMode === 'other' && d.focusOther.trim()) {
    focusLine = d.focusOther.trim();
  } else if (d.focusMode === 'weak' && weak.categoryRank) {
    focusLine = `Weakest category from self-assessment: ${weak.categoryRank[0][0]} (avg ${weak.categoryRank[0][1].toFixed(1)}/5). Least-worked focus areas in the log: ${weak.leastWorked.join(', ')}.`;
  } else if (d.focusPick) {
    focusLine = d.focusPick;
  } else {
    focusLine = "Coach's choice based on the log and patterns below.";
  }
  if (d.focusSecondary) focusLine += ` Secondary focus: ${d.focusSecondary}.`;

  const sys = "You are an experienced rock climbing training coach, working with an intermediate climber. " +
    "You're given their training cycle phase, a phase-structure guideline, their recent session log, detected " +
    "training patterns, and today's context. Give a single, specific, concrete plan for today's session, sized to " +
    "the exact time budget given. Use short list format with rough durations/sets/reps, no fluff, no disclaimers. " +
    "Follow the phase guideline loosely, not rigidly. Design climbing portions around 4-8 move problems or route " +
    "laps with real rest between attempts — never a single move drilled to exhaustion, and never just 20 minutes " +
    "projecting one hard climb. On non-climbing days, build a real mobility/general-movement session, not just a " +
    "stretch list. If a pattern flag below is relevant, address it directly in the plan (e.g. slot in antagonist " +
    "work if it's been skipped) and say briefly why. The 'Current pain status' line is the authoritative, most " +
    "recent state — if it says None, do not dwell on older pain mentions elsewhere in the log; if it says anything " +
    "else, do not prescribe exercise for the affected area, recommend rest and seeing a doctor or physical " +
    "therapist instead, and only plan around unaffected areas if that still makes sense.";

  const user = `Cycle: ${App.settings.cycleType}, currently in "${cycle.phaseName}" (week ${cycle.weekOfPhase} of ${cycle.phaseLengthWeeks}, cycle #${cycle.cycleNumber}).\n` +
    `Phase guideline: ${guidance}\n` +
    `Indoor grade: ${App.settings.gradeIndoor || 'not set'} · Outdoor grade: ${App.settings.gradeOutdoor || 'not set'}\n` +
    `Current pain status (most recent entry): ${mostRecentPain}\n\n` +
    `Detected patterns: ${flags.length ? flags.join(' | ') : 'none flagged'}\n\n` +
    `Recent log (most recent last):\n${recent}\n\n` +
    `Today:\n- Minutes available: ${d.minutes}\n- Feeling: ${FEELING_SCALE.find(f=>f.v===d.feeling).l} (${d.feeling}/5)\n` +
    `- Location: ${d.location}\n- Session type(s) wanted: ${d.sessionTypes.join(', ') || 'no preference'}\n- Priority focus: ${focusLine}\n\n` +
    `Give today's plan.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01',
                 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1200, system: sys, messages:[{role:'user', content:user}] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    const text = (data.content||[]).map(b=>b.text||'').join('\n').trim();
    App.ui.planText = text || 'No response came back — try again.';
  } catch(e) {
    App.ui.planError = 'Could not reach Claude: ' + e.message;
  } finally {
    App.ui.planLoading = false; App.render();
  }
}

// ---- Rendering ----
function pillsHTML(options, selected, onClick, opts){
  opts = opts || {};
  const cls = opts.sm ? 'pill sm' : 'pill';
  const altClass = opts.alt ? ' alt' : '';
  return `<div class="pillrow">${options.map(o => {
    const isActive = Array.isArray(selected) ? selected.includes(o) : selected === o;
    return `<button type="button" class="${cls}${isActive ? ' active'+altClass : ''}" onclick="${onClick}('${escAttr(o)}')">${o}</button>`;
  }).join('')}</div>`;
}
function escAttr(s){ return String(s).replace(/'/g, "\\'"); }
function escHtml(s){ return String(s==null?'':s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

App.render = function(){
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === App.ui.tab));
  const panel = document.getElementById('panels');
  if (App.ui.qOpen) { panel.innerHTML = renderQuestionnaire(); return; }
  if (App.ui.tab === 'today') panel.innerHTML = renderToday();
  else if (App.ui.tab === 'log') panel.innerHTML = renderLog();
  else if (App.ui.tab === 'history') panel.innerHTML = renderHistory();
  else panel.innerHTML = renderSettings();
};

function renderToday(){
  if (!App.settings.cycleStartDate) {
    return `<div class="card"><h2>Set up your cycle first</h2><p class="small muted">Head to Settings to pick your cycle type and start date.</p>
      <button class="btn btn-primary" onclick="App.setTab('settings')">Go to Settings</button></div>`;
  }
  const cycle = getCycleState(App.settings);
  const flags = detectPatterns(App.entries);
  const dueCount = climbingSessionsSinceLastAssessment();
  const d = App.ui.askDraft;
  const weak = getWeakPointProfile();

  let banners = '';
  const painStatus = getMostRecentPainStatus(App.entries);
  if (painStatus && painStatus !== 'None' && painStatus !== 'None logged yet') {
    banners += `<div class="banner warn"><b>Pain still flagged:</b> ${escHtml(painStatus)} — from your most recent entry. This stays up (and gets sent with every plan request) until you log a new entry with Pain = None.</div>`;
  }
  if (dueCount >= 24) {
    banners += `<div class="banner info"><b>Weak-point check-in due.</b> You've logged ${dueCount} climbing sessions since your last one.
      <div style="margin-top:8px;"><button class="btn btn-secondary" onclick="openQuestionnaire()">Take the check-in (2 min)</button></div></div>`;
  }
  flags.forEach(f => { banners += `<div class="banner warn">${escHtml(f)}</div>`; });

  const weakOptionLabel = weak.categoryRank ? `Weakest area: ${weak.categoryRank[0][0]}` : null;

  return `
  <div class="card">
    <div class="phase-banner">
      <div><div class="phase-name">${escHtml(cycle.phaseName)}</div>
        <div class="small muted">Week ${cycle.weekOfPhase} of ${cycle.phaseLengthWeeks} &middot; ${App.settings.cycleType} cycle #${cycle.cycleNumber}</div></div>
    </div>
  </div>
  ${banners}
  <div class="card">
    <h2>Ask for today's plan</h2>
    <div class="field"><label>Minutes available</label>
      <input type="number" min="5" max="240" value="${d.minutes}" oninput="App.ui.askDraft.minutes=this.value">
    </div>
    <div class="field"><label>How you're feeling</label>
      ${pillsHTML(FEELING_SCALE.map(f=>f.l), FEELING_SCALE.find(f=>f.v===d.feeling).l, 'setAskFeeling')}
    </div>
    <div class="field"><label>Where</label>
      ${pillsHTML(['Indoor','Outdoor'], d.location, 'setAskLocation', {sm:true})}
    </div>
    <div class="field"><label>Session type(s) wanted</label>
      ${pillsHTML(SESSION_TYPE_OPTIONS, d.sessionTypes, 'toggleAskType')}
    </div>
    <div class="field"><label>Priority focus</label>
      ${pillsHTML(['Auto (weak points)', 'Pick a focus area', 'Describe something else'],
        d.focusMode==='weak' ? 'Auto (weak points)' : d.focusMode==='pick' ? 'Pick a focus area' : 'Describe something else',
        'setFocusMode', {sm:true})}
      ${d.focusMode==='weak' && weakOptionLabel ? `<p class="small muted" style="margin-top:6px;">${escHtml(weakOptionLabel)}</p>` : ''}
      ${d.focusMode==='pick' ? `<div style="margin-top:8px;">${pillsHTML(FOCUS_AREAS, d.focusPick, 'setFocusPick', {sm:true})}</div>` : ''}
      ${d.focusMode==='other' ? `<textarea style="margin-top:8px;" placeholder="e.g. I struggle with laying back then getting my leg high and rocking over..." oninput="App.ui.askDraft.focusOther=this.value">${escHtml(d.focusOther)}</textarea>` : ''}
    </div>
    <div class="field"><label>Secondary focus (optional)</label>
      ${pillsHTML(FOCUS_AREAS, d.focusSecondary, 'setFocusSecondary', {sm:true})}
    </div>
    <button class="btn btn-primary" onclick="askClaude()" ${App.ui.planLoading?'disabled':''}>${App.ui.planLoading ? 'Thinking…' : "Get today's plan"}</button>
    ${App.ui.planError ? `<p class="small" style="color:var(--red);margin-top:8px;">${escHtml(App.ui.planError)}</p>` : ''}
    ${App.ui.planText ? `<div class="plan-box">${escHtml(App.ui.planText)}</div>` : ''}
  </div>`;
}

function renderLog(){
  const d = App.ui.logDraft;
  const isClimbing = d.type === 'Climbing';
  return `
  <div class="card">
    <h2>Log a session</h2>
    <div class="row2">
      <div class="field"><label>Date</label><input type="date" value="${d.date}" oninput="App.ui.logDraft.date=this.value"></div>
      <div class="field"><label>Type</label>
        <select onchange="App.ui.logDraft.type=this.value; App.render();">
          ${SESSION_TYPE_OPTIONS.concat(['Rest']).map(t=>`<option value="${t}" ${d.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field"><label>Duration (minutes)</label>
      <input type="number" min="0" max="300" value="${d.duration}" oninput="App.ui.logDraft.duration=this.value">
    </div>
    <div class="field"><label>Feeling</label>${pillsHTML(FEELING_SCALE.map(f=>f.l), FEELING_SCALE.find(f=>f.v===d.feeling).l, 'setLogFeeling')}</div>
    ${isClimbing ? `
    <div class="field"><label>Intensity</label>${pillsHTML(INTENSITY_OPTIONS, d.intensity, 'setLogIntensity', {sm:true})}</div>
    <div class="field"><label>Day type</label>${pillsHTML(DAY_TYPES, d.dayTypes, 'toggleLogDayType', {sm:true})}</div>
    <div class="field"><label>Climbs done</label>
      <div class="small muted" style="margin-bottom:6px;">Location for climbs you add below:</div>
      ${pillsHTML(['Indoor','Outdoor'], App.ui.climbLocationDraft, 'setClimbLocation', {sm:true})}
      <div class="row3" style="margin-top:8px;">
        <input type="text" id="climbGrade" placeholder="grade e.g. 5.10c or V4">
        <input type="number" id="climbCount" placeholder="count" min="1" value="1">
        <button class="btn btn-ghost" style="padding:10px 14px;" onclick="addClimbRow()">+ add</button>
      </div>
      <div class="chip-list">${App.ui.climbsDraft.map((c,i)=>`<span class="pill sm active">${escHtml(c.grade)} &times;${escHtml(c.count)} <span class="small">(${c.location})</span>
        <span onclick="removeClimbRow(${i})" style="cursor:pointer;margin-left:4px;">✕</span></span>`).join('')}</div>
    </div>
    <div class="field"><label>Focus areas worked</label>${pillsHTML(FOCUS_AREAS, d.focus, 'toggleLogFocus', {sm:true})}</div>
    <div class="field"><label>Wall angle</label>${pillsHTML(WALL_ANGLES, d.wallAngle, 'toggleLogWall', {sm:true})}</div>
    <div class="field"><label>Hold types</label>${pillsHTML(HOLD_TYPES, d.holdTypes, 'toggleLogHold', {sm:true})}</div>
    <h3>Time spent (minutes)</h3>
    <div class="row2">
      <div class="field"><label>Climbing</label><input type="number" min="0" value="${d.timeClimb}" oninput="App.ui.logDraft.timeClimb=this.value"></div>
      <div class="field"><label>Strength</label><input type="number" min="0" value="${d.timeStrength}" oninput="App.ui.logDraft.timeStrength=this.value"></div>
      <div class="field"><label>Antagonist/stabilizer</label><input type="number" min="0" value="${d.timeAntag}" oninput="App.ui.logDraft.timeAntag=this.value"></div>
      <div class="field"><label>Core</label><input type="number" min="0" value="${d.timeCore}" oninput="App.ui.logDraft.timeCore=this.value"></div>
      <div class="field"><label>Mobility</label><input type="number" min="0" value="${d.timeMobility}" oninput="App.ui.logDraft.timeMobility=this.value"></div>
    </div>
    <div class="field"><label>What broke down</label>
      ${pillsHTML(FAILURE_POINT_OPTIONS, d.failurePoints, 'toggleLogFailurePoint', {sm:true})}
      <textarea style="margin-top:8px;" placeholder="Any detail worth adding..." oninput="App.ui.logDraft.failurePointsOther=this.value">${escHtml(d.failurePointsOther)}</textarea>
    </div>
    ` : ''}
    <div class="field"><label>Pain or discomfort</label>${pillsHTML(PAIN_OPTIONS, d.pain, 'setLogPain', {sm:true})}</div>
    <div class="field"><label>Notes</label>
      <textarea placeholder="Anything else worth remembering..." oninput="App.ui.logDraft.notes=this.value">${escHtml(d.notes)}</textarea>
    </div>
    <button class="btn btn-primary" onclick="submitLog()">Save entry</button>
  </div>`;
}

function renderHistory(){
  const entries = [...App.entries].sort((a,b)=> b.date.localeCompare(a.date));
  if (entries.length === 0) {
    return `<div class="card"><p class="muted small">No entries yet. Log a session on the Log tab to start stacking your history.</p></div>`;
  }
  const climbingCount = entries.filter(e=>e.type==='Climbing').length;
  const sinceAssessment = climbingSessionsSinceLastAssessment();

  // last 12 weeks heatmap
  const map = {}; entries.forEach(e => { map[e.date] = e; });
  const days = [];
  const today = new Date(todayISO()+'T00:00:00');
  for (let i=83;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); const iso=d.toISOString().slice(0,10); days.push({date:iso, e:map[iso]||null}); }
  const weeks = []; for (let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7));
  const maxDur = Math.max(1, ...entries.map(e=>Number(e.duration)||0));
  const heat = weeks.map(w => `<div class="heatcol">${w.map(day=>{
    const inten = day.e ? Math.max(.18, (Number(day.e.duration)||0)/maxDur) : 0;
    return `<div class="heatcell" title="${day.date}${day.e?' — '+day.e.duration+'min':''}" style="background:${day.e?`rgba(204,155,60,${inten})`:'var(--surface2)'}"></div>`;
  }).join('')}</div>`).join('');

  // minutes last 14 days
  const last14 = [...entries].slice(0,14).reverse();
  const maxMin14 = Math.max(1, ...last14.map(e=>Number(e.duration)||0));
  const minBars = last14.map(e => `<div class="bar-row"><div class="bar-label">${e.date.slice(5)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(Number(e.duration)||0)/maxMin14*100}%"></div></div>
    <div class="bar-val">${e.duration}</div></div>`).join('');

  // focus area frequency
  const counts = {}; FOCUS_AREAS.forEach(a=>counts[a]=0);
  entries.forEach(e => (e.focus||[]).forEach(a=>{counts[a]=(counts[a]||0)+1;}));
  const maxCount = Math.max(1, ...Object.values(counts));
  const focusBars = FOCUS_AREAS.map(a => `<div class="bar-row"><div class="bar-label">${a}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${counts[a]/maxCount*100}%"></div></div>
    <div class="bar-val">${counts[a]}</div></div>`).join('');

  // day type frequency
  const dtCounts = {}; DAY_TYPES.forEach(a=>dtCounts[a]=0);
  entries.forEach(e => (e.dayTypes||[]).forEach(a=>{dtCounts[a]=(dtCounts[a]||0)+1;}));
  const maxDt = Math.max(1, ...Object.values(dtCounts));
  const dtBars = DAY_TYPES.map(a => `<div class="bar-row"><div class="bar-label">${a}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${dtCounts[a]/maxDt*100}%"></div></div>
    <div class="bar-val">${dtCounts[a]}</div></div>`).join('');

  const entryRows = entries.map(e => `
    <div class="entry">
      <button class="entry-head" onclick="toggleEntry('${e.id}')">
        <span><b>${e.date}</b> &nbsp;<span class="muted">${e.type}${e.type==='Climbing' ? ' · '+e.duration+'min · '+FEELING_SCALE.find(f=>f.v==e.feeling).l : ''}</span></span>
        <span>${App.ui.expandedEntry===e.id?'▲':'▼'}</span>
      </button>
      ${App.ui.expandedEntry===e.id ? `<div class="entry-body">
        ${e.intensity?`<p><b>Intensity:</b> ${e.intensity}</p>`:''}
        ${(e.dayTypes&&e.dayTypes.length)?`<p><b>Day type:</b> ${e.dayTypes.join(', ')}</p>`:''}
        ${(e.climbs&&e.climbs.length)?`<p><b>Climbs:</b> ${e.climbs.map(c=>c.grade+' ×'+c.count+(c.location?' ('+c.location+')':'')).join(', ')}</p>`:''}
        ${(e.focus&&e.focus.length)?`<p><b>Focus:</b> ${e.focus.join(', ')}</p>`:''}
        ${(e.wallAngle&&e.wallAngle.length)?`<p><b>Wall angle:</b> ${e.wallAngle.join(', ')}</p>`:''}
        ${(e.holdTypes&&e.holdTypes.length)?`<p><b>Holds:</b> ${e.holdTypes.join(', ')}</p>`:''}
        ${(e.failurePoints&&e.failurePoints.length)?`<p><b>Broke down on:</b> ${e.failurePoints.join(', ')}</p>`:''}
        ${e.failurePointsOther?`<p><b>Detail:</b> ${escHtml(e.failurePointsOther)}</p>`:''}
        ${e.pain&&e.pain!=='None'?`<p style="color:var(--red)"><b>Pain:</b> ${e.pain}</p>`:''}
        ${e.notes?`<p><b>Notes:</b> ${escHtml(e.notes)}</p>`:''}
      </div>` : ''}
    </div>`).join('');

  const assessRows = App.assessments.slice().reverse().map(a => {
    const ranked = Object.entries(a.scores).sort((x,y)=>x[1]-y[1]);
    return `<div class="entry"><div class="entry-body"><p><b>${a.date}</b> &middot; indoor: ${a.gradeIndoor||'—'} &middot; outdoor: ${a.gradeOutdoor||'—'}</p>
      <p class="small muted">Weakest: ${ranked[0][0]} (${ranked[0][1].toFixed(1)}) &middot; Strongest: ${ranked[2][0]} (${ranked[2][1].toFixed(1)})</p></div></div>`;
  }).join('') || '<p class="small muted">No check-ins taken yet.</p>';

  return `
  <div class="card"><h2>Overview</h2>
    <div class="statgrid">
      <div class="stat"><div class="num">${entries.length}</div><div class="lbl">Total entries</div></div>
      <div class="stat"><div class="num">${climbingCount}</div><div class="lbl">Climbing sessions</div></div>
      <div class="stat"><div class="num">${sinceAssessment}</div><div class="lbl">Since check-in</div></div>
    </div>
  </div>
  <div class="card"><h2>Last 12 weeks</h2><div class="heatgrid">${heat}</div></div>
  <div class="card"><h2>Minutes, last 14 entries</h2><div class="barlist">${minBars}</div></div>
  <div class="card"><h2>Focus area attention</h2><div class="barlist">${focusBars}</div></div>
  <div class="card"><h2>Day types, over time</h2><div class="barlist">${dtBars}</div></div>
  <div class="card"><h2>Weak-point check-ins</h2>${assessRows}</div>
  <div class="card"><h2>Entries</h2>${entryRows}</div>`;
}

function renderSettings(){
  const s = App.settings;
  return `
  <div class="card">
    <h2>Cycle</h2>
    <div class="field"><label>Framework</label>
      ${pillsHTML(['3-2-1','4-3-2-1'], s.cycleType, 'setCycleType')}
    </div>
    <div class="field"><label>Cycle start date</label>
      <input type="date" value="${s.cycleStartDate}" oninput="App.settings.cycleStartDate=this.value">
    </div>
    <div class="row2">
      <div class="field"><label>Indoor grade</label>
        <input type="text" placeholder="e.g. 5.10c" value="${escHtml(s.gradeIndoor)}" oninput="App.settings.gradeIndoor=this.value">
      </div>
      <div class="field"><label>Outdoor grade</label>
        <input type="text" placeholder="e.g. 5.10a" value="${escHtml(s.gradeOutdoor)}" oninput="App.settings.gradeOutdoor=this.value">
      </div>
    </div>
    <button class="btn btn-secondary" onclick="openQuestionnaire()">Take weak-point check-in now</button>
  </div>
  <div class="card">
    <h2>Jump to a phase/week</h2>
    <p class="small muted">For an unplanned taper/project week, a missed week, or jumping partway into any phase — this resets the cycle math so today lands exactly where you say.</p>
    <div class="row2">
      <div class="field"><label>Phase</label>
        <select id="overridePhase">${getCyclePhases(s.cycleType).map(p=>`<option value="${escAttr(p.name)}">${p.name} (${p.weeks}wk)</option>`).join('')}</select>
      </div>
      <div class="field"><label>Week of that phase</label>
        <input type="number" id="overrideWeek" min="1" max="4" value="1">
      </div>
    </div>
    <button class="btn btn-ghost" onclick="applyPhaseOverride()">Set as current</button>
  </div>
  <div class="card">
    <h2>Export / import your data</h2>
    <p class="small muted">Export downloads a JSON file of your entries and check-ins (API key excluded). Import reads one back in and merges it with what's already here — nothing gets overwritten, so it's safe to import an old backup after switching phones.</p>
    <button class="btn btn-ghost" onclick="exportData()">Export data (.json)</button>
    <input type="file" id="importFile" accept="application/json" style="margin-top:8px;" onchange="importData(this.files[0])">
  </div>
  <div class="card">
    <h2>Anthropic API key</h2>
    <p class="small muted">Stored only in this browser's local storage. Never written into this app's code, never sent anywhere but Anthropic's API.</p>
    <div class="field"><input type="password" placeholder="sk-ant-..." value="${escHtml(s.apiKey)}" oninput="App.settings.apiKey=this.value"></div>
  </div>
  <button class="btn btn-primary" onclick="saveSettingsForm()">Save settings</button>`;
}

function renderQuestionnaire(){
  const answered = Object.keys(App.ui.qDraft).length;
  const items = QUESTIONS.map((q,i) => `
    <div class="q-item">
      <div class="q-text">${i+1}. ${q.t}</div>
      <div class="scale-row">${[0,1,2,3,4,5].map(v => `<button type="button" class="scale-btn ${App.ui.qDraft[i]===v?'active':''}" onclick="setQAnswer(${i},${v})">${v}</button>`).join('')}</div>
      <div class="scale-caption"><span>Almost always</span><span>Never</span></div>
    </div>`).join('');
  return `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2>Weak-point check-in</h2>
      <button class="close-x" onclick="closeQuestionnaire()">&times;</button>
    </div>
    <p class="small muted">0 = almost always happens, 5 = never happens. Answer honestly, not aspirationally. ${answered}/${QUESTIONS.length} answered.</p>
    ${items}
    <button class="btn btn-primary" onclick="submitAssessment()" ${answered<QUESTIONS.length?'disabled':''}>Submit (${answered}/${QUESTIONS.length})</button>
  </div>`;
}

// ---- Event handlers (called from inline onclick in templates) ----
function setAskFeeling(label){ App.ui.askDraft.feeling = FEELING_SCALE.find(f=>f.l===label).v; App.render(); }
function setAskLocation(loc){ App.ui.askDraft.location = loc; App.render(); }
function toggleAskType(t){ const arr = App.ui.askDraft.sessionTypes; const i = arr.indexOf(t);
  if (i>-1) arr.splice(i,1); else arr.push(t); App.render(); }
function setFocusMode(label){
  App.ui.askDraft.focusMode = label.indexOf('weak')>-1 ? 'weak' : label.indexOf('Pick')>-1 ? 'pick' : 'other';
  App.render();
}
function setFocusPick(area){ App.ui.askDraft.focusPick = area; App.render(); }
function setFocusSecondary(area){
  App.ui.askDraft.focusSecondary = App.ui.askDraft.focusSecondary === area ? '' : area;
  App.render();
}

function setLogFeeling(label){ App.ui.logDraft.feeling = FEELING_SCALE.find(f=>f.l===label).v; App.render(); }
function setLogIntensity(v){ App.ui.logDraft.intensity = v; App.render(); }
function setLogPain(v){ App.ui.logDraft.pain = v; App.render(); }
function toggleLogFocus(a){ toggleArr(App.ui.logDraft.focus, a); App.render(); }
function toggleLogWall(a){ toggleArr(App.ui.logDraft.wallAngle, a); App.render(); }
function toggleLogHold(a){ toggleArr(App.ui.logDraft.holdTypes, a); App.render(); }
function toggleLogDayType(a){ toggleArr(App.ui.logDraft.dayTypes, a); App.render(); }
function toggleLogFailurePoint(a){ toggleArr(App.ui.logDraft.failurePoints, a); App.render(); }
function setClimbLocation(loc){ App.ui.climbLocationDraft = loc; App.render(); }
function toggleArr(arr, v){ const i=arr.indexOf(v); if (i>-1) arr.splice(i,1); else arr.push(v); }

function addClimbRow(){
  const g = document.getElementById('climbGrade').value.trim();
  const c = Number(document.getElementById('climbCount').value) || 1;
  if (!g) return;
  App.ui.climbsDraft.push({grade:g, count:c, location: App.ui.climbLocationDraft || 'Indoor'});
  App.render();
}
function removeClimbRow(i){ App.ui.climbsDraft.splice(i,1); App.render(); }

function exportData(){
  const safeSettings = Object.assign({}, App.settings);
  delete safeSettings.apiKey;
  const payload = { exportedAt: new Date().toISOString(), settings: safeSettings, entries: App.entries, assessments: App.assessments };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'beta-log-export-' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  App.toast('Exported — check your downloads');
}

function importData(file){
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const existingEntryIds = new Set(App.entries.map(e=>e.id));
      const newEntries = (data.entries||[]).filter(e => !existingEntryIds.has(e.id));
      App.entries = App.entries.concat(newEntries).sort((a,b)=> a.date.localeCompare(b.date));
      const existingAssessIds = new Set(App.assessments.map(a=>a.id));
      const newAssessments = (data.assessments||[]).filter(a => !existingAssessIds.has(a.id));
      App.assessments = App.assessments.concat(newAssessments).sort((a,b)=> a.date.localeCompare(b.date));
      App.saveEntries(); App.saveAssessments();
      App.toast(`Imported ${newEntries.length} entries, ${newAssessments.length} check-ins`);
      App.render();
    } catch(e) {
      App.toast('Could not read that file');
    }
  };
  reader.readAsText(file);
}


function submitLog(){
  const d = App.ui.logDraft;
  const entry = Object.assign({ id: uid() }, d, { climbs: App.ui.climbsDraft.slice() });
  App.entries = App.entries.filter(e => !(e.date===entry.date && e.type===entry.type)).concat([entry])
    .sort((a,b)=> a.date.localeCompare(b.date));
  App.saveEntries();
  App.ui.logDraft = freshLogDraft();
  App.ui.climbsDraft = [];
  App.ui.climbLocationDraft = 'Indoor';
  App.toast('Saved to your log');
  App.setTab('history');
}

function toggleEntry(id){ App.ui.expandedEntry = App.ui.expandedEntry === id ? null : id; App.render(); }

function setCycleType(t){ App.settings.cycleType = t; App.render(); }
function saveSettingsForm(){ App.saveSettings(); App.toast('Settings saved'); App.render(); }

function openQuestionnaire(){ App.ui.qOpen = true; App.ui.qDraft = {}; App.render(); window.scrollTo(0,0); }
function closeQuestionnaire(){ App.ui.qOpen = false; App.render(); }
function setQAnswer(i, v){ App.ui.qDraft[i] = v; App.render(); }

function submitAssessment(){
  const answers = QUESTIONS.map((q,i)=> App.ui.qDraft[i]);
  const totals = { mental:[], technique:[], physical:[] };
  QUESTIONS.forEach((q,i)=> totals[q.cat].push(answers[i]));
  const scores = {};
  Object.keys(totals).forEach(cat => { scores[cat] = totals[cat].reduce((a,b)=>a+b,0) / totals[cat].length; });
  App.assessments.push({ id: uid(), date: todayISO(), gradeIndoor: App.settings.gradeIndoor, gradeOutdoor: App.settings.gradeOutdoor, answers, scores });
  App.saveAssessments();
  App.ui.qOpen = false;
  App.toast('Check-in saved');
  App.setTab('today');
}

// ---- Init ----
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (btn) App.setTab(btn.dataset.tab);
});

App.load();
App.render();

// Explicit global exposure (belt-and-suspenders for inline onclick handlers across environments)
window.App = App;
window.setAskFeeling = setAskFeeling; window.toggleAskType = toggleAskType; window.setAskLocation = setAskLocation;
window.setFocusMode = setFocusMode; window.setFocusPick = setFocusPick; window.setFocusSecondary = setFocusSecondary;
window.setLogFeeling = setLogFeeling; window.setLogIntensity = setLogIntensity; window.setLogPain = setLogPain;
window.toggleLogFocus = toggleLogFocus; window.toggleLogWall = toggleLogWall; window.toggleLogHold = toggleLogHold;
window.toggleLogDayType = toggleLogDayType; window.toggleLogFailurePoint = toggleLogFailurePoint;
window.setClimbLocation = setClimbLocation;
window.addClimbRow = addClimbRow; window.removeClimbRow = removeClimbRow; window.submitLog = submitLog;
window.toggleEntry = toggleEntry; window.setCycleType = setCycleType; window.saveSettingsForm = saveSettingsForm;
window.openQuestionnaire = openQuestionnaire; window.closeQuestionnaire = closeQuestionnaire;
window.setQAnswer = setQAnswer; window.submitAssessment = submitAssessment; window.askClaude = askClaude;
window.applyPhaseOverride = applyPhaseOverride; window.exportData = exportData; window.importData = importData;
