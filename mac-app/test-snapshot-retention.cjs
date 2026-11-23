const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const { startService } = require('./service.cjs');
const { createBackup, inspectBackup } = require('./workspace-backup.cjs');

async function test() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yantai-retention-'));
  let service;
  try {
    service = await startService({ directory: dir, assets: path.resolve(__dirname, '../dist') });
    const { data } = service.read();
    data.projects.push({ id: 'fixture', name: '示例项目', unit: '示例客户',
      events: [{ title: '示例进展' }], background: '示例背景'.repeat(1000) });
    for (let revision = 0; revision < 85; revision++) service.replace(data, revision);
    const fixture = new DatabaseSync(service.dbPath);
    try {
      const date = fixture.prepare('UPDATE snapshots SET created = ? WHERE revision = ?');
      for (let revision = 1; revision <= 35; revision++) {
        date.run(revision <= 15 ? '2025-01-01' : '2025-02-01', revision);
      }
    } finally { fixture.close(); }
    const first = service.snapshotRetention();
    assert.equal(first.keep, 52);
    assert.equal(first.discard.length, 33);
    assert.ok(!first.discard.includes(15) && !first.discard.includes(35));

    const { folder } = await createBackup({ parent: dir, service, includeOriginals: false });
    assert.deepEqual((await inspectBackup(folder)).data, data);
    service.replace(data, 85);
    assert.throws(() => service.pruneSnapshots(first), /重新预览/);
    assert.equal(service.snapshotRetention().latest, 86);
    const current = service.snapshotRetention();
    assert.equal(service.pruneSnapshots(current), current.discard.length);
    service.compactSnapshots();
    assert.deepEqual(service.read(), { revision: 86, data });
    assert.equal(service.snapshotRetention().discard.length, 0);
    assert.equal(service.replace(data, 86), 87);
    console.log('PASS: retention preview, monthly checkpoints, backup, stale-plan rejection, data continuity and compaction');
  } finally {
    await service?.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
