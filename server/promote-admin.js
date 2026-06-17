import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email) {
  console.log('Usage: node server/promote-admin.js email@example.com [password]');
  process.exit(1);
}

let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (!user) {
  if (!password) {
    console.log('User not found. Provide password to create admin account.');
    process.exit(1);
  }
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const name = email.split('@')[0];
  db.prepare(
    'INSERT INTO users (id, email, password, password_plain, name, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, hashed, password, name, 'admin');
  console.log('Created admin:', email);
} else {
  db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email);
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password = ?, password_plain = ? WHERE email = ?').run(
      hashed, password, email
    );
  }
  console.log('Promoted to admin:', email);
}

console.log(db.prepare('SELECT email, role FROM users WHERE email = ?').get(email));
