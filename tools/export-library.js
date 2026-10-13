#!/usr/bin/env node
/* Exports everything the app knows about exercises and drills into readable documents:
     docs/exercises.md, docs/drills.md, docs/training-structure.md, docs/illustrations/*.svg
   plus docs/library.html (all of it in one page, used to make the PDF).
   Markdown and SVG render directly on GitHub. Needs jsdom (a devDependency).
   Usage: node tools/export-library.js [outDir] */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'docs');
fs.mkdirSync(path.join(out, 'illustrations'), { recursive: true });

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script src="app\.js"><\/script>/, '');
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
dom.window.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
const w = dom.window;
const D = w.DOCS_DATA;

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COLORS = { '--text': '#2B281F', '--muted': '#645F54', '--gold': '#9E6E24' };

// One SVG per illustration: the steps side by side, standalone colors, light background.
function illustrationSVG(il) {
  const W = 220, G = 12;
  const v = il.view || [0, 0, 120, 120];
  const H = Math.round(W * v[3] / v[2]);
  const frames = il.steps.map((st, i) => {
    const full = w.renderIllusFrame(Object.assign({ view: il.view }, st));
    const inner = full.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<g transform="translate(${i * (W + G)},0)"><rect width="${W}" height="${H}" rx="10" fill="#EDEAE2"/>` +
      `<svg x="0" y="0" width="${W}" height="${H}" viewBox="${v.join(' ')}">${inner}</svg>` +
      `<circle cx="16" cy="16" r="10" fill="#9E6E24"/><text x="16" y="20.5" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#FBF5EC">${i + 1}</text></g>`;
  }).join('');
  const total = il.steps.length * W + (il.steps.length - 1) * G;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${H}" width="${total}" height="${H}">${frames}</svg>`;
  Object.keys(COLORS).forEach(k => { svg = svg.split(`var(${k})`).join(COLORS[k]); });
  return svg;
}
const illusFile = {};
w.ILLUSTRATIONS.forEach(il => {
  const f = slug(il.title) + '.svg';
  illusFile[il.title] = f;
  fs.writeFileSync(path.join(out, 'illustrations', f), illustrationSVG(il));
});
const illFor = name => w.findIllustration(name);
const illPath = il => il ? 'illustrations/' + illusFile[il.title] : null;

const meta = n => w.exerciseMeta(n);
const cue = n => D.KIND_NOTES && (w.EXERCISE_NOTES[n] || (meta(n) ? D.KIND_NOTES[meta(n).k] : ''));

// ---------- exercises ----------
const byStyle = {};
Object.keys(w.EXERCISE_META).forEach(n => { (byStyle[w.EXERCISE_META[n].style] = byStyle[w.EXERCISE_META[n].style] || []).push(n); });
const total = Object.keys(w.EXERCISE_META).length;
const withIl = Object.keys(w.EXERCISE_META).filter(n => illFor(n));

let exMd = `# Exercise library\n\nEvery named exercise the app can prescribe or swap in: ${total} exercises, grouped by routine. ` +
  `Each shows the body region it works, what kind of work it is, the regions it loads (used to avoid anything that loads a flagged injury), a short cue, and a drawn illustration where one exists.\n\n` +
  `**Illustrated:** ${withIl.length} of ${total}. Cues in plain text are specific to the exercise; cues that read as general guidance are the default for that kind of work.\n\n`;
