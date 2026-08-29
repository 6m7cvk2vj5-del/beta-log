/* Beta Log — standalone training coach app
   Data lives in localStorage only. AI calls go straight to Anthropic's API
   using your own key (stored locally, never written into this file). */

const FOCUS_AREAS = ['Small holds','Bouldery pulling','Overhangs','High feet','Leg tension','Body tension','Hips to wall'];


const WALL_ANGLES = ['Overhang','Vertical','Slab','Roof'];
const HOLD_TYPES = ['Crimps','Slopers','Pockets','Pinches','Jugs'];
const FEELING_SCALE = [{v:1,l:'Flat'},{v:2,l:'Off'},{v:3,l:'Steady'},{v:4,l:'Strong'},{v:5,l:'Dialed'}];
const INTENSITY_OPTIONS = ['Easy','Moderate','Hard','Max effort'];
const SESSION_TYPE_OPTIONS = ['Climbing','Fingers','Antagonist / Stabilizer','Flexibility / Stretch','Mobility','Strength','Cardio','Core Workout'];
const PAIN_OPTIONS = ['None','Mild, manageable','Recurring issue','Something new'];
const ADHERENCE_OPTIONS = ['Followed exactly','Mostly followed','Modified a lot','Did something else entirely'];
const DAY_TYPES = ['Indoor','Outdoor','Bouldering','Sport/Rope','Project','Power','Power-Endurance','Skills/Technique','Fun/Social'];
const FAILURE_POINT_OPTIONS = ["Grip/forearms gave out","Footwork broke down","Lost the sequence","Couldn't commit to the move","Got pumped","Couldn't reach the hold","Feet cut loose","Mental — backed off"];
// General tags for Strength/Antagonist (legs folded in here as a muscle group, not a separate type)
// and Core, so logging doesn't require hunting through a long named-exercise list every time.
const MUSCLE_GROUPS = ['Upper body push','Upper body pull','Legs','Grip/forearms','Full body'];
const POWER_LEVELS = ['Max strength/heavy','Power/explosive','Endurance/high-rep','Stability/control'];
const CORE_REGIONS = ['Upper abs','Lower abs','Obliques','Full core/anti-rotation'];
const CORE_MOVEMENT_TYPES = ['Static/isometric','Dynamic/crunches-type'];

// Reference week — used only as a comparison point, not enforced. Mon/Fri rest, Tue/Thu climb,
// Wed exercise, Sat+Sun climb (one exercise-focused, one fun-focused).
const WEEKLY_TEMPLATE = ['Rest','Climb','Exercise','Climb','Rest','Climb','Climb']; // Mon..Sun
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Rough weekly minute targets used only to scale the radar chart — adjustable, not gospel.
// Axes match the loggable session types exactly.
const WEEKLY_TARGETS = { climb:150, fingers:40, strength:40, antag:50, core:40, flexibility:30, mobility:30, cardio:40 };
const RADAR_AXES = [
  {key:'climb', label:'Climbing'}, {key:'fingers', label:'Fingers'}, {key:'strength', label:'Strength'},
  {key:'antag', label:'Antagonist'}, {key:'core', label:'Core'}, {key:'flexibility', label:'Flexibility'},
  {key:'mobility', label:'Mobility'}, {key:'cardio', label:'Cardio'},
];

// Your own workout structures and exercise pool — used for logging (what did I do) and the
// weekly-guidelines check-in. These are guidelines to notice drift on, not requirements to hit.
// Flexibility/Stretch (pure static flexibility — yoga, stretching) and Mobility (fascia release,
// rolling out, body prep, functional movement) are kept as separate banks on purpose, per style —
// each named entry below doubles as a filter when picking exercises to log.
const WORKOUT_STYLES = ['Core Circuit','Leg Day','Upper Tabata','TRX — Core','TRX — Shoulder','Full Efficient Workout',
  'Yoga Poses','Static Stretch','Foam Rolling','Lacrosse Ball Release','Functional Movement','Body Prep',
  'Cardio Circuit','Fingers','General/Other'];
const EXERCISE_LIBRARY = {
  'Core Circuit': ["Hanging leg lift","Oblique weighted arm dip","Sit-up to stand-up","Wheelbarrow","Oblique knee raise plank","Farmer walk","A-frame drop","Plank (elevated)","Plank (sideways walk)","Side plank with leg raise","Full-body focus plank","Kettlebell figure 8","Matrix lean back"],
  'Leg Day': ["Squat/deadlift","Catcher calf raises","Calf jumps","High stepping","Weighted box jumps","Bulgarian lunges","Hanging knee lifts","Wall sits","Multidirectional lunges","Core-to-toe side lunges"],
  'Upper Tabata': ["Bent-over rows","Lat pulldowns","Bicep curls","Wrist curls"],
  'TRX — Core': ["Body saw","Side plank with hip raise","Overhead squat"],
  'TRX — Shoulder': ["Clock press","T-Y-I deltoid series","Atomic pushups","T-spine rotation"],
  'Full Efficient Workout': ["Mountain mans (rope/pulley alternating lockouts)","Campus board lunges","Around-the-world pull-ups","Offset pull-ups","Box jumps","One-leg squats","Lunges with shoulder press","Step-ups onto box","Tucks","Bridges","Side elbow planks","Dip-bar leg raises","Superman pushups","Bicep/tricep work","Chest/upper work","Forearm plank","Dolphin pushups","One-arm planks","Toe touches","Scissor kicks"],
  'Yoga Poses': ["Downward dog","Child's pose","Pigeon pose","Warrior I","Warrior II","Triangle pose","Cat-cow","Cobra pose","Seated forward fold","Low lunge","Reclined spinal twist","Happy baby pose","Bridge pose","Thread-the-needle"],
  'Static Stretch': ["Hip flexor stretch","Hamstring stretch","Adductor stretch","Rotator cuff stretch","Chest/biceps doorway stretch","Thoracic spine rotation","Wrist mobility circles","Shoulder dislocates (band/stick)","90/90 hip switches","Standing quad stretch","Calf stretch (wall)","Couch stretch (hip flexor)","Butterfly stretch","Lat stretch (overhead reach)","Ankle dorsiflexion stretch","Seated spinal twist","Neck rolls","Frog stretch"],
  'Foam Rolling': ["Foam roll — IT band","Foam roll — quads","Foam roll — lats","Foam roll — thoracic spine","Foam roll — calves","Foam roll — glutes","Foam roll — upper back"],
  'Lacrosse Ball Release': ["Lacrosse ball — glutes","Lacrosse ball — feet/plantar fascia","Lacrosse ball — pecs","Lacrosse ball — forearms","Lacrosse ball — traps/upper back"],
  'Functional Movement': ["Squat-to-stand","Inchworm to plank","Animal flow — bear crawl","Turkish get-up (bodyweight)","Loaded carry (farmer/suitcase)","Crawling patterns","World's greatest stretch (full combo)","Windmills","Scorpion stretch"],
  'Body Prep': ["Joint circles (ankles/hips/shoulders)","Arm circles","Leg swings (front-back)","Leg swings (side-side)","Hip circles","Walking lunges with twist","High knees march","Band pull-aparts","Wall slides"],
  'Cardio Circuit': ["Jump rope","Rowing intervals","Stair sprints","Suicide sprints","Incline treadmill walk","Bike intervals","Burpees"],
  'Fingers': ["Finger hangs","Finger pull-ups","Finger planks","Hangboard repeaters","Minimum-edge hangs","Fingerboard moving hangs","HIT System (max-strength hangs)","Wrist curls (health/prehab)","Finger extensions (rubber band)"],
  'General/Other': ["Hanging leg raises","Pistol squats","Raised-leg diamond pushups","Jumping lunges","Lateral pull-ups","Upside-down shoulder press","Tricep dips","Incline pushups","Chair ups","Stair jumps","Stair sprints","Front squats","Turkish getup","Straight-arm planks","Shoulder dislocates"],
};
// Which workout styles are worth surfacing for each session type — so picking "Cardio" doesn't
// show you TRX options and picking "Fingers" doesn't show you Cardio Circuit. Strength, Antagonist,
// and Core Workout all share the same full routine set, since any of these named routines could
// reasonably be logged under any of those three types.
const STRENGTH_LIKE_STYLES = ['Core Circuit','Leg Day','Upper Tabata','TRX — Core','TRX — Shoulder','Full Efficient Workout'];
// When a chosen routine clearly implies a different bucket than the selected session type(s),
// credit that bucket too when saving — the routine you actually did is more specific than the
// type checkbox you picked to get there.
const ROUTINE_IMPLIES_TYPE = { 'Core Circuit':'Core Workout', 'TRX — Core':'Core Workout' };
const TYPE_RELEVANT_STYLES = {
  'Antagonist / Stabilizer': STRENGTH_LIKE_STYLES,
  'Strength': STRENGTH_LIKE_STYLES,
  'Core Workout': STRENGTH_LIKE_STYLES,
  'Cardio': ['Cardio Circuit','General/Other'],
  'Flexibility / Stretch': ['Yoga Poses','Static Stretch'],
  'Mobility': ['Foam Rolling','Lacrosse Ball Release','Functional Movement','Body Prep'],
  'Fingers': ['Fingers'],
};

