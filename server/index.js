import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db, { isAwaitingReply } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lemod-super-secret-key-for-fun';
const ADMIN_KEY = process.env.LEMOD_ADMIN_KEY || 'lemod-admin-secret';

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Please log in' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function userPayload(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };
}

function signToken(user) {
  return jwt.sign(userPayload(user), JWT_SECRET, { expiresIn: '7d' });
}

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, name, adminKey } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'This email is already registered' });
  }

  const wantsAdmin = Boolean(req.body.wantAdmin);
  if (wantsAdmin) {
    if (!adminKey) {
      return res.status(400).json({ error: 'Admin key is required' });
    }
    if (adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
  }

  const role = wantsAdmin ? 'admin' : 'user';
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const displayName = name || email.split('@')[0];

  db.prepare('INSERT INTO users (id, email, password, password_plain, name, role) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, email, hashed, password, displayName, role
  );

  const user = { id, email, name: displayName, role };
  res.json({ token: signToken(user), user: userPayload(user) });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password, adminKey } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (adminKey) {
    if (adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    if (user.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user.role = 'admin';
    }
  }

  if (!user.password_plain) {
    db.prepare('UPDATE users SET password_plain = ? WHERE id = ?').run(password, user.id);
  }

  res.json({ token: signToken(user), user: userPayload(user) });
});

// Get user profile
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ user: userPayload(user) });
});

// --- User routes ---

app.get('/api/conversations', authMiddleware, (req, res) => {
  const conversations = db
    .prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ conversations });
});

app.post('/api/conversations', authMiddleware, (req, res) => {
  const id = uuidv4();
  const title = req.body.title || 'New chat';
  db.prepare('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)').run(
    id, req.user.id, title
  );
  res.json({ conversation: { id, title } });
});

app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const conv = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(req.params.id);

  res.json({ messages, awaitingReply: isAwaitingReply(req.params.id) });
});

app.post('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const conv = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  if (isAwaitingReply(req.params.id)) {
    return res.status(400).json({ error: 'Please wait for a response' });
  }

  const userMsgId = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
    userMsgId, req.params.id, 'user', content.trim()
  );

  const msgCount = db
    .prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?')
    .get(req.params.id);

  if (msgCount.count === 1) {
    const title = content.trim().slice(0, 40) + (content.length > 40 ? '...' : '');
    db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, req.params.id);
  }

  res.json({
    userMessage: { id: userMsgId, role: 'user', content: content.trim() },
    awaitingReply: true,
  });
});

app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
  const conv = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Admin routes ---

app.get('/api/admin/conversations', authMiddleware, adminMiddleware, (req, res) => {
  const conversations = db
    .prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.password_plain as user_password,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT role FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_role
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE u.role = 'user'
      ORDER BY c.created_at DESC
    `)
    .all()
    .map((c) => ({
      ...c,
      awaitingReply: c.last_role === 'user',
    }));

  res.json({ conversations });
});

app.get('/api/admin/conversations/:id/messages', authMiddleware, adminMiddleware, (req, res) => {
  const conv = db
    .prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.password_plain as user_password
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `)
    .get(req.params.id);

  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(req.params.id);

  res.json({
    conversation: conv,
    messages,
    awaitingReply: isAwaitingReply(req.params.id),
  });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db
    .prepare(`
      SELECT id, name, email, password_plain as password, created_at
      FROM users WHERE role = 'user'
      ORDER BY created_at DESC
    `)
    .all();
  res.json({ users });
});

app.post('/api/admin/conversations/:id/reply', authMiddleware, adminMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  if (!isAwaitingReply(req.params.id)) {
    return res.status(400).json({ error: 'No pending message to reply to' });
  }

  const aiMsgId = uuidv4();
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
    aiMsgId, req.params.id, 'assistant', content.trim()
  );

  res.json({
    assistantMessage: { id: aiMsgId, role: 'assistant', content: content.trim() },
  });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🤖 Lemod server running on port ${PORT}`);
});