let exHtml = `<h1>Exercise library</h1><p>${total} exercises, grouped by routine. ${withIl.length} have illustrations.</p>`;
const illustratedShown = new Set();
Object.keys(byStyle).forEach(style => {
  exMd += `## ${style}\n\n`;
  exHtml += `<h2>${esc(style)}</h2>`;
  byStyle[style].forEach(n => {
    const m = meta(n), il = illFor(n);
    const loads = m.strains.length ? `Loads: ${m.strains.join(', ').toLowerCase()}.` : 'Loads: no specific joint region.';
    const kind = D.KIND_LABEL[m.k] || m.k;
    exMd += `### ${n}\n\n*${m.r} · ${kind}* · ${loads}\n\n${cue(n)}\n\n`;
    exHtml += `<div class="ex"><h3>${esc(n)}</h3><div class="meta">${esc(m.r)} · ${esc(kind)} · ${esc(loads)}</div><p>${esc(cue(n))}</p>`;
    if (il) {
      exMd += `![${il.title}](${illPath(il)})\n\n` + il.steps.map((s, i) => `${i + 1}. ${s.cap}`).join('\n') + '\n\n';
      if (!illustratedShown.has(il.title)) {
        illustratedShown.add(il.title);
        exHtml += `<div class="illus">${illustrationSVG(il)}</div><ol>${il.steps.map(s => `<li>${esc(s.cap)}</li>`).join('')}</ol>`;
      } else {
        exHtml += `<p class="meta">Steps: see "${esc(il.title)}" above.</p>`;
      }
    }
    exHtml += `</div>`;
  });
});
const missing = Object.keys(w.EXERCISE_META).filter(n => !illFor(n));
exMd += `## Still to illustrate\n\n${missing.length} exercises have no drawn steps yet:\n\n${missing.map(n => `- ${n}`).join('\n')}\n`;
fs.writeFileSync(path.join(out, 'exercises.md'), exMd);

// ---------- drills ----------
let drMd = `# Drill library\n\n## Coach deck\n\nTechnique, warmup and play drills the plans pick from, with a short description of how each is done. ` +
  `${w.COACH_DECK.length} drills. Names and descriptions are written for this app. Add your coach's own drills to \`COACH_DECK\` in \`app.js\`.\n\n`;
let drHtml = `<h1>Drill library</h1><h2>Coach deck</h2><p>${w.COACH_DECK.length} drills the plans pick from.</p>`;
w.COACH_DECK.forEach(x => {
  const il = illFor(x.t);
  drMd += `### ${x.t}\n\n*${x.cats.join(' · ')}* · **${x.dose}**\n\n${x.d}\n\n`;
  drHtml += `<div class="ex"><h3>${esc(x.t)}</h3><div class="meta">${esc(x.cats.join(' · '))} · <b>${esc(x.dose)}</b></div><p>${esc(x.d)}</p>`;
  if (il) {
    drMd += `![${il.title}](${illPath(il)})\n\n` + il.steps.map((s, i) => `${i + 1}. ${s.cap}`).join('\n') + '\n\n';
    drHtml += `<div class="illus">${illustrationSVG(il)}</div><ol>${il.steps.map(s => `<li>${esc(s.cap)}</li>`).join('')}</ol>`;
  }
  drHtml += `</div>`;
});
drMd += `## Book drill list\n\nTitles only, from your two books, so a plan can point you at the right page. ` +
  `The content is in the books and is not reproduced here.\n\n`;
