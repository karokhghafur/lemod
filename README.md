# Lemod AI 🤖

A prank website that looks like a real AI chat — but **you** are the one replying behind the scenes!

## How It Works

1. **Users** sign up and chat with "Lemod AI" — they think it's real AI
2. **You (admin)** see their messages in the Admin Panel and reply as the AI
3. Users see a typing indicator while waiting for your response

## Setup

### 1. Install and run

```bash
npm install
npm run dev
```

Open: **http://localhost:5173**

### 2. Create your admin account

1. Click **Sign up**
2. Click **"Site owner? Create admin account"**
3. Enter your details and the admin key: `lemod-admin-secret`
4. You'll land in the **Admin Panel**

### 3. Share the site with friends

They sign up normally (without admin key) and start chatting. You reply from the admin panel!

## Admin Key

Default key: `lemod-admin-secret`

To change it, set the environment variable before starting the server:

```bash
LEMOD_ADMIN_KEY=your-secret-key npm run server
```

## Features

- User registration & login
- ChatGPT-style interface for users
- Admin panel with all conversations
- Red badge when someone is waiting for a reply
- Auto-polling so new messages appear in real time
- Typing indicator for users while you type

## Tech Stack

- React + Vite (frontend)
- Node.js + Express (backend)
- SQLite (database)
- JWT + bcrypt (auth)

---

🎭 Have fun pranking your friends!
