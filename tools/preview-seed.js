/* Preview-only sample data. Loaded before app.js by tools/make-preview.py and never part of the app
   itself. Only seeds when the preview's localStorage is empty, so changes made while reviewing stay. */
(function () {
  try {
    if (localStorage.getItem('t4c_entries')) return;
  } catch (e) { return; }

  function iso(daysAgo) {
    var d = new Date(); d.setDate(d.getDate() - daysAgo);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function entry(id, daysAgo, type, fields) {
    var base = {
      id: id, date: iso(daysAgo), type: type, duration: 0, feeling: 3, intensity: '',
      dayTypes: [], dayTypesOther: '', focus: [], wallAngle: [], holdTypes: [],
      timeClimb: 0, timeFingers: 0, timeStrength: 0, timeAntag: 0, timeCore: 0, timeFlexibility: 0, timeMobility: 0, timeCardio: 0,
      workoutStyles: [], exercisesDone: [], muscleGroup: [], powerLevel: '', coreRegion: [], coreMovementType: [],
      failurePoints: [], failurePointsOther: '', pain: 'None', notes: '', plan: '', planAdherence: '', climbs: []
    };
    var e = Object.assign(base, fields);
    e.duration = ['timeClimb','timeFingers','timeStrength','timeAntag','timeCore','timeFlexibility','timeMobility','timeCardio']
      .reduce(function (s, k) { return s + (Number(e[k]) || 0); }, 0);
    return e;
  }

  var entries = [
    entry('s1', 13, 'Climbing', { timeClimb: 105, intensity: 'Moderate', feeling: 4, dayTypes: ['Indoor','Bouldering'], focus: ['High feet'],
      climbs: [{grade:'V4', count:5, location:'Indoor'}, {grade:'V5', count:2, location:'Indoor'}] }),
    entry('s2', 11, 'Antagonist / Stabilizer', { timeAntag: 35, feeling: 3, muscleGroup: ['Upper body push'], powerLevel: 'Stability/control' }),
    entry('s3', 10, 'Climbing', { timeClimb: 90, intensity: 'Hard', feeling: 3, dayTypes: ['Indoor','Sport/Rope'], focus: ['Overhangs'],
      climbs: [{grade:'5.10b', count:3, location:'Indoor'}, {grade:'5.10c', count:2, location:'Indoor'}],
      failurePoints: ['Got pumped'], notes: 'Pumped out on the steep lap, rested too little between.' }),
    entry('s4', 8, 'Fingers', { timeFingers: 25, feeling: 4, workoutStyles: ['Fingers'], exercisesDone: ['Hangboard repeaters'] }),
    entry('s5', 7, 'Climbing', { timeClimb: 120, intensity: 'Moderate', feeling: 5, dayTypes: ['Outdoor','Bouldering','Fun/Social'], focus: ['Small holds'],
      climbs: [{grade:'V3', count:6, location:'Outdoor'}] }),
    entry('s6', 5, 'Core Workout', { timeCore: 20, timeMobility: 10, feeling: 3, workoutStyles: ['Core Circuit'], coreRegion: ['Obliques','Lower abs'], coreMovementType: ['Static/isometric'] }),
    entry('s7', 4, 'Climbing', { timeClimb: 80, intensity: 'Hard', feeling: 4, dayTypes: ['Indoor','Bouldering','Power'], focus: ['Bouldery pulling'],
      climbs: [{grade:'V5', count:3, location:'Indoor'}], failurePoints: ['Footwork broke down'] }),
    entry('s8', 2, 'Fingers', { timeFingers: 20, timeAntag: 15, feeling: 4, workoutStyles: ['Fingers'] }),
    entry('s9', 1, 'Climbing', { timeClimb: 95, intensity: 'Moderate', feeling: 4, dayTypes: ['Indoor','Skills/Technique'], focus: ['High feet','Hips to wall'],
      climbs: [{grade:'V4', count:4, location:'Indoor'}] })
  ];

  var settings = { apiKey: '', cycleType: '3-2-1', cycleStartDate: iso(9), gradeIndoor: '5.10c', gradeOutdoor: '5.10a', fontSize: 'medium', theme: 'light', weeklyTargets: {} };

  var assessments = [{ id: 'a1', date: iso(30), scores: { mental: 3.1, technique: 2.6, physical: 3.4 },
    answers: [3,2,3,3,2,3,3,2,4,3,3,3,3,2,4,3,3,3,3,2,3,3,2,4], gradeIndoor: '5.10b', gradeOutdoor: '5.10a' }];

  var plan = [
    '### Warmup — 10 min [mobility]',
    '- Jumping jacks, 30 sec',
    '- Joint circles (ankles/hips/shoulders), 10 each direction',
    '- World\'s greatest stretch, 5 each side',
    '### Finger health — 5 min [fingers]',
    '- Finger extensions (rubber band), 2 x 15',
    '- Wrist curls (health/prehab), 2 x 12',
    '### Easy climbing — 10 min [climb]',
    '- Traverse a green problem, 4 laps',
    '### Volume — 30 min [climb]',
    '- Boulder problems two grades below your max, 8 problems with 90 sec rest',
    '### Core — 10 min [core]',
    '- Side plank hold, 30 sec/side',
    '- Hanging leg raises, 3 x 8',
    '### Cooldown — 5 min [flexibility]',
    '- Pigeon pose, 30 sec/side',
    '- Thread-the-needle, 30 sec/side'
  ].join('\n');
  var lastPlan = { text: plan, generatedAt: new Date().toISOString(), sessionTypes: ['Climbing'],
    context: { sys: 'Sample preview prompt', userMsg: 'Sample preview request' } };

  try {
    localStorage.setItem('t4c_entries', JSON.stringify(entries));
    localStorage.setItem('t4c_settings', JSON.stringify(settings));
    localStorage.setItem('t4c_assessments', JSON.stringify(assessments));
    localStorage.setItem('t4c_last_plan', JSON.stringify(lastPlan));
    localStorage.setItem('t4c_swipe_hint_shown', '1');
  } catch (e) { return; }

  var note = document.createElement('div');
  note.setAttribute('style', 'background:#EDEAE2;color:#2B281F;border-bottom:1px solid #D6D0C4;padding:6px 16px;font:0.75rem/1.4 sans-serif;text-align:center;');
  note.textContent = 'Preview build with sample data. This is not your log, and plan generation is unavailable here.';
  document.body.insertBefore(note, document.body.firstChild);
})();
