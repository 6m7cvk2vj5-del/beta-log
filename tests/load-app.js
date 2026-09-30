// Loads index.html + app.js into jsdom with a real (non-opaque) origin so localStorage works.
// Usage: const { loadApp } = require('./tests/load-app'); const { window, App } = await loadApp();
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

async function loadApp() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/<script src="app\.js"><\/script>/, '');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true, // required: layout-dependent tests fail silently without it
  });
  dom.window.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
  return { dom, window: dom.window, App: dom.window.App };
}

module.exports = { loadApp };
