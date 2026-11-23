const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { startService } = require('./service.cjs');
const { createFiles } = require('./files.cjs');
const { createBackup, inspectBackup, restoreBackup } = require('./workspace-backup.cjs');

async function test() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yantai-portable-test-'));
  const assets = path.resolve(__dirname, '../dist');
  let source, target;
  try {
    const original = path.join(dir, 'sample.txt');
    await fs.writeFile(original, 'sample attachment');
    const sourceProfile = path.join(dir, 'source');
    source = await startService({ directory: path.join(sourceProfile, 'data'), assets });
    const sourceFiles = createFiles(sourceProfile);
    const attachment = sourceFiles.register(original);
    const { data, revision } = source.read();
    data.projects.push({ id: 'sample', name: '示例项目', unit: '示例客户', events: [], files: [attachment] });
    source.replace(data, revision);

    const metadata = await createBackup({ parent: dir, service: source, files: sourceFiles, includeOriginals: false });
    assert.equal((await inspectBackup(metadata.folder)).files.size, 0);
    const full = await createBackup({ parent: dir, service: source, files: sourceFiles, includeOriginals: true });
    assert.equal(full.originals, 1);
    await fs.rename(original, path.join(dir, 'moved.txt'));

    const profile = path.join(dir, 'clean');
    target = await startService({ directory: path.join(profile, 'data'), assets });
    const files = createFiles(profile);
    const candidate = await inspectBackup(full.folder);
    await restoreBackup({ candidate, profile, service: target, files, expectedRevision: 0 });
    const restored = target.read().data.projects[0].files[0];
    assert.notEqual(restored.fileId, attachment.fileId);
    assert.equal(await fs.readFile(createFiles(profile).resolve(restored.fileId), 'utf8'), 'sample attachment');

    await assert.rejects(restoreBackup({ candidate, profile, service: target, files, expectedRevision: 0 }), /工作空间已更新/);
    assert.equal(target.read().revision, 1);
    await fs.appendFile(path.join(full.folder, 'attachments', '0.txt'), ' changed');
    await assert.rejects(inspectBackup(full.folder), /附件校验失败/);
    assert.equal(target.read().data.projects[0].files[0].fileId, restored.fileId);
    console.log('PASS: opt-in originals, clean-profile restore, moved source, revision conflict, tamper rejection');
  } finally {
    await target?.close();
    await source?.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