drHtml += `<h2>Book drill list</h2><p>Titles only, from your two books. The content is in the books.</p>`;
const books = {};
D.DRILL_LIBRARY.forEach(x => { ((books[x.book] = books[x.book] || {})[x.cat] = books[x.book][x.cat] || []).push(x.t); });
Object.keys(books).forEach(b => {
  drMd += `### ${b}\n\n`;
  drHtml += `<h3>${esc(b)}</h3>`;
  Object.keys(books[b]).forEach(c => {
    drMd += `**${c}**\n\n${books[b][c].map(t => `- ${t}`).join('\n')}\n\n`;
    drHtml += `<p><b>${esc(c)}</b></p><ul>${books[b][c].map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  });
});
fs.writeFileSync(path.join(out, 'drills.md'), drMd);

// ---------- training structure ----------
const rows = (obj, keys) => keys.map(k => `| ${k} | ${obj[k]} min |`).join('\n');
let tsMd = `# Training structure\n\nHow the app organizes training, as it is built today.\n\n## Cycle phases\n\n`;
Object.keys(D.PHASE_GUIDANCE).forEach(p => {
  const g = D.PHASE_GUIDANCE[p];
  tsMd += `### ${p}\n\n${g.summary}\n\n${g.breakdown.map(b => `- ${b.time ? '**' + b.time + '** ' : ''}${b.label}`).join('\n')}\n\n`;
});
tsMd += `## Weekly rhythm (reference, not enforced)\n\n| | ${D.DAY_NAMES.join(' | ')} |\n|---|${D.DAY_NAMES.map(() => '---').join('|')}|\n` +
  `| Normal week | ${D.WEEKLY_TEMPLATE.join(' | ')} |\n| Taper week | ${D.TAPER_TEMPLATE.join(' | ')} |\n\n`;
tsMd += `## Weekly goals (minutes, adjustable in Settings)\n\n| Area | Normal week | Taper week |\n|---|---|---|\n` +
  Object.keys(D.WEEKLY_TARGETS).map(k => `| ${k} | ${D.WEEKLY_TARGETS[k]} | ${D.TAPER_WEEKLY_TARGETS[k]} |`).join('\n') + '\n\n';
tsMd += `## Warmup skeleton\n\nSmall to big, the same every session, only the exercises inside it rotate:\n\n` +
  `1. **Blood flow** (cardio): joint circles always, plus one rotating item.\n` +
  `2. **Prehab** (antagonist): 3 to 4 light exercises at 1x5 to 1x10, from body regions not yet covered this week.\n` +
  `3. **Movement pattern** (mobility): one coordinated compound movement, e.g. world's greatest stretch.\n` +
  `4. **Finger activation** (fingers): last, only when the session includes climbing or fingers.\n\n` +
  `One play item is included somewhere in the warmup, and some prehab is saved for the cooldown.\n\n`;
tsMd += `## Climbing session model\n\n` +
  `A climbing session is built from these components, in this order:\n\n` +
  `1. **Warmup**: blood flow, prehab, movement pattern, then finger activation last\n` +
  `2. **Technique drills**, carried inside the easy climbing\n` +
  `3. **Main climbing**: max effort in Max Strength & Power, volume in Skill & Stamina, intervals in Power-Endurance\n` +
  `4. **Fingers, after climbing**: heavy hangs only on a heavy-fingers day, otherwise a short finger-health circuit\n` +
  `5. **Strength, antagonist and core work**\n` +
  `6. **Cooldown** with hip mobility\n\n` +
  `### What stays at each length\n\n` +
  `Cuts come from the bottom of the list. The warmup (with finger activation), the main climbing and the cooldown are never cut.\n\n` +
  `| Minutes | Kept |\n|---|---|\n| 30 | warmup, main climbing, cooldown |\n| 45 | + technique drills inside the easy climbing |\n` +
  `| 60 | + one catch-up item (fingers or strength, whichever is missed this week) |\n| 90 | + a second catch-up item |\n\n` +
  `### Heavy-fingers day\n\n` +
  `No limit or max-effort climbing. Warmup, technique-only climbing at submaximal effort, then heavy finger training, then cooldown. ` +
  `In the Max Strength & Power phase there is at least one of these per week; the app suggests it until one is logged.\n\n` +
  `### Weekly rules\n\n` +
  `- You set the least number of climbing sessions per week (default 2).\n` +
  `- Missed components this week (technique, max effort, fingers, strength, antagonist/prehab, mobility) are added to the next session within its time budget, at most two extras, in priority order.\n` +
  `- If the log suggests this is the only session of the week (nothing logged yet and few days left, or recent weeks have had one climb), nothing is stacked on: climbing and health only. You can override this on the Ask screen.\n` +
  `- If you are behind on the weekly minimum with few days left, climbing is favoured over exercise-only sessions.\n\n`;
tsMd += `## Profile (four areas)\n\n${D.AREAS.map(a => `- **${a.label}**: ${D.AREA_HELP[a.key]}`).join('\n')}\n\n` +
  `Each check-in is six comparisons (one per pair of areas): you pick which statement holds you back more. Example statements:\n\n` +
  D.AREAS.map(a => `**${a.label}**\n\n${D.AREA_STATEMENTS[a.key].map(t => `- ${t}`).join('\n')}\n`).join('\n') + '\n';
tsMd += `## Benchmarks\n\nRun in taper weeks or from Settings.\n\n| Test | Area | Unit | How |\n|---|---|---|---|\n` +
  D.BENCHMARKS.map(b => `| ${b.label} | ${b.area} | ${b.unit} | ${b.how} |`).join('\n') + '\n\n';
tsMd += `## What each logged breakdown counts toward\n\n| Breakdown | Area |\n|---|---|\n` +
  Object.keys(D.BREAKDOWN_CATEGORY).map(k => `| ${k} | ${D.BREAKDOWN_CATEGORY[k]} |`).join('\n') + '\n\n';
tsMd += `## Routines in the exercise library\n\n${Object.keys(byStyle).map(s => `- **${s}**: ${byStyle[s].length} exercises`).join('\n')}\n`;
fs.writeFileSync(path.join(out, 'training-structure.md'), tsMd);

// ---------- index + combined page ----------
fs.writeFileSync(path.join(out, 'README.md'),
  `# Beta Log: exercise and drill library\n\n- [Exercises](exercises.md): ${total} exercises with cues, regions and illustrations\n` +
  `- [Drills](drills.md): the coach deck and the book drill list\n- [Training structure](training-structure.md): phases, weekly rhythm, goals, warmup, profile and benchmarks\n` +
  `- \`illustrations/\`: the drawn steps as standalone SVG files\n\nRegenerate with \`node tools/export-library.js\`.\n`);
const css = `body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#2B281F;max-width:760px;margin:0 auto;padding:24px;line-height:1.45;font-size:13px}
h1{font-size:26px;border-bottom:2px solid #9E6E24;padding-bottom:6px;margin-top:32px}h2{font-size:19px;color:#9E6E24;margin-top:26px}h3{font-size:15px;margin:0}
.ex{break-inside:avoid;border-top:1px solid #D6D0C4;padding:10px 0}.meta{color:#645F54;font-size:12px}.illus svg{width:100%;height:auto;margin:6px 0}
ol,ul{margin:4px 0 0 18px;padding:0}p{margin:6px 0}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #D6D0C4;padding:4px 8px;text-align:left;font-size:12px}th{background:#EDEAE2}`;
// Small markdown-to-HTML for the structure document: headings, bullets, numbered lists, tables, bold, italics.
function mdToHtml(md) {
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out = []; let list = null, table = null;
  const flush = () => { if (list) { out.push(`</${list}>`); list = null; } if (table) { out.push('</table>'); table = null; } };
  md.split('\n').forEach(line => {
    let m;
    if ((m = line.match(/^(#{1,3}) (.*)$/))) { flush(); const lvl = Math.min(3, m[1].length + 1); out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); }
    else if (/^\|/.test(line)) {
      if (/^\|[-| ]+\|$/.test(line)) return;
      const cells = line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      if (!table) { flush(); table = true; out.push('<table>'); out.push('<tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr>'); }
      else out.push('<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>');
    }
    else if ((m = line.match(/^- (.*)$/))) { if (list !== 'ul') { flush(); list = 'ul'; out.push('<ul>'); } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\d+\. (.*)$/))) { if (list !== 'ol') { flush(); list = 'ol'; out.push('<ol>'); } out.push(`<li>${inline(m[1])}</li>`); }
    else if (line.trim() === '') { flush(); }
    else { flush(); out.push(`<p>${inline(line)}</p>`); }
  });
  flush();
  return out.join('\n');
}
const tsHtml = mdToHtml(tsMd);
fs.writeFileSync(path.join(out, 'library.html'),
  `<!doctype html><meta charset="utf-8"><title>Beta Log: exercises and drills</title><style>${css}</style>${exHtml}${drHtml}<h1>Training structure</h1>${tsHtml}`);
console.log('exported', total, 'exercises,', w.COACH_DECK.length, 'drills,', w.ILLUSTRATIONS.length, 'illustrations to', out);
