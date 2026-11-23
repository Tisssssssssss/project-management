// Run with the Electron executable. YANTAI_LEDGER_SCREENSHOTS optionally receives fixture PNGs.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { startService } = require('./service.cjs');

const root = path.resolve(__dirname, '..');
const output = process.env.YANTAI_LEDGER_SCREENSHOTS && path.resolve(process.env.YANTAI_LEDGER_SCREENSHOTS);
const temp = require('node:fs').mkdtempSync(path.join(os.tmpdir(), 'yantai-ledger-ui-'));
app.setPath('userData', path.join(temp, 'profile'));
app.on("window-all-closed", () => {}); // Exit after assertions and temporary data cleanup.

async function test() {
  await app.whenReady();
  const service = await startService({ directory: path.join(temp, 'data'), assets: path.join(root, 'dist') });
  const window = new BrowserWindow({ width: 1024, height: 620, show: true,
    titleBarStyle: 'hiddenInset', webPreferences: { backgroundThrottling: false } });
  const run = script => window.webContents.executeJavaScript(script);
  async function capture(name) {
    if (!output) return;
    await new Promise(resolve => setTimeout(resolve, 350));
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, name + '.png'), (await window.webContents.capturePage()).toPNG());
  }

  try {
    const state = service.read();
    const project = { id: 'ledger-fixture', name: '示例云资源整合', unit: '示例单位',
      stage: '需求调研', events: [], files: [], starred: true, createdDate: '2020-01-01' };
    state.data.projects.push(project, { ...project, id: 'archive-fixture', name: '示例归档项目', archived: true, archiveHistory: [{date: '2020-01-02', archived: true}] });
    service.replace(state.data, state.revision);
    await window.loadURL(service.launch);
    await window.webContents.insertCSS(await fs.readFile(path.join(__dirname, 'desktop.css'), 'utf8'));
    await run(`new Promise(resolve => {
      const timer = setInterval(() => {
        if (data.projects.some(project => project.id === 'ledger-fixture')) {
          clearInterval(timer); resolve();
        }
      }, 25);
      setTimeout(() => { clearInterval(timer); resolve(); }, 3000);
    })`);
    for (const zoom of [1, 1.2]) {
      window.webContents.setZoomFactor(zoom);
      await run(`document.querySelector('[data-dest="项目台账"]').click()`);
      for (const [scope, expected] of [['active', 'ledger-fixture'], ['starred', 'ledger-fixture'], ['archived', 'archive-fixture'], ['stale', null], ['active', 'ledger-fixture']]) {
        const result = await run(`(() => {
          document.querySelector('[data-ledger-scope="${scope}"]').click();
          const option = document.querySelector('[data-ledger-scope="${scope}"]');
          return [option.getAttribute('aria-pressed'), [...document.querySelectorAll('tr.project')].map(row => row.dataset.project)];
        })()`);
        assert.equal(result[0], 'true');
        if (expected) assert.deepEqual(result[1], [expected]);
      }

      await capture('ledger-list-' + zoom);
      const date = await run(`(async () => {
        document.querySelector('.ledger-stage-filter summary').click();
        [...document.querySelectorAll('.ledger-stage-options button')].find(button => button.textContent === '需求调研').click();
        document.querySelector('.ledger-date-filter summary').click();
        await new Promise(resolve => setTimeout(resolve, 150));
        const form = document.querySelector('.ledger-date-menu');
        const action = form.querySelector('[type=submit]').getBoundingClientRect();
        return [form.matches(':popover-open'), form.scrollHeight - form.clientHeight,
          document.elementFromPoint(action.x + 8, action.y + 8)?.textContent.trim()];
      })()`);
      assert.deepEqual(date, [true, 0, '应用']);
      await capture('ledger-date-' + zoom);

      const result = await run(`(() => {
        const form = document.querySelector('.ledger-date-menu');
        form.elements.field.value = 'created';
        form.elements.start.value = '2020-01-01';
        form.elements.end.value = '2020-01-02';
        form.requestSubmit();
        const filtered = document.querySelectorAll('tr.project').length;
        document.querySelector('.excel-export-more').click();
        const exportCount = document.querySelector('[data-excel-current] small')?.textContent.trim();
        document.querySelector('.excel-export-more').click();
        document.querySelector('[data-view="board"]').click();
        const board = document.querySelectorAll('.boardcard').length;
        document.querySelector('.boardcard').click();
        const detail = !!document.querySelector('.window-detail');
        const sameProject = selected === 'ledger-fixture';
        selected = null;
        render();
        const returned = !!document.querySelector('.window-ledger');
        document.querySelector('.ledger-filter-result button').click();
        document.querySelector('[data-view="table"]').click();
        return { filtered, exportCount, board, detail, sameProject, returned };
      })()`);
      assert.deepEqual(result, { filtered: 1, exportCount: '1 个项目', board: 1, detail: true, sameProject: true, returned: true });
    }
    console.log('PASS: ledger scopes, stage + date filters, popover hit testing, board and project detail at 100% and 120%');
  } finally {
    window.destroy();
    await service.close();
    await fs.rm(temp, { recursive: true, force: true });
  }
}
test().then(() => app.exit(0), error => { console.error(error); app.exit(1); });
