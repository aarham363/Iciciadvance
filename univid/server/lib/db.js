import fs from 'fs/promises';
import path from 'path';

const defaultDatabase = {
  users: [],
  posts: []
};

export async function ensureDataFileExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultDatabase, null, 2), 'utf8');
  }
}

export async function readDatabase(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    const data = JSON.parse(raw);
    return normalizeDatabase(data);
  } catch {
    return { ...defaultDatabase };
  }
}

export async function writeDatabase(filePath, data) {
  const normalized = normalizeDatabase(data);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf8');
}

function normalizeDatabase(db) {
  const safe = db && typeof db === 'object' ? db : {};
  return {
    users: Array.isArray(safe.users) ? safe.users : [],
    posts: Array.isArray(safe.posts) ? safe.posts : []
  };
}