// Titles only, from your two physical books — enough to point you at the right page, not a
// reproduction of the content. "Drill" mode picks from here; "Play" mode ignores this entirely.
const DRILL_LIBRARY = [
  {t:'Twist-Lock & Backstep', book:'Training for Climbing', cat:'Technique'},
  {t:'Flagging (inside-edge flag-across / outside-edge flag-out)', book:'Training for Climbing', cat:'Technique'},
  {t:'Drop-Knee', book:'Training for Climbing', cat:'Technique'},
  {t:'Rock-Over', book:'Training for Climbing', cat:'Technique'},
  {t:'High-Step Precision Drill', book:'Training for Climbing', cat:'Technique'},
  {t:'Downclimbing Routes', book:'Training for Climbing', cat:'Technique'},
  {t:'Small-Foot Elimination (Tracking and Elimination)', book:'Training for Climbing', cat:'Technique'},
  {t:'First Touch', book:'Training for Climbing', cat:'Technique'},
  {t:'Speed Training', book:'Training for Climbing', cat:'Technique'},
  {t:'Minimum-Edge Hangs', book:'Training for Climbing', cat:'Fingers'},
  {t:'HIT System (max-strength hangs)', book:'Training for Climbing', cat:'Fingers'},
  {t:'Bouldering 4x4s', book:'Training for Climbing', cat:'Power-Endurance'},
  {t:'System Wall Repeaters', book:'Training for Climbing', cat:'Power-Endurance'},
  {t:'Campus Laddering (feet-on)', book:'Training for Climbing', cat:'Power'},
  {t:'Big-Move Boulder Problems', book:'Training for Climbing', cat:'Power'},

  {t:'Precision Feet (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Foot Stab (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Blinking (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Jibs Only (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Downclimbing (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Glue Feet (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Observe (footwork drill)', book:'Climb to Fitness', cat:'Technique'},
  {t:'Create a Crux', book:'Climb to Fitness', cat:'Technique'},
  {t:'MoonBoard', book:'Climb to Fitness', cat:'Technique'},
  {t:'Bookends', book:'Climb to Fitness', cat:'Technique'},
  {t:'Flash Sessions', book:'Climb to Fitness', cat:'Technique'},
  {t:'Limit Bouldering', book:'Climb to Fitness', cat:'Technique'},
  {t:'Traverse Eliminates', book:'Climb to Fitness', cat:'Technique'},
  {t:'Climb with Grace on the System Board', book:'Climb to Fitness', cat:'Technique'},
  {t:'Climb Forever Arc Sets', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Leapfrog', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Pyramids', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Roped Intervals', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Volume for Points', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Laps', book:'Climb to Fitness', cat:'Endurance'},
  {t:'3x10 Intervals', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Up-Downs', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Treadwall Training', book:'Climb to Fitness', cat:'Endurance'},
  {t:'Bouldering Intervals', book:'Climb to Fitness', cat:'Strength'},
  {t:'World Cup Simulator', book:'Climb to Fitness', cat:'Strength'},
  {t:'Tales of Power', book:'Climb to Fitness', cat:'Strength'},
  {t:'4x4s', book:'Climb to Fitness', cat:'Strength'},
  {t:'Circuits', book:'Climb to Fitness', cat:'Strength'},
  {t:'Lockoffs', book:'Climb to Fitness', cat:'Strength'},
  {t:'Peter Pans', book:'Climb to Fitness', cat:'Strength'},
  {t:'Project, Push-Up, Pull-Up', book:'Climb to Fitness', cat:'Strength'},
  {t:'Hangboarding 101', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Hangboard Repeaters', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Fingerboard Moving Hangs', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Hangboard Ladders', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Digit Dialing', book:'Climb to Fitness', cat:'Fingers'},
  {t:'6-Second Death Drop', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Perfect Pull-Ups', book:'Climb to Fitness', cat:'Fingers'},
  {t:'Make Big Moves on the Campus Board', book:'Climb to Fitness', cat:'Power'},
  {t:'Ladders on the Bachar Ladder', book:'Climb to Fitness', cat:'Power'},
  {t:'Complete Core', book:'Climb to Fitness', cat:'Core'},
  {t:'Suspended Circuits', book:'Climb to Fitness', cat:'Core'},
  {t:'Do the Legwork', book:'Climb to Fitness', cat:'Legs'},
  {t:'Upper Body Tabata', book:'Climb to Fitness', cat:'Strength'},
  {t:'Strong Circuits', book:'Climb to Fitness', cat:'Strength'},
  {t:'Home Improvement', book:'Climb to Fitness', cat:'Strength'},
  {t:'Freaky Fit', book:'Climb to Fitness', cat:'Strength'},
  {t:'Targeted Opposition', book:'Climb to Fitness', cat:'Injury Prevention'},
  {t:'Shoulder Routine', book:'Climb to Fitness', cat:'Injury Prevention'},
  {t:'Wrist Routine', book:'Climb to Fitness', cat:'Injury Prevention'},
  {t:'Protect Your Elbows and Shoulders', book:'Climb to Fitness', cat:'Injury Prevention'},
  {t:'Essential Yoga Poses', book:'Climb to Fitness', cat:'Mobility'},
  {t:'Shoulder and Hip Strengthening', book:'Climb to Fitness', cat:'Mobility'},
];

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
  lastPlan: 't4c_last_plan',
};

const App = {
  settings: { apiKey:'', cycleType:'3-2-1', cycleStartDate: todayISO(), gradeIndoor:'', gradeOutdoor:'', fontSize:'medium', theme:'light' },
  entries: [],
  assessments: [],
  lastPlan: null, // the most recently generated plan, persisted so it survives a reload/close
  ui: { tab:'today', logDraft: freshLogDraft(), climbsDraft: [], climbLocationDraft:'Indoor', askDraft: freshAskDraft(),
        qDraft: {}, qOpen:false, expandedEntry:null, planLoading:false, planError:'', planText:'',
        editingId:null, planFeedback:'', lastPlanContext:null, showAdherence:false, planAdherencePick:'',
        importLoading:false, importError:'', infoPopup:null,
        timer: { totalSeconds:30, remainingSeconds:30, running:false, intervalId:null, pickerOpen:false } },

  load() {
    try { const s = localStorage.getItem(LS.settings); if (s) this.settings = Object.assign(this.settings, JSON.parse(s)); } catch(e){}
    try { const e = localStorage.getItem(LS.entries); if (e) this.entries = JSON.parse(e); } catch(e){}
    try { const a = localStorage.getItem(LS.assessments); if (a) this.assessments = JSON.parse(a); } catch(e){}
    try { const p = localStorage.getItem(LS.lastPlan); if (p) this.lastPlan = JSON.parse(p); } catch(e){}
    // schema migration: old single "grade" field -> gradeIndoor
    if (this.settings.grade && !this.settings.gradeIndoor) {
      this.settings.gradeIndoor = this.settings.grade;
      delete this.settings.grade;
      this.saveSettings();
    }
    // schema migration: "Mobility / Stretch" renamed to "Flexibility / Stretch", and its routine
    // "Stretch/Mobility" renamed to "Stretch/Flexibility" — rename on existing entries so old data
    // isn't orphaned under a type string nothing else in the app recognizes anymore.
    let migratedEntries = false;
    this.entries.forEach(e => {
      if (e.type === 'Mobility / Stretch') { e.type = 'Flexibility / Stretch'; migratedEntries = true; }
      if (Array.isArray(e.workoutStyles) && e.workoutStyles.includes('Stretch/Mobility')) {
        e.workoutStyles = e.workoutStyles.map(s => s === 'Stretch/Mobility' ? 'Stretch/Flexibility' : s);
        migratedEntries = true;
      }
    });
    if (migratedEntries) this.saveEntries();
    this.applyFontSize();
    this.applyTheme();
  },
  applyFontSize() {
    const px = { small: 14, medium: 16, large: 19 }[this.settings.fontSize] || 16;
    document.documentElement.style.fontSize = px + 'px';
  },
  applyTheme() {
    if (this.settings.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  },
  saveSettings() { localStorage.setItem(LS.settings, JSON.stringify(this.settings)); },
  saveEntries() { localStorage.setItem(LS.entries, JSON.stringify(this.entries)); },
  saveAssessments() { localStorage.setItem(LS.assessments, JSON.stringify(this.assessments)); },
  saveLastPlan(text, sessionTypes) {
    this.lastPlan = { text, generatedAt: new Date().toISOString(), sessionTypes: sessionTypes || [] };
    try { localStorage.setItem(LS.lastPlan, JSON.stringify(this.lastPlan)); } catch(e){}
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
  },

  setTab(tab) { this.ui.tab = tab; this.render(); },
};

// UTC-based date strings are the wrong tool here: toISOString() converts to UTC first, so anyone
// west of Greenwich using the app in the evening gets tomorrow's date. Always build date strings
// from local getters instead.
function toLocalISO(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function todayISO(){ return toLocalISO(new Date()); }
// CSS variables handle theme-switching everywhere except the few spots that need a literal color
// string rather than var(--x) — canvas, and inline SVG fill built as plain rgba() text.
function themeGoldRGB(){ return App.settings.theme === 'dark' ? '204,155,60' : '158,110,36'; }
function themeColors(){
  return App.settings.theme === 'dark'
    ? { bg:'#211F26', surface:'#2A2831', gold:'#CC9B3C', text:'#F3EFE8', muted:'#ACA79E', teal:'#4E8C87' }
    : { bg:'#F5F3EE', surface:'#FFFFFF', gold:'#9E6E24', text:'#2B281F', muted:'#645F54', teal:'#3A6D67' };
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function freshLogDraft(){
  return { date: todayISO(), type:'Climbing', duration:0, feeling:3, intensity:'Moderate',
    dayTypes:[], dayTypesOther:'', focus:[], wallAngle:[], holdTypes:[],
    timeClimb:0, timeFingers:0, timeStrength:0, timeAntag:0, timeCore:0, timeFlexibility:0, timeMobility:0, timeCardio:0,
    workoutStyles:[], exercisesDone:[], muscleGroup:[], powerLevel:'', coreRegion:[], coreMovementType:[],
    failurePoints:[], failurePointsOther:'', pain:'None', notes:'', plan:'', planAdherence:'' };
}
function freshAskDraft(){
  return { minutes:60, feeling:3, sessionTypes:['Climbing'], focusMode:'weak', focusPick:'', focusOther:'', focusSecondary:'',
    sessionStyle:'play', drillCategory:'', mobilityFocus:[], routineStyle:'', mentalFocus:false };
}
const MOBILITY_FOCUS_OPTIONS = ['Hips','Shoulders','Thoracic spine/back','Ankles/feet','Wrists','Full body'];
const FINGERS_ROUTINE_OPTIONS = ['HIT System (max-strength)','Repeaters','Hangboard ladders','Coach\'s choice'];

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
  let acc = 0;
  for (const p of phases) {
    if (weekInCycle < acc + p.weeks) {
      return { phaseName: p.name, weekOfPhase: weekInCycle - acc + 1, phaseLengthWeeks: p.weeks,
        weekOfCycle: weekInCycle + 1, totalWeeksInCycle: totalWeeks };
    }
    acc += p.weeks;
  }
  return { phaseName: phases[0].name, weekOfPhase:1, phaseLengthWeeks: phases[0].weeks, weekOfCycle:1, totalWeeksInCycle: totalWeeks };
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
  App.settings.cycleStartDate = toLocalISO(newStart);
  App.saveSettings();
  App.toast('Set to ' + phaseName + ', week ' + weekOfPhase);
  App.setTab('today');
}
function applyPhaseOverride(){
  const phaseName = document.getElementById('overridePhase').value;
  const week = document.getElementById('overrideWeek').value;
  setPhaseManually(phaseName, week);
}

// ---- Day aggregation: multiple entries on one date collapse into one "day" record.
// This is the single source of truth for anything that counts days (streaks, charts, patterns) —
// logging stretching + antagonist + a climb on the same date is one day, not three.
function aggregateByDay(entries){
  const byDate = {};
  entries.forEach(e => {
    const d = byDate[e.date] || {
      date: e.date, totalMinutes: 0, timeClimb:0, timeFingers:0, timeStrength:0, timeAntag:0, timeCore:0, timeFlexibility:0, timeMobility:0, timeCardio:0,
      types: [], dayTypes: [], focus: [], intensities: [], pain: 'None', entries: [],
    };
    d.totalMinutes += Number(e.duration) || 0;
    d.timeClimb += Number(e.timeClimb) || 0;
    d.timeFingers += Number(e.timeFingers) || 0;
    d.timeStrength += Number(e.timeStrength) || 0;
    d.timeAntag += Number(e.timeAntag) || 0;
    d.timeCore += Number(e.timeCore) || 0;
    d.timeFlexibility += Number(e.timeFlexibility) || 0;
    d.timeMobility += Number(e.timeMobility) || 0;
    d.timeCardio += Number(e.timeCardio) || 0;
    if (!d.types.includes(e.type)) d.types.push(e.type);
    arr(e.dayTypes).forEach(t => { if (!d.dayTypes.includes(t)) d.dayTypes.push(t); });
    arr(e.focus).forEach(t => { if (!d.focus.includes(t)) d.focus.push(t); });
    if (e.intensity) d.intensities.push(e.intensity);
    if (e.pain && e.pain !== 'None') d.pain = e.pain; // any flagged pain that day wins
    d.entries.push(e);
    byDate[e.date] = d;
  });
  return byDate;
}
function dayList(entries){
  return Object.values(aggregateByDay(entries)).sort((a,b)=> b.date.localeCompare(a.date));
}
// Classifies a day for the weekly-template comparison: Climbing beats Exercise beats Rest.
function classifyDay(dayAgg){
  if (!dayAgg) return 'No entry';
  if (dayAgg.types.includes('Climbing')) return 'Climb';
  // A day made up only of rest, flexibility/stretch, and/or mobility work counts as a rest day —
  // that's active recovery, not training that should compete with the weekly template's rest slots.
  if (dayAgg.types.every(t => t === 'Rest' || t === 'Flexibility / Stretch' || t === 'Mobility')) return 'Rest';
  if (dayAgg.types.some(t => ['Antagonist / Stabilizer','Strength','Fingers','Cardio','Core Workout'].includes(t))) return 'Exercise';
  return 'Rest';
}

// ---- Weekly template comparison ----
function getWeekDates(anchorISO){
  const anchor = new Date(anchorISO + 'T00:00:00');
  const dow = (anchor.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const monday = new Date(anchor); monday.setDate(anchor.getDate() - dow);
  const out = [];
  for (let i=0;i<7;i++){ const d = new Date(monday); d.setDate(monday.getDate()+i); out.push(toLocalISO(d)); }
  return out;
}
function compareToWeeklyTemplate(entries){
  const dates = getWeekDates(todayISO());
  const byDate = aggregateByDay(entries);
  const today = todayISO();
  const rows = dates.map((date, i) => ({
    day: DAY_NAMES[i], date, template: WEEKLY_TEMPLATE[i],
    actual: date <= today ? classifyDay(byDate[date]) : null, // don't judge days that haven't happened
    isFuture: date > today,
  }));
  const notes = [];
  rows.filter(r => !r.isFuture).forEach(r => {
    if (r.actual === 'No entry') { notes.push(`${r.day}: nothing logged (template: ${r.template}).`); return; }
    if (r.template === 'Rest' && r.actual === 'Climb') notes.push(`${r.day}: logged a climb on a template rest day.`);
    if (r.template === 'Climb' && r.actual === 'Rest') notes.push(`${r.day}: rested on a template climbing day.`);
  });
  const climbDaysSoFar = rows.filter(r=>!r.isFuture && r.actual==='Climb').length;
  const restDaysSoFar = rows.filter(r=>!r.isFuture && r.actual==='Rest').length;
  const daysSoFar = rows.filter(r=>!r.isFuture).length;
  return { rows, notes, climbDaysSoFar, restDaysSoFar, daysSoFar };
}

// ---- Radar data ----
function computeWeeklyRadarData(entries){
  const days = dayList(entries).filter(d => {
    const daysAgo = Math.round((new Date(todayISO()) - new Date(d.date)) / 86400000);
    return daysAgo >= 0 && daysAgo < 7;
  });
  const sums = { climb:0, fingers:0, strength:0, antag:0, core:0, flexibility:0, mobility:0, cardio:0 };
  days.forEach(d => { Object.keys(sums).forEach(k => { sums[k] += d['time'+k[0].toUpperCase()+k.slice(1)] || 0; }); });
  return RADAR_AXES.map(a => ({ axis: a.label, pct: Math.min(150, Math.round((sums[a.key] / WEEKLY_TARGETS[a.key]) * 100)) }));
}

// Your own guidelines, checked against the trailing 7 days. Framed as a gentle check-in, not a
// pass/fail — the point is noticing drift, not adding pressure on top of an already full plate.
function computeWeeklyGuidelines(entries){
  const days = dayList(entries).filter(d => { const ago = Math.round((new Date(todayISO())-new Date(d.date))/86400000); return ago>=0 && ago<7; });
  const coreDayCount = days.filter(d => d.timeCore > 0).length;
  const coreVariety = new Set();
  days.forEach(d => d.entries.forEach(e => {
    arr(e.exercisesDone).forEach(x => { if ((EXERCISE_LIBRARY['Core Circuit']||[]).includes(x)) coreVariety.add(x); });
    arr(e.coreRegion).forEach(r => coreVariety.add(r));
  }));
  const legDayCount = days.filter(d => d.entries.some(e => arr(e.muscleGroup).includes('Legs'))).length;
  const tabataDone = days.some(d => d.entries.some(e => arr(e.workoutStyles).includes('Upper Tabata')));
  const trxDone = days.some(d => d.entries.some(e => arr(e.workoutStyles).includes('TRX — Core') || arr(e.workoutStyles).includes('TRX — Shoulder')));
  const fullWorkoutCount = days.filter(d => d.entries.some(e => arr(e.workoutStyles).includes('Full Efficient Workout'))).length;

  return [
    { label: 'Core variety, 3-5x/wk', ok: coreVariety.size >= 3 && coreDayCount >= 3, detail: `${coreVariety.size} distinct region(s)/exercise(s), ${coreDayCount} day(s) this week` },
    { label: 'Legs (1-2x/wk)', ok: legDayCount >= 1, detail: `${legDayCount} day(s) this week tagged Legs` },
    { label: 'Upper Tabata (1x/wk)', ok: tabataDone, detail: tabataDone ? 'done this week' : 'not yet this week' },
    { label: 'TRX (1x/wk)', ok: trxDone, detail: trxDone ? 'done this week' : 'not yet this week' },
    { label: 'Full efficient workout (2x/wk)', ok: fullWorkoutCount >= 2, detail: `${fullWorkoutCount} this week` },
  ];
}

function renderRadarSVG(data, size){
  size = size || 360; // internal coordinate space; actual rendered size is responsive via CSS below
  const cx = size/2, cy = size/2, r = size/2 - 75;
  const n = data.length;
  const angle = i => (Math.PI*2*i/n) - Math.PI/2;
  const pt = (i, frac) => [cx + r*frac*Math.cos(angle(i)), cy + r*frac*Math.sin(angle(i))];
  const rings = [0.25,0.5,0.75,1].map(frac => {
    const pts = data.map((d,i)=> pt(i,frac).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join('');
  const spokes = data.map((d,i)=> { const [x,y]=pt(i,1); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`; }).join('');
  // Cap the visual fill at 130%, not 100% — so doing more than your target actually shows up as
  // poking out past the dashed target ring, instead of being invisibly capped at the same edge
  // as someone who did exactly the target.
  const dataPts = data.map((d,i)=> pt(i, Math.min(1.3, d.pct/100)).join(',')).join(' ');
  const targetPts = data.map((d,i)=> pt(i,1).join(',')).join(' ');
  const labels = data.map((d,i)=> {
    const [x,y] = pt(i, 1.4);
    const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? 'middle' : (Math.cos(angle(i)) > 0 ? 'start' : 'end');
    return `<text x="${x}" y="${y}" fill="var(--muted)" font-size="9.5" text-anchor="${anchor}" dominant-baseline="middle">${escHtml(d.axis)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:320px;height:auto;display:block;overflow:visible;">
    ${rings}${spokes}
    <polygon points="${targetPts}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3,3"/>
    <polygon points="${dataPts}" fill="rgba(${themeGoldRGB()},.35)" stroke="var(--gold)" stroke-width="2"/>
    ${labels}
  </svg>`;
}

// ---- Pattern detection (simple, transparent heuristics, day-based not entry-based) ----
function detectPatterns(entries){
  const flags = [];
  const days = dayList(entries); // already sorted, most recent first, one record per calendar day
  const last10Days = days.slice(0,10);
  const last14Days = days.filter(d => { const ago = Math.round((new Date(todayISO())-new Date(d.date))/86400000); return ago>=0 && ago<14; });
  const last7Days = days.filter(d => { const ago = Math.round((new Date(todayISO())-new Date(d.date))/86400000); return ago>=0 && ago<7; });
  const climbDays = days.filter(d => classifyDay(d)==='Climb');
  const last4ClimbDays = climbDays.slice(0,4);

  const antag10 = last10Days.reduce((s,d)=> s + d.timeAntag, 0);
  if (last10Days.length >= 6 && antag10 === 0) {
    flags.push("Antagonist/stabilizer work hasn't shown up in your last " + last10Days.length + " logged days. That's the piece most likely to quietly turn into shoulder or elbow trouble if it keeps getting skipped.");
  }

  const fingers14 = last14Days.reduce((s,d)=> s + d.timeFingers, 0);
  if (last14Days.length >= 5 && fingers14 === 0) {
    flags.push("No dedicated finger-strength work in the last 14 days. Small holds don't improve on climbing volume alone — worth a hangboard session.");
  }

  if (last4ClimbDays.length === 4 && last4ClimbDays.every(d => d.intensities.includes('Max effort') || (d.intensities.length && d.intensities.every(i=>i==='Hard'||i==='Max effort')))) {
    flags.push("Your last 4 climbing days were all Hard/Max effort. Worth a lighter, skill- or mobility-focused day before stacking a 5th.");
  }

  // route-vs-boulder imbalance: last 6 climbing days tagged mostly Sport/Rope with none tagged Bouldering
  const last6ClimbDays = climbDays.slice(0,6);
  if (last6ClimbDays.length >= 5) {
    const ropeTagged = last6ClimbDays.filter(d => d.entries.some(e => e.type==='Climbing' && arr(e.dayTypes).includes('Sport/Rope'))).length;
    const boulderTagged = last6ClimbDays.filter(d => d.entries.some(e => e.type==='Climbing' && arr(e.dayTypes).includes('Bouldering'))).length;
    if (ropeTagged >= last6ClimbDays.length - 1 && boulderTagged === 0) {
      flags.push("Recent climbing has been almost all route/rope work with no bouldering — a MoonBoard or bouldering-focused session would round that out.");
    }
  }

  const lastMobilityDay = days.find(d => d.timeMobility > 0);
  if (lastMobilityDay) {
    const ago = Math.round((new Date(todayISO()) - new Date(lastMobilityDay.date)) / 86400000);
    if (ago >= 10) flags.push("It's been " + ago + " days since any mobility/stretch work showed up in the log.");
  } else if (days.length >= 6) {
    flags.push("No mobility/stretch work logged yet — worth adding on a non-climbing day.");
  }

  // training frequency: fewer than 3 active (non-rest) days in the trailing 7
  const activeDays7 = last7Days.filter(d => classifyDay(d) !== 'Rest').length;
  if (last7Days.length >= 4 && activeDays7 < 3) {
    flags.push("Only " + activeDays7 + " active day(s) logged in the last 7 — light week, or just under-logged?");
  }

  // rest: 6+ consecutive logged calendar days with zero Rest-classified days among them
  const consecutive = [];
  for (let i=0;i<days.length;i++){
    if (i===0) { consecutive.push(days[i]); continue; }
    const prevDate = new Date(days[i-1].date), curDate = new Date(days[i].date);
    if (Math.round((prevDate-curDate)/86400000) === 1) consecutive.push(days[i]); else break;
  }
  if (consecutive.length >= 6 && !consecutive.some(d => classifyDay(d)==='Rest')) {
    flags.push("6+ days logged in a row with no rest day in between. Rest is where the adaptation actually happens.");
  }

  // weekly template comparison — only mention if the week is meaningfully off, not every minor blip
  const tmpl = compareToWeeklyTemplate(entries);
  if (tmpl.daysSoFar >= 3 && tmpl.notes.length >= 2) {
    flags.push("This week's shape is drifting from your usual rhythm: " + tmpl.notes.slice(0,2).join(' '));
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
  App.entries.forEach(e => arr(e.focus).forEach(a => { counts[a] = (counts[a]||0) + 1; }));
  const leastWorked = Object.entries(counts).sort((a,b)=> a[1]-b[1]).slice(0,3).map(x=>x[0]);
  return { categoryRank, leastWorked };
}

// Where you stand on your own weekly guidelines — completed vs. not, nothing else. Pure
// computation from data already tracked elsewhere, no API call needed.
function computeBriefing(entries){
  const guidelines = computeWeeklyGuidelines(entries);
  return { completed: guidelines.filter(g => g.ok), notCompleted: guidelines.filter(g => !g.ok) };
}
function renderBriefingCard(entries){
  if (entries.length < 3) return ''; // not enough data yet to say anything meaningful
  const b = computeBriefing(entries);
  return `<div class="card">
    <h2>Training briefing${infoIcon('Where you stand on your weekly guidelines — not a plan, just a status check.')}</h2>
    ${b.completed.length ? `<p class="small" style="margin:6px 0;"><b style="color:var(--teal);">Completed this week:</b> ${escHtml(b.completed.map(g=>g.label).join(', '))}</p>` : ''}
    ${b.notCompleted.length ? `<p class="small" style="margin:6px 0;"><b style="color:var(--gold);">Not yet this week:</b> ${escHtml(b.notCompleted.map(g=>g.label).join(', '))}</p>` : ''}
  </div>`;
}

function climbingSessionsSinceLastAssessment(){
  const last = App.assessments[App.assessments.length - 1];
  const cutoff = last ? last.date : '0000-00-00';
  return dayList(App.entries).filter(d => d.date > cutoff && classifyDay(d)==='Climb').length;
}

function getMostRecentPainStatus(entries){
  const sorted = [...entries].sort((a,b)=> b.date.localeCompare(a.date));
  const withPain = sorted.find(e => e.pain);
  return withPain ? withPain.pain : 'None logged yet';
}

// One-tap way to clear the pain flag without going through the full log form.
// If something's already logged today, updates that entry's pain field in place (nothing else
// touched). If nothing's logged today yet, adds a minimal marker entry so the flag has something to point to.
function clearPainFlag(){
  const today = todayISO();
  const todaysEntries = App.entries.filter(e => e.date === today);
  if (todaysEntries.length > 0) {
    todaysEntries[todaysEntries.length - 1].pain = 'None';
  } else {
    App.entries.push(Object.assign(freshLogDraft(), { id: uid(), date: today, type:'Rest', duration:0,
      timeClimb:0, focus:[], wallAngle:[], holdTypes:[], failurePoints:[], dayTypes:[], intensity:'',
      pain:'None', notes:'Pain flag cleared via quick action.' }));
  }
  App.entries.sort((a,b)=> a.date.localeCompare(b.date));
  App.saveEntries();
  App.toast('Pain flag cleared');
  App.render();
}

// ---- Plan export / save-to-log (so a generated plan is never just stuck in memory) ----
// Web Share API opens the native share sheet on iOS/Android (Notes is a normal share target there);
// where that's not supported (most desktop browsers), fall back to copying to the clipboard.
async function sharePlan(){
  if (!App.ui.planText) return;
  const text = `Beta Log — ${todayISO()}\n\n${App.ui.planText}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Beta Log plan', text }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* user cancelled the share sheet */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    App.toast('Copied — paste into Notes or anywhere else');
  } catch (e) {
    App.toast('Could not copy automatically — select and copy the plan text manually');
  }
}
function openPlanAsPage(){
  if (!App.ui.planText) return;
  const body = linkifyPlanToHTML(App.ui.planText);
  const c = themeColors();
  const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Beta Log — ${todayISO()}</title>
<style>
  body{background:${c.bg};color:${c.text};font-family:-apple-system,BlinkMacSystemFont,'IBM Plex Sans',sans-serif;
    max-width:600px;margin:0 auto;padding:24px 18px;line-height:1.6;white-space:pre-wrap;font-size:15px;}
  h1{font-size:20px;color:${c.gold};margin-bottom:4px;}
  p.sub{color:${c.muted};font-size:13px;margin-top:0;margin-bottom:20px;}
  a{color:${c.gold};text-decoration:underline;text-decoration-style:dotted;}
  a:active{color:${c.teal};}
</style></head><body>
<h1>Beta Log — Today's Plan</h1>
<p class="sub">${todayISO()} &middot; tap any underlined exercise to search it</p>
${body}
</body></html>`;
  const blob = new Blob([doc], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function savePlanAsImage(){
  if (!App.ui.planText) return;
  const width = 640, padding = 28, lineHeight = 22, fontSize = 15;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { App.toast('Image export not supported in this browser'); return; }
  ctx.font = fontSize + 'px monospace';
  // wrap text to fit width
  const maxCharsPerLine = Math.floor((width - padding*2) / (fontSize*0.6));
  const lines = [];
  App.ui.planText.split('\n').forEach(paragraph => {
    if (paragraph.length === 0) { lines.push(''); return; }
    let line = '';
    paragraph.split(' ').forEach(word => {
      if ((line + ' ' + word).trim().length > maxCharsPerLine) { lines.push(line); line = word; }
      else { line = (line + ' ' + word).trim(); }
    });
    if (line) lines.push(line);
  });
  const height = padding*2 + lineHeight*(lines.length + 2);
  canvas.width = width; canvas.height = height;
  const COLORS_JS = themeColors();
  ctx.fillStyle = COLORS_JS.bg; ctx.fillRect(0,0,width,height);
  ctx.fillStyle = COLORS_JS.gold; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Beta Log — ' + todayISO(), padding, padding + 4);
  ctx.fillStyle = COLORS_JS.text; ctx.font = fontSize + 'px monospace';
  lines.forEach((line, i) => { ctx.fillText(line, padding, padding + lineHeight*2 + i*lineHeight); });
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'beta-log-plan-' + todayISO() + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });
}
function setPlanAdherence(v){ App.ui.planAdherencePick = v; App.render(); }
function showLastPlan(){
  if (!App.lastPlan) return;
  App.ui.planText = App.lastPlan.text;
  App.ui.planError = '';
  App.render();
  const box = document.querySelector('.plan-box');
  if (box && box.scrollIntoView) box.scrollIntoView({behavior:'smooth', block:'start'});
}
// Shared with the "Add this to today's log" flow — same extraction, same validation, same schema,
// whether the text came from an uploaded file or a Claude-generated plan.
async function extractWorkoutData(text){
  const key = (App.settings.apiKey||'').trim();
  if (!key) throw new Error('Add your Anthropic API key in Settings first.');
  if (!text || !text.trim()) throw new Error('There\u2019s no text to read.');

  const schema = `{
  "type": one of "Climbing","Fingers","Antagonist / Stabilizer","Flexibility / Stretch","Strength","Cardio","Core Workout","Rest",
  "date": "YYYY-MM-DD" if a date is mentioned, else null,
  "feeling": integer 1-5 if inferable from tone, else null,
  "timeClimb": number, "timeFingers": number, "timeStrength": number, "timeAntag": number, "timeCore": number, "timeMobility": number, "timeCardio": number (minutes in each bucket that actually applies; 0 for the rest),
  "intensity": one of "Easy","Moderate","Hard","Max effort", or null (climbing only),
  "dayTypes": array from ["Indoor","Outdoor","Bouldering","Sport/Rope","Project","Power","Power-Endurance","Skills/Technique","Fun/Social"] (climbing only),
  "climbs": array of {"grade":string, "count":number, "location":"Indoor" or "Outdoor"} (climbing only),
  "muscleGroup": array from ["Upper body push","Upper body pull","Legs","Grip/forearms","Full body"] (strength/antagonist only),
  "powerLevel": one of "Max strength/heavy","Power/explosive","Endurance/high-rep","Stability/control", or null,
  "coreRegion": array from ["Upper abs","Lower abs","Obliques","Full core/anti-rotation"] (core only),
  "coreMovementType": array from ["Static/isometric","Dynamic/crunches-type"] (core only),
  "failurePoints": array from ["Grip/forearms gave out","Footwork broke down","Lost the sequence","Couldn't commit to the move","Got pumped","Couldn't reach the hold","Feet cut loose","Mental — backed off"] (climbing only),
  "notes": short free-text summary of anything real in the source that doesn't fit the fields above
}`;
  const sys = "You extract structured climbing-training data from free text into a fixed JSON schema. " +
    "Respond with ONLY the JSON object — no markdown fences, no preamble, no commentary. Use null, an empty " +
    "array, or 0 for anything not actually present in the text — never invent or guess at data that isn't there. " +
    "Schema:\n" + schema;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01',
               'anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:800, system: sys,
      messages:[{role:'user', content: 'Text to extract from:\n\n' + text.slice(0, 8000)}] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  const raw = (data.content||[]).map(b=>b.text||'').join('\n').trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);

  // Build a fresh draft and only apply fields that actually validate against the app's own option
  // lists — the model's output is a starting point for you to review, never trusted blindly.
  const fresh = freshLogDraft();
  const validTypes = SESSION_TYPE_OPTIONS.concat(['Rest']);
  fresh.type = validTypes.includes(parsed.type) ? parsed.type : 'Strength';
  fresh.date = (typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) ? parsed.date : todayISO();
  fresh.feeling = [1,2,3,4,5].includes(Number(parsed.feeling)) ? Number(parsed.feeling) : 3;
  TIME_FIELDS.forEach(f => { fresh[f] = Number(parsed[f]) || 0; });
  if (INTENSITY_OPTIONS.includes(parsed.intensity)) fresh.intensity = parsed.intensity;
  fresh.dayTypes = arr(parsed.dayTypes).filter(t => DAY_TYPES.includes(t));
  fresh.muscleGroup = arr(parsed.muscleGroup).filter(t => MUSCLE_GROUPS.includes(t));
  if (POWER_LEVELS.includes(parsed.powerLevel)) fresh.powerLevel = parsed.powerLevel;
  fresh.coreRegion = arr(parsed.coreRegion).filter(t => CORE_REGIONS.includes(t));
  fresh.coreMovementType = arr(parsed.coreMovementType).filter(t => CORE_MOVEMENT_TYPES.includes(t));
  fresh.failurePoints = arr(parsed.failurePoints).filter(t => FAILURE_POINT_OPTIONS.includes(t));
  fresh.notes = typeof parsed.notes === 'string' ? parsed.notes.slice(0, 2000) : '';
  if (TYPE_TO_WORKOUT_STYLE[fresh.type]) fresh.workoutStyles = [TYPE_TO_WORKOUT_STYLE[fresh.type]];
  fresh.duration = TIME_FIELDS.reduce((sum,f)=> sum + (Number(fresh[f])||0), 0);

  const climbsDraft = arr(parsed.climbs).filter(c => c && c.grade).map(c => ({
    grade: String(c.grade).slice(0,20), count: Number(c.count)||1,
    location: (c.location === 'Indoor' || c.location === 'Outdoor') ? c.location : 'Indoor',
  }));
  return { fresh, climbsDraft };
}

// "Add this to today's log" — runs the plan text through the same extraction as a file import,
// then drops you on the Log tab to review and adjust before it actually saves.
async function saveGeneratedPlanToLog(){
  App.ui.importLoading = true; App.ui.importError = ''; App.render();
  try {
    const { fresh, climbsDraft } = await extractWorkoutData(App.ui.planText);
    fresh.plan = App.ui.planText;
    fresh.planAdherence = App.ui.planAdherencePick;
    App.ui.logDraft = fresh;
    App.ui.climbsDraft = climbsDraft;
    App.ui.editingId = null;
    App.ui.showAdherence = false; App.ui.planAdherencePick = '';
    App.ui.importLoading = false; // clear before switching tabs, or the new tab renders stuck "loading"
    App.toast('Extracted — review and save');
    App.setTab('log');
  } catch(e) {
    App.ui.importError = 'Could not process the plan: ' + e.message;
    App.ui.importLoading = false;
    App.render();
  }
}

async function importWorkoutFile(file){
  if (!file) return;
  App.ui.importLoading = true; App.ui.importError = ''; App.render();
  try {
    const text = await file.text();
    const { fresh, climbsDraft } = await extractWorkoutData(text);
    App.ui.logDraft = fresh;
    App.ui.climbsDraft = climbsDraft;
    App.ui.editingId = null;
    App.toast('Extracted — review and save');
  } catch(e) {
    App.ui.importError = 'Could not read that file: ' + e.message;
  } finally {
    App.ui.importLoading = false; App.render();
  }
}

// Gathers the named exercises actually relevant to what's being asked for, so the plan can be told
// to draw from them — otherwise the model has no idea this bank exists and just invents its own,
// which is why curated exercises were never actually getting suggested.
function relevantExerciseBankText(sessionTypes, routineStyle){
  const styles = new Set();
  if (routineStyle && EXERCISE_LIBRARY[routineStyle]) styles.add(routineStyle);
  sessionTypes.forEach(t => { (TYPE_RELEVANT_STYLES[t]||[]).forEach(s => styles.add(s)); });
  const lines = [...styles].filter(s => EXERCISE_LIBRARY[s]).map(s => `${s}: ${EXERCISE_LIBRARY[s].join(', ')}`);
  return lines.join('\n');
}

async function askClaude(feedback){
  const key = (App.settings.apiKey||'').trim();
  if (!key) { App.ui.planError = 'Add your Anthropic API key in Settings first.'; App.render(); return; }
  App.ui.planLoading = true; App.ui.planError='';
  if (!feedback) App.ui.planText = '';
  App.render();

  let sys, messages;

  if (feedback && App.ui.lastPlanContext) {
    // Regenerating with feedback: reuse the exact prior request + the plan Claude gave, then ask for the adjustment.
    sys = App.ui.lastPlanContext.sys;
    messages = [
      { role:'user', content: App.ui.lastPlanContext.userMsg },
      { role:'assistant', content: App.ui.planText },
      { role:'user', content: `Adjust that plan: ${feedback}` },
    ];
  } else {
    const cycle = getCycleState(App.settings);
    const guidance = PHASE_GUIDANCE[cycle.phaseName];
    const flags = detectPatterns(App.entries);
    const weak = getWeakPointProfile();
    const d = App.ui.askDraft;

    const recent = dayList(App.entries).slice(0,14).reverse().map(d => {
      const cls = classifyDay(d);
      const parts = [`${d.totalMinutes}min total`, cls];
      if (d.dayTypes.length) parts.push('day type: '+d.dayTypes.join('/'));
      if (d.intensities.length) parts.push('intensity: '+d.intensities.join('/'));
      if (d.focus.length) parts.push('focus: '+d.focus.join(', '));
      parts.push(`time — climb:${d.timeClimb} fingers:${d.timeFingers} strength:${d.timeStrength} antag:${d.timeAntag} core:${d.timeCore} mobility:${d.timeMobility} cardio:${d.timeCardio}`);
      if (d.pain !== 'None') parts.push('PAIN: '+d.pain);
      // Per-entry detail — every field actually entered that day, not just the aggregated totals.
      const entryDetails = d.entries.map(e => {
        const bits = [];
        const climbs = arr(e.climbs);
        if (climbs.length) bits.push('climbs: ' + climbs.map(c => `${c.grade}×${c.count}${c.location?' ('+c.location+')':''}`).join(', '));
        const failures = arr(e.failurePoints);
        if (failures.length) bits.push('broke down on: ' + failures.join(', '));
        if (e.failurePointsOther) bits.push('failure detail: ' + e.failurePointsOther);
        const wStyles = arr(e.workoutStyles);
        if (wStyles.length) bits.push('routine: ' + wStyles.join(', '));
        const exs = arr(e.exercisesDone);
        if (exs.length) bits.push('exercises: ' + exs.join(', '));
        const mg = arr(e.muscleGroup);
        if (mg.length) bits.push('muscle group: ' + mg.join(', '));
        if (e.powerLevel) bits.push('power level: ' + e.powerLevel);
        const cr = arr(e.coreRegion);
        if (cr.length) bits.push('core region: ' + cr.join(', '));
        const cmt = arr(e.coreMovementType);
        if (cmt.length) bits.push('core movement: ' + cmt.join(', '));
        if (e.plan && e.planAdherence) bits.push('followed a generated plan: ' + e.planAdherence);
        if (e.notes) bits.push('notes: "' + e.notes + '"');
        return bits.length ? `  [${e.type}] ${bits.join('; ')}` : '';
      }).filter(Boolean).join('\n');
      return `${d.date}: ${parts.join(', ')}` + (entryDetails ? '\n' + entryDetails : '');
    }).join('\n') || 'No prior entries yet.';

    const mostRecentPain = getMostRecentPainStatus(App.entries);
    const tmpl = compareToWeeklyTemplate(App.entries);
    const tmplLine = tmpl.notes.length ? tmpl.notes.join(' ') : 'On track with the usual weekly rhythm so far.';
    const guidelines = computeWeeklyGuidelines(App.entries);
    const guidelineLine = guidelines.filter(g=>!g.ok).map(g=>g.label).join(', ') || 'all on track this week';
    // Weak-point profile is always sent as background, independent of which priority-focus mode
    // is selected — it shouldn't disappear just because you picked a specific focus area instead.
    const mentalIsWeakest = !!(weak.categoryRank && weak.categoryRank[0][0] === 'mental');
    const weakPointLine = weak.categoryRank
      ? `Weakest category from self-assessment: ${weak.categoryRank[0][0]} (avg ${weak.categoryRank[0][1].toFixed(1)}/5). Least-worked focus areas in the log: ${weak.leastWorked.join(', ')}.`
      : 'No weak-point check-in taken yet.';

    let focusLine = '';
    if (d.focusMode === 'other' && d.focusOther.trim()) {
      focusLine = d.focusOther.trim();
    } else if (d.focusMode === 'weak' && weak.categoryRank) {
      focusLine = `Auto: use the weak-point profile above.`;
    } else if (d.focusPick) {
      focusLine = d.focusPick;
    } else {
      focusLine = "Coach's choice based on the log and patterns below.";
    }
    if (d.focusSecondary) focusLine += ` Secondary focus: ${d.focusSecondary}.`;

    const drillPool = d.drillCategory ? DRILL_LIBRARY.filter(x => x.cat === d.drillCategory) : DRILL_LIBRARY;
    const drillLine = d.sessionTypes.includes('Climbing')
      ? (d.sessionStyle === 'drill'
          ? `Wants a specific named drill for the climbing portion${d.drillCategory ? ' (category: '+d.drillCategory+')' : ''}. Pick ONE from the list below that fits today's context and state its exact title and source book so they can look it up in their own copy. Do not invent a drill name that isn't in this list, and do not attempt to describe or explain the drill's actual instructions — they'll look those up themselves:\n` + drillPool.map(x=>`- "${x.t}" (${x.book}, ${x.cat})`).join('\n')
          : 'Just wants to play/climb today — keep the climbing portion open and unstructured (pick routes/problems that sound fun, no assigned drill), while still following the structure requirement below for the non-climbing pieces.')
      : '';

    sys = "You are an experienced rock climbing training coach, working with an intermediate climber who also " +
      "has a full-time job, regular recovery-program meetings, and therapy — respect their time budget exactly, " +
      "don't pad the plan, and don't guilt them about anything they've missed. You're given their training cycle " +
      "phase, a phase-structure guideline, their recent log aggregated by calendar day (a day with multiple logged " +
      "sub-sessions is already combined into one line, with a per-entry breakdown underneath showing everything " +
      "they actually entered that day — specific climbs/grades, what broke down, which routine and exercises, " +
      "muscle group and power level, core region and movement type, their own free-text notes, and whether they " +
      "followed a previous generated plan and how closely — treat a day with multiple sub-sessions as one day, not " +
      "several, but do read the per-entry detail, it's real signal, not filler), detected training patterns, their " +
      "own weekly strength-training guidelines, their weak-point self-assessment profile, and today's context. Use " +
      "all of this — specific grades climbed, quoted notes, and the weak-point profile are not decoration, actually " +
      "factor them into what you prescribe (e.g. a note mentioning a specific move problem, a cluster of climbs at " +
      "a plateaued grade, or a recurring failure point should visibly shape the plan). Give a single, specific, " +
      "concrete plan for today's session, sized to the exact time budget given. Use short list format with rough " +
      "durations/sets/reps, no fluff, no disclaimers. Follow the phase guideline loosely, not rigidly.\n\n" +
      "ONLY include the session type(s) actually requested below — nothing else. If 'Climbing' is not among the " +
      "requested session type(s), do not include any climbing, on-wall movement, route, or boulder-problem content " +
      "anywhere in the plan, even briefly — this is a pure off-the-wall training day built only from the requested " +
      "modalities (strength/antagonist/cardio/core/fingers/mobility). Don't default to climbing content just because " +
      "you're a climbing coach.\n\n" +
      "STRUCTURE REQUIREMENT, only when 'Climbing' IS among the requested session types: always include, in this " +
      "order — (1) warmup off " +
      "the wall — general movement prep to get the body ready (joint circles, activation drills, light dynamic " +
      "stretching — not on-wall climbing), (2) light easy climbing as a second warmup phase, (3) the main climbing " +
      "volume, (4) some near-limit/limit climbing, (5) climbing-related strength or power exercise, " +
      "(6) a light health circuit covering fingers, wrists, shoulders, forearms, and hips, (7) cooldown/stabilizer " +
      "work. That numbered list describes the STRUCTURE conceptually — it is not a template for output bullets. " +
      "Each of these seven pieces gets its own section header in what you write (e.g. '### Volume — 30 min'), never " +
      "a single bullet point summarizing the whole piece ('- Volume: climb 8-10 problems...' is wrong — a bullet is " +
      "always one specific, tappable thing, never a paragraph-level description of an entire phase). If a piece is " +
      "just a general instruction rather than a list of specific things, write it as a plain sentence under its " +
      "header, not as a bulleted list item. Never drop a piece, but vary the AMOUNT of each — how much climbing, how much antagonist/stabilizer, " +
      "how much cardio — based on the phase, time budget, and the patterns/weekly-rhythm notes below. The finger " +
      "and forearm portion of that health circuit is NEVER optional and never gets cut for time, even on a short " +
      "session — climbing is finger/forearm-dominant, and skipping this is exactly how those get overdeveloped and " +
      "chronically stressed relative to everything opposing them; a couple of minutes of finger extensions or wrist " +
      "mobility is enough on a tight day, but it must be there. Also include a brief mental-game component every " +
      "climbing session by default — a specific visualization cue, a note on committing to a move instead of " +
      "hesitating — a sentence or two is enough, it doesn't need its own time block. ESCALATE this to a real, " +
      "dedicated mental-work block with actual time allotted (not just a line) whenever either is true: they've " +
      "explicitly requested a mental-heavy session today, or their self-assessment flags mental as the weakest " +
      "category — in either case build in deliberate practice (extended visualization before an attempt, " +
      "purposely working a move that triggers hesitation, a pre-climb routine, working through a specific fear " +
      "like a big move or an exposed position) as a real part of the session, not an aside. Design climbing " +
      "portions around 4-8 move problems or route laps with " +
      "real rest between attempts — never " +
      "a single move drilled to exhaustion, and never just 20 minutes projecting one hard climb. When Climbing is not " +
      "requested, still shape the session as warmup → main work → cooldown using only the requested modalities — " +
      "build a real mobility/general-movement session where relevant, not just a stretch list — center it on the " +
      "mobility focus area if one is given — and if it fits the time budget, consider drawing from their own workout " +
      "templates (core circuit, upper tabata, TRX, or the full efficient-workout structure) rather than inventing " +
      "something generic.\n\n" +
      "If a pattern flag or weekly-rhythm note is relevant, address it directly in the plan (e.g. slot in finger work " +
      "or antagonist work if it's been skipped, or flag that a rest day is overdue) and say briefly why — but weigh " +
      "this against their bandwidth constraints; a missed guideline on a genuinely busy week is not an emergency. " +
      "If a route-vs-boulder imbalance flag is present, it's fine to suggest a MoonBoard or bouldering-focused " +
      "session as the climbing portion — they're open to that when it's genuinely warranted, not just as a default. " +
      "When 'Fingers' is among the requested session types: always include some finger/wrist/forearm health work " +
      "(e.g. wrist curls, finger extensions, gentle mobility) alongside the actual strength work, never just max-effort " +
      "hangs with nothing else — and state plainly which week of the current phase this falls in (e.g. 'Week 2 of 3, " +
      "Max Strength & Power'), since that context should visibly shape the prescription. The HIT System (max-strength " +
      "hangboard protocol) is a legitimate option to recommend here when it fits the phase and their level — feel free " +
      "to suggest it, not just repeaters.\n\n" +
      "FORMAT REQUIREMENT, applies to every workout type: every list item must name a specific, real, " +
      "individually-recognizable exercise or stretch someone could look up and do — e.g. 'Side plank hold' or " +
      "'Reverse crunches', never a category label standing in for one. The muscle group, power level, core region, " +
      "core movement type, and day type in their log are CONTEXT for deciding what to prescribe — never echo one of " +
      "those labels as if it were the exercise itself (wrong: 'Obliques, static: side plank hold' — the actual " +
      "exercise name got buried after a label prefix; right: 'Side plank hold (obliques, static), 30 sec/side'). " +
      "Also get the anatomy right when you group or label things by body region — a hip/glute stretch like Figure-4 " +
      "or pigeon pose is not an upper-body stretch, and mislabeling what a movement actually targets is a real " +
      "mistake, not a minor detail. If you're unsure which region heading something belongs under, use a neutral " +
      "heading instead of guessing wrong.\n\n" +
      "When a named exercise bank is provided below, treat it as your primary source — most of what you " +
      "prescribe should be pulled directly from it by name, since that's what they can actually tap-select " +
      "afterward when logging. It's fine to introduce one new item outside the bank if it genuinely fits better, " +
      "but don't reach outside it by default. Keep the session THEMED and consistent — if it's a core session, " +
      "stay core-focused throughout rather than wandering across unrelated categories; a single deliberate new " +
      "block (e.g. one drill or one stretch style not in their usual rotation) is good for variety, scattering " +
      "many unrelated things across one session is not.\n\n" +
      "'Current pain status' line is the authoritative, most recent state — if it says None, do not dwell on older " +
      "pain mentions elsewhere in the log; if it says anything else, do not prescribe exercise for the affected area, " +
      "recommend rest and seeing a doctor or physical therapist instead, and only plan around unaffected areas if " +
      "that still makes sense.";

    const userMsg = `Cycle: ${App.settings.cycleType}, currently in "${cycle.phaseName}" (week ${cycle.weekOfPhase} of ${cycle.phaseLengthWeeks}).\n` +
      `Phase guideline: ${guidance}\n` +
      `Indoor grade: ${App.settings.gradeIndoor || 'not set'} · Outdoor grade: ${App.settings.gradeOutdoor || 'not set'}\n` +
      `Current pain status (most recent entry): ${mostRecentPain}\n` +
      `This week vs. usual rhythm: ${tmplLine}\n` +
      `Weekly guidelines not yet hit this week: ${guidelineLine}\n` +
      `Weak-point profile (background context regardless of today's priority-focus choice): ${weakPointLine}\n` +
      (drillLine ? `Climbing portion request: ${drillLine}\n` : '') + `\n` +
      `Detected patterns: ${flags.length ? flags.join(' | ') : 'none flagged'}\n\n` +
      `Recent log, per calendar day with every field entered that day (most recent last):\n${recent}\n\n` +
      `Today:\n- Minutes available: ${d.minutes}\n- Feeling: ${FEELING_SCALE.find(f=>f.v===d.feeling).l} (${d.feeling}/5)\n` +
      `- Session type(s) wanted: ${d.sessionTypes.join(', ') || 'no preference'}\n- Priority focus: ${focusLine}\n` +
      (d.mobilityFocus.length ? `- Flexibility focus: ${d.mobilityFocus.join(', ')}\n` : '') +
      (d.routineStyle ? `- Requested routine: ${d.routineStyle} — build the session around this specific routine.\n` : '') +
      (d.mentalFocus ? `- Explicitly requested a mental-heavy session today.\n` : '') +
      (mentalIsWeakest ? `- Mental is the weakest category from their self-assessment.\n` : '') + `\n` +
      (relevantExerciseBankText(d.sessionTypes, d.routineStyle) ? `Their own named exercise bank for today's relevant routines (see FORMAT REQUIREMENT below):\n${relevantExerciseBankText(d.sessionTypes, d.routineStyle)}\n\n` : '') +
      `Give today's plan.`;

    messages = [{ role:'user', content: userMsg }];
    App.ui.lastPlanContext = { sys, userMsg };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01',
                 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1200, system: sys, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    const text = (data.content||[]).map(b=>b.text||'').join('\n').trim();
    App.ui.planText = text || 'No response came back — try again.';
    App.ui.planFeedback = '';
    if (text) App.saveLastPlan(text, App.ui.askDraft.sessionTypes);
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
    const searchBtn = opts.searchable
      ? `<span onclick="event.stopPropagation(); searchExercise('${escAttr(o)}')" style="margin-left:6px;opacity:.75;cursor:pointer;" title="Search this">&#128269;</span>`
      : '';
    return `<button type="button" class="${cls}${isActive ? ' active'+altClass : ''}" onclick="${onClick}('${escAttr(o)}')">${o}${searchBtn}</button>`;
  }).join('')}</div>`;
}
function searchURLFor(name){
  const cleaned = name.replace(/\([^)]*\)/g, '').trim(); // drop parenthetical detail for a cleaner query
  return 'https://www.google.com/search?q=' + encodeURIComponent(cleaned + ' exercise how to');
}
function searchExercise(name){
  window.open(searchURLFor(name), '_blank');
}
function escAttr(s){ return String(s).replace(/'/g, "\\'"); }
function escHtml(s){ return String(s==null?'':s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
// Some fields (failurePoints, notably) used to be free-text strings in earlier versions of this
// app before becoming tag arrays. Real accounts have months of entries spanning that change, so
// every read of these fields goes through this instead of a raw (e.field||[]) — [].concat() turns
// an old string into a one-item array instead of crashing when something later calls .forEach/.includes/.join on it.
function arr(x){ return [].concat(x||[]); }

// Shared parser: splits each bullet/numbered line of a generated plan into {prefix, name, rest} —
// leading marker, the exercise-name portion (before the first : — – or comma), and everything
// after (sets/reps/detail). Headers and plain prose lines come back with name:null, unchanged.
function parsePlanLines(text){
  if (!text) return [];
  return text.split('\n').map(line => {
    const bulletMatch = line.match(/^(\s*(?:[-*•]|\d+[.)])\s+)(.*)$/);
    if (!bulletMatch) return { prefix:'', name:null, rest: line };
    const prefix = bulletMatch[1];
    const body = bulletMatch[2].replace(/\*\*(.*?)\*\*/g, '$1');
    const sepMatch = body.match(/^(.*?)(:|—|–|,| - )([\s\S]*)$/);
    const namePart = (sepMatch ? sepMatch[1] : body).trim();
    const restPart = sepMatch ? sepMatch[2] + sepMatch[3] : '';
    if (!namePart) return { prefix, name:null, rest: body };
    return { prefix, name: namePart, rest: restPart };
  });
}
// In-app version: exercise name is a tappable span that calls searchExercise() via the app's own JS.
function renderPlanWithSearchLinks(text){
  return parsePlanLines(text).map(l => l.name === null
    ? escHtml(l.rest)
    : escHtml(l.prefix) + `<span class="ex-link" onclick="searchExercise('${escAttr(l.name)}')">${escHtml(l.name)}</span>` + escHtml(l.rest)
  ).join('\n');
}
// Standalone version: real <a href> links, no JS dependency — works in an opened tab, a saved
// HTML file, or offline, since it doesn't rely on this app's code being present.
function linkifyPlanToHTML(text){
  return parsePlanLines(text).map(l => l.name === null
    ? escHtml(l.rest)
    : escHtml(l.prefix) + `<a href="${searchURLFor(l.name)}" target="_blank" rel="noopener">${escHtml(l.name)}</a>` + escHtml(l.rest)
  ).join('\n');
}

// ---- Shuffle/remove for the live plan on Today. App.ui.planText stays the single source of
// truth (a plain string) the whole time — every edit reads it, mutates the line array, and writes
// a plain string straight back, so search/export/share/save-to-log/regenerate all keep working
// completely unchanged; they have no idea editing happened.
// A handful of climbing plans phrase a whole phase as one bullet ("- Warmup: 10 min easy climbing")
// rather than a specific exercise. That's a description of a block, not a tappable thing, so it's
// deliberately excluded from the exercise classification even though it starts with a bullet marker.
const PLAN_PHASE_LABELS = /^(warm.?up|cool.?down|volume|near.?limit|limit work|easy climbing|main climbing|climbing volume)\s*[:—–-]/i;
function classifyPlanLine(line){
  if (/^\s*#{1,6}\s+\S/.test(line) || /^\s*\*\*[^*]+\*\*\s*$/.test(line)) return 'header';
  const bulletMatch = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(\S.*)$/);
  if (bulletMatch) {
    if (PLAN_PHASE_LABELS.test(bulletMatch[1].replace(/\*\*/g, '').trim())) return 'other';
    return 'exercise';
  }
  if (!line.trim()) return 'blank';
  return 'other';
}
function cleanupEmptyHeaders(lines){
  for (let i = lines.length - 1; i >= 0; i--) {
    if (classifyPlanLine(lines[i]) !== 'header') continue;
    let hasExercise = false;
    for (let j = i+1; j < lines.length; j++) {
      const cls = classifyPlanLine(lines[j]);
      if (cls === 'header') break;
      if (cls === 'exercise') { hasExercise = true; break; }
    }
    if (!hasExercise) lines.splice(i, 1);
  }
}
function collapseBlankRuns(lines){
  for (let i = lines.length - 1; i > 0; i--) {
    if (classifyPlanLine(lines[i]) === 'blank' && classifyPlanLine(lines[i-1]) === 'blank') lines.splice(i, 1);
  }
}
function removePlanLine(index){
  const lines = (App.ui.planText || '').split('\n');
  lines.splice(index, 1);
  cleanupEmptyHeaders(lines);
  collapseBlankRuns(lines);
  App.ui.planText = lines.join('\n');
  App.render();
}
function findSectionBounds(lines, index){
  let start = 0;
  for (let i = index - 1; i >= 0; i--) { if (classifyPlanLine(lines[i]) === 'header') { start = i + 1; break; } }
  let end = lines.length - 1;
  for (let i = index + 1; i < lines.length; i++) { if (classifyPlanLine(lines[i]) === 'header') { end = i - 1; break; } }
  return { start, end };
}
function movePlanLine(index, direction){
  const lines = (App.ui.planText || '').split('\n');
  if (classifyPlanLine(lines[index]) !== 'exercise') return; // only exercise lines are reorderable
  const { start, end } = findSectionBounds(lines, index);
  let j = index + direction;
  // Skip past blank lines AND plain description text — an exercise tile should only ever trade
  // places with another exercise tile, never end up straddling a line of prose.
  while (j >= start && j <= end && classifyPlanLine(lines[j]) !== 'exercise') j += direction;
  if (j < start || j > end) return; // would cross into another section — blocked, not just skipped
  const tmp = lines[index]; lines[index] = lines[j]; lines[j] = tmp;
  App.ui.planText = lines.join('\n');
  App.render();
}
// Editable view of the live plan — exercise lines get search + reorder/remove controls; headers
// are shown plainly (their literal markdown markers stripped for readability) with no controls of
// their own, since they disappear on their own once every exercise beneath them is gone.
// A compact, prominent summary shown before the detailed exercise list — what kind of session,
// how long, how many pieces — so the first thing you see reads like an app screen, not a form result.
function renderPlanHero(text, sessionTypes, minutes){
  const lines = (text||'').split('\n');
  let exerciseCount = 0, sectionCount = 0;
  lines.forEach(l => { const c = classifyPlanLine(l); if (c==='exercise') exerciseCount++; if (c==='header') sectionCount++; });
  const typeLabel = (sessionTypes && sessionTypes.length) ? sessionTypes.join(' + ') : 'Workout';
  return `<div class="plan-hero">
    <div class="plan-hero-type">${escHtml(typeLabel)}</div>
    <div class="plan-hero-stats">
      <span><b>${minutes}</b> min</span>
      <span class="plan-hero-dot">&middot;</span>
      <span><b>${sectionCount}</b> section${sectionCount===1?'':'s'}</span>
      <span class="plan-hero-dot">&middot;</span>
      <span><b>${exerciseCount}</b> exercise${exerciseCount===1?'':'s'}</span>
    </div>
  </div>`;
}
// Keyword-based section categorization, used to color-code exercise cards and section headers.
function categorizeHeader(headerText){
  const t = headerText.toLowerCase();
  if (/warm.?up|cool.?down/.test(t)) return 'warmup';
  if (/climb|boulder|route|drill/.test(t)) return 'climb';
  if (/\bcore\b/.test(t)) return 'core';
  if (/strength|power|antagonist|finger|forearm|wrist/.test(t)) return 'strength';
  if (/mobility|flexibility|stretch|cardio|fascia|roll/.test(t)) return 'mobility';
  if (/mental/.test(t)) return 'mental';
  return 'default';
}
// Pulls a trailing time mention ("— 10 min") off a header into its own badge chip.
function parseHeaderParts(clean){
  const m = clean.match(/^(.*?)[\s—–-]+(\d+\s*(?:min|minutes|sec|seconds))\s*$/i);
  return m ? { title: m[1].trim(), badge: m[2].trim() } : { title: clean, badge: null };
}
function renderPlanEditable(text){
  if (!text) return '';
  const lines = text.split('\n');
  let category = 'default';
  return lines.map((line, i) => {
    const cls = classifyPlanLine(line);
    if (cls === 'header') {
      const clean = line.replace(/^\s*#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
      category = categorizeHeader(clean);
      const { title, badge } = parseHeaderParts(clean);
      return `<div class="plan-section-header" style="border-left-color:var(--cat-${category})">
        <span class="plan-section-title">${escHtml(title)}</span>
        ${badge ? `<span class="plan-badge">${escHtml(badge)}</span>` : ''}
      </div>`;
    }
    if (cls !== 'exercise') {
      const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, '');
      return clean.trim() ? `<div class="plan-plain">${escHtml(clean)}</div>` : '';
    }
    const bulletMatch = line.match(/^(\s*(?:[-*•]|\d+[.)])\s+)(.*)$/);
    const body = bulletMatch[2].replace(/\*\*(.*?)\*\*/g, '$1');
    const sepMatch = body.match(/^(.*?)(:|—|–|,| - )([\s\S]*)$/);
    const namePart = (sepMatch ? sepMatch[1] : body).trim();
    const restPart = sepMatch ? sepMatch[2].replace(/^[:,]\s*|^ - /, '') + sepMatch[3] : '';
    const nameHtml = namePart ? escHtml(namePart) : escHtml(body);
    return `<div class="exercise-card" style="border-left-color:var(--cat-${category})">
      <div class="exercise-card-main">
        <div class="exercise-card-name">${namePart ? `<span class="ex-link" onclick="searchExercise('${escAttr(namePart)}')">${nameHtml}</span>` : nameHtml}</div>
        ${restPart.trim() ? `<div class="exercise-card-detail">${escHtml(restPart.trim())}</div>` : ''}
      </div>
      <div class="plan-line-controls">
        <button type="button" onclick="movePlanLine(${i},-1)" title="Move up">&uarr;</button>
        <button type="button" onclick="movePlanLine(${i},1)" title="Move down">&darr;</button>
        <button type="button" onclick="removePlanLine(${i})" title="Remove">&times;</button>
      </div>
    </div>`;
  }).join('');
}

App.render = function(){
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === App.ui.tab));
  const panel = document.getElementById('panels');
  if (App.ui.qOpen) { panel.innerHTML = renderQuestionnaire(); }
  else if (App.ui.tab === 'today') panel.innerHTML = renderToday();
  else if (App.ui.tab === 'log') panel.innerHTML = renderLog();
  else if (App.ui.tab === 'history') panel.innerHTML = renderHistory();
  else panel.innerHTML = renderSettings();
  document.getElementById('infoOverlay').innerHTML = App.ui.infoPopup
    ? `<div class="info-overlay" onclick="if(event.target===this) closeInfo()">
        <div class="info-popup"><button class="close-x" onclick="closeInfo()">&times;</button><p>${escHtml(App.ui.infoPopup)}</p></div>
      </div>`
    : '';
};
function infoIcon(text){ return `<button type="button" class="info-icon" onclick="event.stopPropagation(); showInfo('${escAttr(text)}')">i</button>`; }
function showInfo(text){ App.ui.infoPopup = text; App.render(); }
function closeInfo(){ App.ui.infoPopup = null; App.render(); }

// ---- Countdown timer for circuits — a fixed dial at the bottom of Today, keeps running across
// tabs (the interval doesn't care what's on screen), only the widget itself is Today-only.
const TIMER_PRESETS = [15, 30, 45, 60, 90];
function renderTimerWidget(){
  const t = App.ui.timer;
  const r = 22, circumference = 2 * Math.PI * r;
  const frac = t.totalSeconds > 0 ? t.remainingSeconds / t.totalSeconds : 0;
  const offset = circumference * (1 - frac);
  const mm = Math.floor(t.remainingSeconds / 60), ss = t.remainingSeconds % 60;
  const timeStr = `${mm}:${String(ss).padStart(2,'0')}`;
  return `<div class="timer-bar">
    <div class="timer-row">
      <button type="button" class="timer-dial-btn" onclick="toggleTimerPicker()" title="Choose time">
        <svg width="48" height="48" viewBox="0 0 48 48" style="flex:none;">
          <circle cx="24" cy="24" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
          <circle id="timerRing" cx="24" cy="24" r="${r}" fill="none" stroke="${t.remainingSeconds===0?'var(--red)':'var(--gold)'}" stroke-width="4"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 24 24)" style="transition:stroke-dashoffset 1s linear;"/>
          <text id="timerNum" x="24" y="28" text-anchor="middle" font-size="11.5" fill="var(--text)" font-family="'IBM Plex Sans',sans-serif">${timeStr}</text>
        </svg>
      </button>
      <button class="btn btn-primary" style="width:auto;padding:9px 16px;flex:none;" id="timerToggleBtn" onclick="toggleTimer()">${t.running ? 'Pause' : (t.remainingSeconds < t.totalSeconds && t.remainingSeconds > 0 ? 'Resume' : 'Start')}</button>
      <button class="btn btn-ghost" style="width:auto;padding:9px 12px;flex:none;" onclick="resetTimer()">Reset</button>
    </div>
    ${t.pickerOpen ? `<div class="timer-presets">
      ${TIMER_PRESETS.map(s=>`<button class="pill sm${t.totalSeconds===s?' active':''}" onclick="setTimerPreset(${s})">${s}s</button>`).join('')}
    </div>` : ''}
  </div>`;
}
function toggleTimerPicker(){ App.ui.timer.pickerOpen = !App.ui.timer.pickerOpen; App.render(); }
function setTimerPreset(seconds){
  pauseTimerInterval();
  App.ui.timer.totalSeconds = seconds;
  App.ui.timer.remainingSeconds = seconds;
  App.ui.timer.running = false;
  App.ui.timer.pickerOpen = false; // retract once a choice is made
  App.render();
}
function pauseTimerInterval(){
  if (App.ui.timer.intervalId) { clearInterval(App.ui.timer.intervalId); App.ui.timer.intervalId = null; }
}
function toggleTimer(){
  const t = App.ui.timer;
  if (t.running) { pauseTimerInterval(); t.running = false; App.render(); return; }
  if (t.remainingSeconds <= 0) { t.remainingSeconds = t.totalSeconds; }
  t.running = true;
  t.intervalId = setInterval(tickTimer, 1000);
  App.render();
}
function resetTimer(){
  pauseTimerInterval();
  App.ui.timer.remainingSeconds = App.ui.timer.totalSeconds;
  App.ui.timer.running = false;
  App.render();
}
function tickTimer(){
  const t = App.ui.timer;
  t.remainingSeconds = Math.max(0, t.remainingSeconds - 1);
  // Direct DOM update, not a full App.render() — avoids interrupting typing or an open popup
  // elsewhere, and the widget only exists in the DOM at all when Today is the active tab.
  const ring = document.getElementById('timerRing');
  const num = document.getElementById('timerNum');
  if (ring && num) {
    const r = 24, circumference = 2 * Math.PI * r;
    const frac = t.totalSeconds > 0 ? t.remainingSeconds / t.totalSeconds : 0;
    ring.setAttribute('stroke-dashoffset', circumference * (1 - frac));
    const mm = Math.floor(t.remainingSeconds / 60), ss = t.remainingSeconds % 60;
    num.textContent = `${mm}:${String(ss).padStart(2,'0')}`;
    if (t.remainingSeconds === 0) ring.setAttribute('stroke', 'var(--red)');
  }
  if (t.remainingSeconds === 0) {
    pauseTimerInterval();
    t.running = false;
    playTimerBeep();
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
    const btn = document.getElementById('timerToggleBtn');
    if (btn) btn.textContent = 'Start';
  }
}
function playTimerBeep(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(delay => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch(e) { /* audio not available — the vibration + visual change still happened */ }
}

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
    banners += `<div class="banner warn"><b>Pain still flagged:</b> ${escHtml(painStatus)} — from your most recent entry, sent with every plan request.
      <div style="margin-top:8px;"><button class="btn btn-ghost" style="width:auto;padding:8px 14px;" onclick="clearPainFlag()">Turn off — no pain today</button></div></div>`;
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
        <div class="small muted">Week ${cycle.weekOfPhase} of ${cycle.phaseLengthWeeks} &middot; ${App.settings.cycleType}</div></div>
    </div>
    <p class="small" style="margin-top:10px;">${escHtml(PHASE_GUIDANCE[cycle.phaseName] || '')}</p>
  </div>
  ${renderBriefingCard(App.entries)}
  ${banners}
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin-bottom:0;">Ask for today's plan</h2>
      ${App.lastPlan ? `<button class="btn btn-ghost" style="width:auto;padding:6px 12px;" onclick="showLastPlan()">See most recent workout</button>` : ''}
    </div>
    ${App.lastPlan ? `<p class="small muted" style="margin:8px 0 0;">Last generated ${new Date(App.lastPlan.generatedAt).toLocaleString()}${App.lastPlan.sessionTypes.length ? ' — ' + App.lastPlan.sessionTypes.join(', ') : ''}.</p>` : ''}
    <div class="field" style="margin-top:14px;"><label>Minutes available: <b id="slider_askMinutes_val">${d.minutes}</b> min</label>
      <input type="range" min="10" max="180" step="5" value="${d.minutes}"
        oninput="App.ui.askDraft.minutes=Number(this.value); document.getElementById('slider_askMinutes_val').textContent=this.value;">
    </div>
    <div class="field"><label>How you're feeling</label>
      ${pillsHTML(FEELING_SCALE.map(f=>String(f.v)), String(d.feeling), 'setAskFeeling')}
      <div class="scale-caption" style="margin-top:2px;"><span>1 = flat</span><span>5 = dialed</span></div>
    </div>
    <div class="field"><label>Session type(s) wanted</label>
      ${pillsHTML(SESSION_TYPE_OPTIONS, d.sessionTypes, 'toggleAskType')}
    </div>
    ${(d.sessionTypes.includes('Flexibility / Stretch') || d.sessionTypes.includes('Mobility')) ? `
    <div class="field"><label>Focus area (optional)</label>
      ${pillsHTML(MOBILITY_FOCUS_OPTIONS, d.mobilityFocus, 'toggleMobilityFocus', {sm:true})}
    </div>` : ''}
    ${(d.sessionTypes.includes('Strength') || d.sessionTypes.includes('Antagonist / Stabilizer') || d.sessionTypes.includes('Core Workout')) ? `
    <div class="field"><label>Routine (optional)</label>
      ${pillsHTML(['Coach\'s choice'].concat(STRENGTH_LIKE_STYLES), d.routineStyle || 'Coach\'s choice', 'setRoutineStyle', {sm:true})}
    </div>` : ''}
    ${d.sessionTypes.includes('Fingers') ? `
    <div class="field"><label>Fingers routine (optional)</label>
      ${pillsHTML(FINGERS_ROUTINE_OPTIONS, d.routineStyle || "Coach's choice", 'setRoutineStyle', {sm:true})}
    </div>` : ''}
    ${d.sessionTypes.includes('Climbing') ? `
    <div class="field"><label>Climbing portion</label>
      ${pillsHTML(['Just play/climb', 'Give me a drill'], d.sessionStyle==='drill' ? 'Give me a drill' : 'Just play/climb', 'setSessionStyle', {sm:true})}
      ${d.sessionStyle==='drill' ? `<div style="margin-top:8px;">
        ${pillsHTML(['Technique','Fingers','Power','Power-Endurance','Endurance','Strength','Core','Legs','Injury Prevention','Mobility'], d.drillCategory, 'setDrillCategory', {sm:true})}
        <p class="small muted" style="margin-top:6px;">${infoIcon("Optional: narrow it down. I'll name a specific drill from Training for Climbing or Climb to Fitness so you can look it up in your copy.")} What's this?</p>
      </div>` : ''}
      <div style="margin-top:8px;">
        ${pillsHTML(['Make this mental-focused'], d.mentalFocus ? 'Make this mental-focused' : '', 'toggleMentalFocus', {sm:true})}
      </div>
    </div>` : ''}
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
    ${App.ui.planText ? `${renderPlanHero(App.ui.planText, d.sessionTypes, d.minutes)}
    ${renderTimerWidget()}
    <div class="plan-editable">${renderPlanEditable(App.ui.planText)}</div>
    <p class="small muted" style="margin-top:6px;">Tap a name to search it, use the arrows to reorder, &times; to drop it. ${infoIcon("Removing every exercise under a heading also removes the heading. All the export/share/save options below use whatever's currently shown here.")}</p>
    <div class="pillrow" style="margin-top:10px;">
      <button class="btn btn-ghost" style="width:auto;padding:8px 12px;" onclick="sharePlan()">Share / copy text</button>
      <button class="btn btn-ghost" style="width:auto;padding:8px 12px;" onclick="openPlanAsPage()">Open as page (tap-to-search)</button>
      <button class="btn btn-ghost" style="width:auto;padding:8px 12px;" onclick="savePlanAsImage()">Save as image</button>
      <button class="btn btn-ghost" style="width:auto;padding:8px 12px;" onclick="App.ui.showAdherence = !App.ui.showAdherence; App.render();">Add this to today's log</button>
    </div>
    <p class="small muted" style="margin-top:6px;">Export options ${infoIcon('Share / copy text is the fastest way into Notes, Messages, email, anywhere — on iPhone it opens the share sheet; elsewhere it copies to your clipboard. Tap any exercise name above to search it. Heads up: the image export is a flat picture — links only work in Open as page.')}</p>
    ${App.ui.showAdherence ? `<div class="field" style="margin-top:10px;">
      <label>If you already did it (or partly did it) — how close did you end up sticking to this?</label>
      ${pillsHTML(ADHERENCE_OPTIONS, App.ui.planAdherencePick, 'setPlanAdherence', {sm:true})}
      <button class="btn btn-secondary" style="margin-top:8px;" onclick="saveGeneratedPlanToLog()" ${(App.ui.planAdherencePick && !App.ui.importLoading) ? '' : 'disabled'}>${App.ui.importLoading ? 'Reading the plan…' : "Save to today's entry"}</button>
      
      ${App.ui.importError ? `<p class="small" style="color:var(--red);margin-top:6px;">${escHtml(App.ui.importError)}</p>` : ''}
    </div>` : ''}
    <div class="field" style="margin-top:12px;">
      <label>Want to adjust this?</label>
      <textarea placeholder="e.g. swap the finger work for more core, I only actually have 30 min, less bouldering today..." oninput="App.ui.planFeedback=this.value; document.getElementById('regenBtn').disabled = !this.value.trim();">${escHtml(App.ui.planFeedback)}</textarea>
      <button id="regenBtn" class="btn btn-secondary" style="margin-top:8px;" onclick="askClaude(App.ui.planFeedback)" ${App.ui.planLoading || !App.ui.planFeedback.trim() ? 'disabled' : ''}>${App.ui.planLoading ? 'Thinking…' : 'Regenerate with this feedback'}</button>
    </div>` : ''}
  </div>`;
}

function sliderRow(label, field, value, max){
  max = max || 120;
  const id = 'slider_' + field;
  return `<div class="field"><label>${label}: <b id="${id}_val">${value}</b> min</label>
    <input type="range" min="0" max="${max}" step="5" value="${value}"
      oninput="App.ui.logDraft.${field}=Number(this.value); document.getElementById('${id}_val').textContent=this.value;">
  </div>`;
}

function renderLog(){
  const d = App.ui.logDraft;
  const isClimbing = d.type === 'Climbing';
  const isRest = d.type === 'Rest';
  const isStrengthLike = d.type === 'Strength' || d.type === 'Antagonist / Stabilizer';
  const isCore = d.type === 'Core Workout';
  const editing = !!App.ui.editingId;
  return `
  ${!editing ? `<div class="card">
    <h2>Import from a file${infoIcon("Upload a text file (notes from elsewhere, an export, whatever you've got) and Claude will read it and fill in the form below — you review and adjust before saving, nothing saves automatically.")}</h2>
    <input type="file" id="importWorkoutFile" accept=".txt,.md,.csv,text/plain" onchange="importWorkoutFile(this.files[0])">
    ${App.ui.importLoading ? `<p class="small muted" style="margin-top:8px;">Reading it…</p>` : ''}
    ${App.ui.importError ? `<p class="small" style="color:var(--red);margin-top:8px;">${escHtml(App.ui.importError)}</p>` : ''}
  </div>` : ''}
  <div class="card">
    ${editing ? `<div class="banner info">Editing an existing entry. <button class="btn btn-ghost" style="width:auto;padding:6px 12px;margin-left:8px;" onclick="cancelEdit()">Cancel edit</button></div>` : ''}
    <h2>${editing ? 'Edit entry' : 'Log a session'}</h2>
    <div class="row2">
      <div class="field"><label>Date</label><input type="date" value="${d.date}" oninput="App.ui.logDraft.date=this.value"></div>
      <div class="field"><label>Type</label>
        <select onchange="setLogType(this.value)">
          ${SESSION_TYPE_OPTIONS.concat(['Rest']).map(t=>`<option value="${t}" ${d.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field"><label>How'd it go (1 = flat, 5 = dialed)</label>${pillsHTML(FEELING_SCALE.map(f=>String(f.v)), String(d.feeling), 'setLogFeeling')}</div>
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
    ` : isRest ? '' : `
    ${isStrengthLike ? `
    <div class="field"><label>Muscle group</label>${pillsHTML(MUSCLE_GROUPS, d.muscleGroup, 'toggleMuscleGroup', {sm:true})}</div>
    <div class="field"><label>Power level</label>${pillsHTML(POWER_LEVELS, d.powerLevel, 'setPowerLevel', {sm:true})}</div>
    ` : ''}
    ${isCore ? `
    <div class="field"><label>Region</label>${pillsHTML(CORE_REGIONS, d.coreRegion, 'toggleCoreRegion', {sm:true})}</div>
    <div class="field"><label>Movement type</label>${pillsHTML(CORE_MOVEMENT_TYPES, d.coreMovementType, 'toggleCoreMovementType', {sm:true})}</div>
    ` : ''}
    <div class="field"><label>Named routine (optional)</label>${pillsHTML(TYPE_RELEVANT_STYLES[d.type] || WORKOUT_STYLES, d.workoutStyles, 'toggleLogWorkoutStyle', {sm:true})}</div>
    ${d.workoutStyles.length ? `
    <div class="field"><label>Specific exercises (optional)</label>
      ${d.workoutStyles.map(style => `<div class="small muted" style="margin:8px 0 4px;">${escHtml(style)}</div>${pillsHTML(EXERCISE_LIBRARY[style]||[], d.exercisesDone, 'toggleLogExercise', {sm:true})}`).join('')}
    </div>` : ''}
    `}
    <h3>Time spent${infoIcon("Total time for the entry is just the sum of these — no separate total to keep in sync. Log stretching, mobility, or antagonist work as their own entry on the same date if you did them separately; the app combines same-day entries into one day, it won't count as extra days.")}</h3>
    ${isClimbing ? sliderRow('Climbing', 'timeClimb', d.timeClimb, 180) : ''}
    ${sliderRow('Finger strength', 'timeFingers', d.timeFingers)}
    ${sliderRow('Strength', 'timeStrength', d.timeStrength)}
    ${sliderRow('Antagonist/stabilizer', 'timeAntag', d.timeAntag)}
    ${sliderRow('Core', 'timeCore', d.timeCore)}
    ${sliderRow('Flexibility', 'timeFlexibility', d.timeFlexibility)}
    ${sliderRow('Mobility', 'timeMobility', d.timeMobility)}
    ${sliderRow('Cardio', 'timeCardio', d.timeCardio)}
    ${isClimbing ? `
    <div class="field"><label>What broke down</label>
      ${pillsHTML(FAILURE_POINT_OPTIONS, d.failurePoints, 'toggleLogFailurePoint', {sm:true})}
      <textarea style="margin-top:8px;" placeholder="Any detail worth adding..." oninput="App.ui.logDraft.failurePointsOther=this.value">${escHtml(d.failurePointsOther)}</textarea>
    </div>` : ''}
    <div class="field"><label>Pain or discomfort</label>${pillsHTML(PAIN_OPTIONS, d.pain, 'setLogPain', {sm:true})}</div>
    <div class="field"><label>Notes</label>
      <textarea placeholder="Anything else worth remembering..." oninput="App.ui.logDraft.notes=this.value">${escHtml(d.notes)}</textarea>
    </div>
    <button class="btn btn-primary" onclick="submitLog()">${editing ? 'Save changes' : 'Save entry'}</button>
  </div>`;
}

function renderHistory(){
  const entries = [...App.entries].sort((a,b)=> b.date.localeCompare(a.date));
  if (entries.length === 0) {
    return `<div class="card"><p class="muted small">No entries yet. Log a session on the Log tab to start stacking your history.</p></div>`;
  }
  const days = dayList(entries); // one record per calendar day, entries already combined
  const climbDayCount = days.filter(d => classifyDay(d)==='Climb').length;
  const sinceAssessment = climbingSessionsSinceLastAssessment();

  // last 12 weeks heatmap — keyed by day-aggregate so a 3-entry day still shows as one cell
  const map = {}; days.forEach(d => { map[d.date] = d; });
  const cal = [];
  const today = new Date(todayISO()+'T00:00:00');
  for (let i=83;i>=0;i--){ const dd=new Date(today); dd.setDate(dd.getDate()-i); const iso=toLocalISO(dd); cal.push({date:iso, d:map[iso]||null}); }
  const weeks = []; for (let i=0;i<cal.length;i+=7) weeks.push(cal.slice(i,i+7));
  const maxDur = Math.max(1, ...days.map(d=>d.totalMinutes));
  const heat = weeks.map(w => `<div class="heatcol">${w.map(cell=>{
    const inten = cell.d ? Math.max(.18, cell.d.totalMinutes/maxDur) : 0;
    return `<div class="heatcell" title="${cell.date}${cell.d?' — '+cell.d.totalMinutes+'min':''}" style="background:${cell.d?`rgba(${themeGoldRGB()},${inten})`:'var(--surface2)'}"></div>`;
  }).join('')}</div>`).join('');

  // minutes, last 14 calendar days (one bar per day, combined)
  const last14 = days.slice(0,14).reverse();
  const maxMin14 = Math.max(1, ...last14.map(d=>d.totalMinutes));
  const minBars = last14.map(d => `<div class="bar-row"><div class="bar-label">${d.date.slice(5)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${d.totalMinutes/maxMin14*100}%"></div></div>
    <div class="bar-val">${d.totalMinutes}</div></div>`).join('');

  // focus area frequency (by day, so a focus worked 3x same day still counts once)
  const counts = {}; FOCUS_AREAS.forEach(a=>counts[a]=0);
  days.forEach(d => d.focus.forEach(a=>{counts[a]=(counts[a]||0)+1;}));
  const maxCount = Math.max(1, ...Object.values(counts));
  const focusBars = FOCUS_AREAS.map(a => `<div class="bar-row"><div class="bar-label">${a}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${counts[a]/maxCount*100}%"></div></div>
    <div class="bar-val">${counts[a]}</div></div>`).join('');

  // weekly balance radar + template comparison
  const radarData = computeWeeklyRadarData(entries);
  const tmpl = compareToWeeklyTemplate(entries);
  const tmplRow = tmpl.rows.map(r => {
    const mismatch = !r.isFuture && r.actual !== r.template && r.actual !== 'No entry';
    return `<div class="bar-row" style="align-items:center;opacity:${r.isFuture?0.45:1};">
      <div class="bar-label" style="width:36px;flex:none;">${r.day}</div>
      <div style="flex:1;font-size:13px;${mismatch?'color:var(--red);':''}">${r.isFuture ? '—' : escHtml(r.actual)} <span class="small muted">(usually ${r.template})</span></div>
    </div>`;
  }).join('');
  const guidelines = computeWeeklyGuidelines(entries);
  const guidelineRows = guidelines.map(g => `<div class="bar-row" style="align-items:flex-start;">
      <div style="width:20px;flex:none;color:${g.ok?'var(--teal)':'var(--muted)'};font-weight:700;">${g.ok?'✓':'—'}</div>
      <div style="flex:1;"><div class="small">${escHtml(g.label)}</div><div class="small muted">${escHtml(g.detail)}</div></div>
    </div>`).join('');

  const entryRows = entries.map(e => `
    <div class="entry">
      <button class="entry-head" onclick="toggleEntry('${e.id}')">
        <span><b>${e.date}</b> &nbsp;<span class="muted">${e.type}${e.type==='Climbing' ? ' · '+e.duration+'min · feeling '+e.feeling+'/5' : ' · '+e.duration+'min'}</span></span>
        <span>${App.ui.expandedEntry===e.id?'▲':'▼'}</span>
      </button>
      ${App.ui.expandedEntry===e.id ? `<div class="entry-body">
        ${e.intensity?`<p><b>Intensity:</b> ${e.intensity}</p>`:''}
        ${arr(e.dayTypes).length?`<p><b>Day type:</b> ${arr(e.dayTypes).join(', ')}</p>`:''}
        ${(e.climbs&&e.climbs.length)?`<p><b>Climbs:</b> ${e.climbs.map(c=>c.grade+' ×'+c.count+(c.location?' ('+c.location+')':'')).join(', ')}</p>`:''}
        ${arr(e.focus).length?`<p><b>Focus:</b> ${arr(e.focus).join(', ')}</p>`:''}
        ${arr(e.wallAngle).length?`<p><b>Wall angle:</b> ${arr(e.wallAngle).join(', ')}</p>`:''}
        ${arr(e.holdTypes).length?`<p><b>Holds:</b> ${arr(e.holdTypes).join(', ')}</p>`:''}
        ${arr(e.workoutStyles).length?`<p><b>Workout style:</b> ${arr(e.workoutStyles).join(', ')}</p>`:''}
        ${arr(e.exercisesDone).length?`<p><b>Exercises done:</b> ${arr(e.exercisesDone).join(', ')}</p>`:''}
        ${arr(e.failurePoints).length?`<p><b>Broke down on:</b> ${arr(e.failurePoints).join(', ')}</p>`:''}
        ${e.failurePointsOther?`<p><b>Detail:</b> ${escHtml(e.failurePointsOther)}</p>`:''}
        ${e.pain&&e.pain!=='None'?`<p style="color:var(--red)"><b>Pain:</b> ${e.pain}</p>`:''}
        ${e.notes?`<p><b>Notes:</b> ${escHtml(e.notes)}</p>`:''}
        ${e.plan?`<p style="margin-bottom:4px;"><b>Planned workout:</b>${e.planAdherence?' <span class="muted small">('+escHtml(e.planAdherence)+')</span>':''}</p><div class="plan-box" style="margin-top:0;">${renderPlanWithSearchLinks(e.plan)}</div>`:''}
        <div class="pillrow" style="margin-top:8px;">
          <button class="btn btn-ghost" style="width:auto;padding:8px 14px;" onclick="editEntry('${e.id}')">Edit this entry</button>
          <button class="btn btn-ghost" style="width:auto;padding:8px 14px;color:var(--red);border-color:var(--red);" onclick="deleteEntry('${e.id}')">Delete this entry</button>
        </div>
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
      <div class="stat"><div class="num">${days.length}</div><div class="lbl">Days logged</div></div>
      <div class="stat"><div class="num">${climbDayCount}</div><div class="lbl">Climbing days</div></div>
      <div class="stat"><div class="num">${sinceAssessment}</div><div class="lbl">Since check-in</div></div>
    </div>
  </div>
  <div class="card">
    <h2>Weekly balance${infoIcon('Trailing 7 days vs. rough weekly targets. Dashed ring = target; gold = you.')}</h2>
    <div style="display:flex;justify-content:center;">${renderRadarSVG(radarData)}</div>
  </div>
  <div class="card">
    <h2>Your weekly guidelines${infoIcon("These are things to touch base on, not requirements — a check mark just means it's happened this week; a dash isn't a failure, especially on a full week.")}</h2>
    <div class="barlist">${guidelineRows}</div>
  </div>
  <div class="card">
    <h2>This week vs. your usual rhythm${infoIcon('Reference rhythm: Mon rest, Tue climb, Wed exercise, Thu climb, Fri rest, Sat/Sun climb.')}</h2>
    <div class="barlist">${tmplRow}</div>
    ${tmpl.notes.length ? `<p class="small" style="margin-top:10px;color:var(--red);">${tmpl.notes.join(' ')}</p>` : `<p class="small muted" style="margin-top:10px;">Tracking the usual rhythm so far this week.</p>`}
  </div>
  <div class="card"><h2>Last 12 weeks</h2><div class="heatgrid">${heat}</div></div>
  <div class="card"><h2>Minutes, last 14 days</h2><div class="barlist">${minBars}</div></div>
  <div class="card"><h2>Focus area attention</h2><div class="barlist">${focusBars}</div></div>
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
    <h2>Display</h2>
    <div class="field"><label>Theme</label>
      ${pillsHTML(['Light','Dark'], s.theme.charAt(0).toUpperCase()+s.theme.slice(1), 'setTheme', {sm:true})}
    </div>
    <div class="field"><label>Text size</label>
      ${pillsHTML(['Small','Medium','Large'], s.fontSize.charAt(0).toUpperCase()+s.fontSize.slice(1), 'setFontSize', {sm:true})}
    </div>
  </div>
  <div class="card">
    <h2>Jump to a phase/week${infoIcon('For an unplanned taper/project week, a missed week, or jumping partway into any phase — this resets the cycle math so today lands exactly where you say.')}</h2>
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
    <h2>Export / import your data${infoIcon("Export downloads a JSON file of your entries and check-ins (API key excluded). Import reads one back in and merges it with what's already here — nothing gets overwritten, so it's safe to import an old backup after switching phones.")}</h2>
    <button class="btn btn-ghost" onclick="exportData()">Export data (.json)</button>
    <input type="file" id="importFile" accept="application/json" style="margin-top:8px;" onchange="importData(this.files[0])">
  </div>
  <div class="card">
    <h2>Anthropic API key${infoIcon("Stored only in this browser's local storage. Never written into this app's code, never sent anywhere but Anthropic's API.")}</h2>
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
    <p class="small muted">${answered}/${QUESTIONS.length} answered. ${infoIcon('0 = almost always happens, 5 = never happens. Answer honestly, not aspirationally.')}</p>
    ${items}
    <button class="btn btn-primary" onclick="submitAssessment()" ${answered<QUESTIONS.length?'disabled':''}>Submit (${answered}/${QUESTIONS.length})</button>
  </div>`;
}

// ---- Event handlers (called from inline onclick in templates) ----
function setAskFeeling(v){ App.ui.askDraft.feeling = Number(v); App.render(); }
function toggleAskType(t){ const arr = App.ui.askDraft.sessionTypes; const i = arr.indexOf(t);
  if (i>-1) arr.splice(i,1); else arr.push(t); App.ui.askDraft.routineStyle = ''; App.render(); }
function toggleMobilityFocus(a){ toggleArr(App.ui.askDraft.mobilityFocus, a); App.render(); }
function setRoutineStyle(v){ App.ui.askDraft.routineStyle = (v === 'Coach\'s choice') ? '' : v; App.render(); }
function setFocusMode(label){
  App.ui.askDraft.focusMode = label.indexOf('weak')>-1 ? 'weak' : label.indexOf('Pick')>-1 ? 'pick' : 'other';
  App.render();
}
function setFocusPick(area){ App.ui.askDraft.focusPick = area; App.render(); }
function setFocusSecondary(area){
  App.ui.askDraft.focusSecondary = App.ui.askDraft.focusSecondary === area ? '' : area;
  App.render();
}
function setSessionStyle(v){ App.ui.askDraft.sessionStyle = v==='Give me a drill' ? 'drill' : 'play'; App.render(); }
function setDrillCategory(c){ App.ui.askDraft.drillCategory = App.ui.askDraft.drillCategory === c ? '' : c; App.render(); }
function toggleMentalFocus(){ App.ui.askDraft.mentalFocus = !App.ui.askDraft.mentalFocus; App.render(); }

function setLogFeeling(v){ App.ui.logDraft.feeling = Number(v); App.render(); }
function setLogIntensity(v){ App.ui.logDraft.intensity = v; App.render(); }
function setLogPain(v){ App.ui.logDraft.pain = v; App.render(); }
function setLogType(t){
  App.ui.logDraft.type = t;
  // Reset every time, not just when empty — otherwise a style/tag picked for a previous type
  // choice sticks around invisibly once the picker filters to the new type's relevant list.
  App.ui.logDraft.workoutStyles = TYPE_TO_WORKOUT_STYLE[t] ? [TYPE_TO_WORKOUT_STYLE[t]] : [];
  App.ui.logDraft.exercisesDone = [];
  App.ui.logDraft.muscleGroup = []; App.ui.logDraft.powerLevel = '';
  App.ui.logDraft.coreRegion = []; App.ui.logDraft.coreMovementType = [];
  App.render();
}
function toggleLogFocus(a){ toggleArr(App.ui.logDraft.focus, a); App.render(); }
function toggleLogWall(a){ toggleArr(App.ui.logDraft.wallAngle, a); App.render(); }
function toggleLogHold(a){ toggleArr(App.ui.logDraft.holdTypes, a); App.render(); }
function toggleLogDayType(a){ toggleArr(App.ui.logDraft.dayTypes, a); App.render(); }
function toggleLogFailurePoint(a){ toggleArr(App.ui.logDraft.failurePoints, a); App.render(); }
function toggleLogWorkoutStyle(a){ toggleArr(App.ui.logDraft.workoutStyles, a); App.render(); }
function toggleLogExercise(a){ toggleArr(App.ui.logDraft.exercisesDone, a); App.render(); }
function toggleMuscleGroup(a){ toggleArr(App.ui.logDraft.muscleGroup, a); App.render(); }
function setPowerLevel(v){ App.ui.logDraft.powerLevel = v; App.render(); }
function toggleCoreRegion(a){ toggleArr(App.ui.logDraft.coreRegion, a); App.render(); }
function toggleCoreMovementType(a){ toggleArr(App.ui.logDraft.coreMovementType, a); App.render(); }
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


const TYPE_TO_TIME_FIELD = {
  'Antagonist / Stabilizer': 'timeAntag', 'Flexibility / Stretch': 'timeFlexibility', 'Mobility': 'timeMobility',
  'Strength': 'timeStrength', 'Cardio': 'timeCardio', 'Core Workout': 'timeCore', 'Fingers': 'timeFingers',
};
const TYPE_TO_WORKOUT_STYLE = { 'Core Workout': 'Core Circuit', 'Fingers': 'Fingers' };
function editEntry(id){
  const e = App.entries.find(x => x.id === id);
  if (!e) return;
  App.ui.logDraft = Object.assign(freshLogDraft(), JSON.parse(JSON.stringify(e)));
  // Older entries may have some of these as free-text strings from before they were tag arrays —
  // normalize on the way into the editable draft so every downstream handler can assume an array.
  ['dayTypes','focus','wallAngle','holdTypes','workoutStyles','exercisesDone','muscleGroup','coreRegion','coreMovementType','failurePoints']
    .forEach(f => { App.ui.logDraft[f] = arr(App.ui.logDraft[f]); });
  App.ui.climbsDraft = arr(e.climbs).slice();
  App.ui.editingId = id;
  App.setTab('log');
}
function deleteEntry(id){
  const e = App.entries.find(x => x.id === id);
  if (!e) return;
  if (!window.confirm(`Delete the ${e.date} entry (${e.type})? This can't be undone here — export your data first if you want a backup.`)) return;
  App.entries = App.entries.filter(x => x.id !== id);
  App.saveEntries();
  App.ui.expandedEntry = null;
  App.toast('Entry deleted');
  App.render();
}
function cancelEdit(){
  App.ui.editingId = null;
  App.ui.logDraft = freshLogDraft();
  App.ui.climbsDraft = [];
  App.render();
}
const TIME_FIELDS = ['timeClimb','timeFingers','timeStrength','timeAntag','timeCore','timeFlexibility','timeMobility','timeCardio'];
function submitLog(){
  const d = App.ui.logDraft;
  const entry = Object.assign({}, d, { id: App.ui.editingId || uid(), climbs: App.ui.climbsDraft.slice() });
  if (entry.type !== 'Climbing') {
    // These fields are hidden from the form for non-climbing entries, but freshLogDraft() still
    // carries default values for them — zero/clear them explicitly so stale defaults never leak
    // into day-aggregation for a day that had no actual climbing on it.
    entry.timeClimb = 0; entry.intensity = ''; entry.dayTypes = []; entry.focus = [];
    entry.wallAngle = []; entry.holdTypes = []; entry.failurePoints = []; entry.failurePointsOther = ''; entry.climbs = [];
  }
  if (entry.type !== 'Strength' && entry.type !== 'Antagonist / Stabilizer') { entry.muscleGroup = []; entry.powerLevel = ''; }
  if (entry.type !== 'Core Workout') { entry.coreRegion = []; entry.coreMovementType = []; }
  // Duration is never typed in separately — it's always the sum of the actual time-spent sliders.
  // (The old design had a standalone Duration field that could silently drift out of sync with
  // the sliders — that mismatch was the root cause of mobility minutes not showing up correctly.)
  entry.duration = TIME_FIELDS.reduce((sum, f) => sum + (Number(entry[f]) || 0), 0);

  if (App.ui.editingId) {
    // Editing an existing entry (e.g. fixing a mis-entered date) — replace by id.
    App.entries = App.entries.map(e => e.id === App.ui.editingId ? entry : e).sort((a,b)=> a.date.localeCompare(b.date));
    App.toast('Entry updated');
  } else {
    // Always add as a new entry — never dedupe by date+type. A second mobility session on the
    // same day is a real second session, not a correction of the first; day-aggregation already
    // sums across every entry for a date correctly, so there's nothing to protect against here.
    App.entries = App.entries.concat([entry]).sort((a,b)=> a.date.localeCompare(b.date));
    App.toast('Saved to your log');
  }
  App.saveEntries();
  App.ui.logDraft = freshLogDraft();
  App.ui.climbsDraft = [];
  App.ui.climbLocationDraft = 'Indoor';
  App.ui.editingId = null;
  App.setTab('history');
}

function toggleEntry(id){ App.ui.expandedEntry = App.ui.expandedEntry === id ? null : id; App.render(); }

function setCycleType(t){ App.settings.cycleType = t; App.render(); }
function setFontSize(v){ App.settings.fontSize = v.toLowerCase(); App.applyFontSize(); App.saveSettings(); App.render(); }
function setTheme(v){ App.settings.theme = v.toLowerCase(); App.applyTheme(); App.saveSettings(); App.render(); }
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
window.showInfo = showInfo; window.closeInfo = closeInfo;
window.setTimerPreset = setTimerPreset; window.toggleTimer = toggleTimer; window.resetTimer = resetTimer;
window.toggleTimerPicker = toggleTimerPicker;
window.removePlanLine = removePlanLine; window.movePlanLine = movePlanLine;
window.DRILL_LIBRARY = DRILL_LIBRARY; window.SESSION_TYPE_OPTIONS = SESSION_TYPE_OPTIONS;
window.EXERCISE_LIBRARY = EXERCISE_LIBRARY; window.WORKOUT_STYLES = WORKOUT_STYLES;
window.FOCUS_AREAS = FOCUS_AREAS; window.ADHERENCE_OPTIONS = ADHERENCE_OPTIONS;
window.setAskFeeling = setAskFeeling; window.toggleAskType = toggleAskType;
window.setFocusMode = setFocusMode; window.setFocusPick = setFocusPick; window.setFocusSecondary = setFocusSecondary;
window.setLogFeeling = setLogFeeling; window.setLogIntensity = setLogIntensity; window.setLogPain = setLogPain;
window.toggleLogFocus = toggleLogFocus; window.toggleLogWall = toggleLogWall; window.toggleLogHold = toggleLogHold;
window.toggleLogDayType = toggleLogDayType; window.toggleLogFailurePoint = toggleLogFailurePoint;
window.setClimbLocation = setClimbLocation;
window.addClimbRow = addClimbRow; window.removeClimbRow = removeClimbRow; window.submitLog = submitLog;
window.toggleEntry = toggleEntry; window.setCycleType = setCycleType; window.saveSettingsForm = saveSettingsForm;
window.setFontSize = setFontSize;
window.setTheme = setTheme;
window.openQuestionnaire = openQuestionnaire; window.closeQuestionnaire = closeQuestionnaire;
window.setQAnswer = setQAnswer; window.submitAssessment = submitAssessment; window.askClaude = askClaude;
window.applyPhaseOverride = applyPhaseOverride; window.exportData = exportData; window.importData = importData;
window.clearPainFlag = clearPainFlag; window.editEntry = editEntry; window.cancelEdit = cancelEdit;
window.toggleLogWorkoutStyle = toggleLogWorkoutStyle; window.toggleLogExercise = toggleLogExercise;
window.deleteEntry = deleteEntry; window.openPlanAsPage = openPlanAsPage; window.savePlanAsImage = savePlanAsImage;
window.saveGeneratedPlanToLog = saveGeneratedPlanToLog; window.searchExercise = searchExercise; window.setPlanAdherence = setPlanAdherence;
window.showLastPlan = showLastPlan;
window.setSessionStyle = setSessionStyle; window.setDrillCategory = setDrillCategory; window.setLogType = setLogType;
window.toggleMentalFocus = toggleMentalFocus;
window.sharePlan = sharePlan; window.toggleMobilityFocus = toggleMobilityFocus; window.toLocalISO = toLocalISO;
window.setRoutineStyle = setRoutineStyle;
window.importWorkoutFile = importWorkoutFile;
