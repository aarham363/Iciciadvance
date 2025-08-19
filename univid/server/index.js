import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDataFileExists, readDatabase, writeDatabase } from './lib/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_please_change_me';

await ensureDataFileExists(path.join(__dirname, 'data', 'db.json'));

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const existingUser = db.users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase() || u.username.toLowerCase() === String(username).toLowerCase()
  );
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    username,
    email,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  await writeDatabase(path.join(__dirname, 'data', 'db.json'), db);
  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.get('/api/me', authRequired, async (req, res) => {
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const me = db.users.find((u) => u.id === req.user.id);
  if (!me) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: me.id, username: me.username, email: me.email, createdAt: me.createdAt });
});

app.get('/api/posts', async (_req, res) => {
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const posts = db.posts
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

app.post('/api/posts', authRequired, async (req, res) => {
  const { url, title, description } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const post = {
    id: nanoid(),
    userId: req.user.id,
    type: 'embed',
    sourceUrl: String(url),
    title: title || '',
    description: description || '',
    thumbnail: '',
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };
  db.posts.unshift(post);
  await writeDatabase(path.join(__dirname, 'data', 'db.json'), db);
  res.status(201).json(post);
});

app.post('/api/posts/:id/like', authRequired, async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const liked = post.likes.includes(req.user.id);
  if (liked) {
    post.likes = post.likes.filter((u) => u !== req.user.id);
  } else {
    post.likes.push(req.user.id);
  }
  await writeDatabase(path.join(__dirname, 'data', 'db.json'), db);
  res.json({ ...post, likeCount: post.likes.length });
});

app.post('/api/posts/:id/comments', authRequired, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'comment text is required' });
  }
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const comment = {
    id: nanoid(),
    userId: req.user.id,
    text: String(text).trim(),
    createdAt: new Date().toISOString()
  };
  post.comments.push(comment);
  await writeDatabase(path.join(__dirname, 'data', 'db.json'), db);
  res.status(201).json(comment);
});

app.delete('/api/posts/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase(path.join(__dirname, 'data', 'db.json'));
  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  if (post.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can delete only your own post' });
  }
  db.posts = db.posts.filter((p) => p.id !== id);
  await writeDatabase(path.join(__dirname, 'data', 'db.json'), db);
  res.json({ ok: true });
});

// Serve built client if present (so you can open one URL)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`univid server running on http://localhost:${PORT}`);
});

