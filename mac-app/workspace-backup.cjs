const fs = require('node:fs/promises');
const path = require('node:path');
const { createReadStream } = require('node:fs');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { validate } = require('./service.cjs');

const format = 'yantai-workspace-v1';
const databaseName = 'workspace.sqlite3';

async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function plainFile(file) {
  const info = await fs.lstat(file);
  if (!info.isFile()) throw Error('备份内容必须是普通文件');
  return file;
}

function readSnapshot(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const row = db.prepare('SELECT payload FROM snapshots ORDER BY revision DESC LIMIT 1').get();
    const data = row ? JSON.parse(row.payload) : {
      schemaVersion: 3, modelVersion: 3, projects: [], tasks: [], ledger: [], finance: [], audit: []
    };
    validate(data);
    return data;
  } finally {
    db.close();
  }
}

function attachments(data) {
  return data.projects.flatMap(project => project.files || []);
}

async function createBackup({ parent, service, files, includeOriginals }) {
  const folder = await fs.mkdtemp(path.join(parent, '砚台泼墨完整备份-'));
  try {
    const database = path.join(folder, databaseName);
    await service.backup(database);
    await fs.chmod(database, 0o600);
    const data = readSnapshot(database);
    const entries = [];
    const unavailable = [];
    if (includeOriginals) {
      await fs.mkdir(path.join(folder, 'attachments'), { mode: 0o700 });
      for (const id of new Set(attachments(data).filter(file => !file.deletedAt).map(file => file.fileId))) {
        let source;
        try {
          source = files.resolve(id);
        } catch {
          unavailable.push(id ?? null);
          continue;
        }
        const name = String(entries.length) + path.extname(source).toLowerCase();
        const target = path.join(folder, 'attachments', name);
        await fs.copyFile(source, target);
        await fs.chmod(target, 0o600);
        entries.push({ id, name, sha256: await digest(target) });
      }
    }
    const missing = unavailable.length;
    await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify({
      format, databaseSha256: await digest(database), includeOriginals, entries, missing
    }), { mode: 0o600, flag: 'wx' });
    return { folder, originals: entries.length, missing };
  } catch (error) {
    await fs.rm(folder, { recursive: true, force: true });
    throw error;
  }
}

async function inspectBackup(folder) {
  const manifest = JSON.parse(await fs.readFile(await plainFile(path.join(folder, 'manifest.json')), 'utf8'));
  if (manifest.format !== format || !Array.isArray(manifest.entries)) throw Error('备份格式不受支持');
  const database = await plainFile(path.join(folder, databaseName));
  if (await digest(database) !== manifest.databaseSha256) throw Error('数据库校验失败');
  const data = readSnapshot(database);
  const ids = new Set(attachments(data).map(file => file.fileId));
  const files = new Map();
  if (manifest.entries.length) {
    const directory = await fs.lstat(path.join(folder, 'attachments'));
    if (!directory.isDirectory()) throw Error('附件目录无效');
  }
  for (const entry of manifest.entries) {
    if (typeof entry.id !== 'string' || !ids.has(entry.id) || files.has(entry.id) ||
        typeof entry.name !== 'string' || !/^\d+\.[a-z0-9]+$/.test(entry.name)) {
      throw Error('附件清单无效');
    }
    const source = await plainFile(path.join(folder, 'attachments', entry.name));
    if (await digest(source) !== entry.sha256) throw Error('附件校验失败');
    files.set(entry.id, { source, sha256: entry.sha256 });
  }
  return { data, files, missing: manifest.missing || 0 };
}

async function restoreBackup({ candidate, profile, service, files, expectedRevision }) {
  const destination = path.join(profile, 'restored-attachments');
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const staged = await fs.mkdtemp(path.join(destination, 'restore-'));
  const replacements = new Map();
  const data = structuredClone(candidate.data);
  try {
    for (const [id, { source, sha256 }] of candidate.files) {
      const target = path.join(staged, path.basename(source));
      await fs.copyFile(source, target);
      if (await digest(target) !== sha256) throw Error('附件在确认后发生变化');
      replacements.set(id, files.register(target).fileId);
    }
    for (const file of attachments(data)) {
      if (replacements.has(file.fileId)) file.fileId = replacements.get(file.fileId);
    }
    service.replace(data, expectedRevision);
  } catch (error) {
    for (const id of replacements.values()) files.unregister(id);
    await fs.rm(staged, { recursive: true, force: true });
    throw error;
  }
}
module.exports = { createBackup, inspectBackup, restoreBackup };
