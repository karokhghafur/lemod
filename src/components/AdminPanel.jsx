import { useState, useEffect, useRef, useCallback } from 'react';

function Message({ role, content, label }) {
  return (
    <div className={`message message-${role}`}>
      <div className="message-avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-role">{label}</div>
        <div className="message-text">{content}</div>
      </div>
    </div>
  );
}

export default function AdminPanel({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [convInfo, setConvInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevPendingRef = useRef(0);

  const token = localStorage.getItem('lemod_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const loadMessages = useCallback(async (convId, silent = false) => {
    const res = await fetch(`/api/admin/conversations/${convId}/messages`, { headers });
    const data = await res.json();
    if (!res.ok) return null;
    setMessages(data.messages || []);
    setConvInfo(data.conversation);
    setAwaitingReply(data.awaitingReply);
    if (!silent) setActiveConv(convId);
    return data;
  }, [token]);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { headers });
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
  }, [token]);

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/admin/conversations', { headers });
    const data = await res.json();
    if (!res.ok) return [];
    const list = data.conversations || [];
    setConversations(list);
    return list;
  }, [token]);

  useEffect(() => {
    document.title = 'Lemod AI — Admin Panel';
    return () => { document.title = 'Lemod AI — Artificial Intelligence'; };
  }, []);

  useEffect(() => {
    const poll = async () => {
      const list = await loadConversations();
      const pending = list.filter((c) => c.awaitingReply);
      const pendingCount = pending.length;

      if (pendingCount > prevPendingRef.current) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch {
          // audio not available
        }

        const newest = pending[0];
        if (newest) {
          await loadMessages(newest.id);
          inputRef.current?.focus();
        }
      }

      prevPendingRef.current = pendingCount;
    };

    poll();
    loadUsers();
    const interval = setInterval(() => {
      poll();
      loadUsers();
    }, 2000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, loadUsers]);

  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => loadMessages(activeConv, true), 2000);
    return () => clearInterval(interval);
  }, [activeConv, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !awaitingReply) return;

    const content = input.trim();
    setInput('');

    try {
      const res = await fetch(`/api/admin/conversations/${activeConv}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [...prev, data.assistantMessage]);
      setAwaitingReply(false);
      loadConversations();
    } catch (err) {
      setInput(content);
      alert(err.message);
    }

    inputRef.current?.focus();
  };

  const pendingCount = conversations.filter((c) => c.awaitingReply).length;

  return (
    <div className="chat-layout admin-layout">
      <aside className={`sidebar admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="admin-badge">🛡️ Admin Panel</div>
          <div className="admin-tabs">
            <button
              className={!showUsers ? 'active' : ''}
              onClick={() => setShowUsers(false)}
            >
              Chats
            </button>
            <button
              className={showUsers ? 'active' : ''}
              onClick={() => setShowUsers(true)}
            >
              Users ({users.length})
            </button>
          </div>
          {pendingCount > 0 && !showUsers && (
            <div className="pending-alert">
              🔴 {pendingCount} new message{pendingCount > 1 ? 's' : ''}!
            </div>
          )}
        </div>

        <div className="conversations-list">
          {showUsers ? (
            users.length === 0 ? (
              <p className="empty-inbox">No users registered yet</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="user-card">
                  <div className="user-card-name">👤 {u.name}</div>
                  <div className="user-cred">
                    <span className="cred-label">Email</span>
                    <span className="cred-value">{u.email}</span>
                  </div>
                  <div className="user-cred">
                    <span className="cred-label">Password</span>
                    <span className="cred-value">{u.password || 'Not captured yet'}</span>
                  </div>
                </div>
              ))
            )
          ) : conversations.length === 0 ? (
            <div className="empty-inbox">
              <p>No messages yet</p>
              <p className="empty-hint">
                Open the site in another browser as a regular user, send a message, and it will appear here.
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${activeConv === conv.id ? 'active' : ''} ${conv.awaitingReply ? 'has-pending' : ''}`}
                onClick={() => loadMessages(conv.id)}
              >
                <span className="conv-icon">{conv.awaitingReply ? '🔴' : '💬'}</span>
                <div className="conv-meta">
                  <span className="conv-user">{conv.user_name}</span>
                  <span className="conv-creds">{conv.user_email}</span>
                  <span className="conv-title">{conv.title}</span>
                  {conv.last_message && (
                    <span className="conv-preview">
                      {conv.awaitingReply ? '⏳ ' : ''}{conv.last_message.slice(0, 50)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">🛡️</span>
            <span className="user-name">{user.name}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div className="header-title">
            <span className="header-logo">🛡️</span>
            <span>Reply as Lemod AI</span>
          </div>
          {convInfo && (
            <div className="header-model">
              {convInfo.user_name}
            </div>
          )}
        </header>

        {convInfo && (
          <div className="user-credentials-bar">
            <div className="cred-item">
              <span className="cred-label">Email</span>
              <span className="cred-value">{convInfo.user_email}</span>
            </div>
            <div className="cred-item">
              <span className="cred-label">Password</span>
              <span className="cred-value">{convInfo.user_password || 'Not captured yet — user must log in again'}</span>
            </div>
          </div>
        )}

        <div className="messages-area">
          {!activeConv ? (
            <div className="welcome-screen admin-welcome">
              <div className="welcome-logo">🛡️</div>
              <h2>How to use this</h2>
              <div className="admin-steps">
                <div className="admin-step">
                  <span className="step-num">1</span>
                  <p>Open <strong>another browser</strong> (or Incognito) and sign up as a <strong>regular user</strong></p>
                </div>
                <div className="admin-step">
                  <span className="step-num">2</span>
                  <p>In that browser, send a message to Lemod AI</p>
                </div>
                <div className="admin-step">
                  <span className="step-num">3</span>
                  <p>Come back here — the message appears in the sidebar with a 🔴</p>
                </div>
                <div className="admin-step">
                  <span className="step-num">4</span>
                  <p>Type your reply — the user thinks it's the AI responding!</p>
                </div>
              </div>
              {pendingCount > 0 && (
                <button
                  className="auth-submit open-pending-btn"
                  onClick={() => {
                    const pending = conversations.find((c) => c.awaitingReply);
                    if (pending) loadMessages(pending.id);
                  }}
                >
                  Open {pendingCount} waiting message{pendingCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  label={msg.role === 'user' ? convInfo?.user_name || 'User' : 'Lemod AI (you)'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {activeConv && (
          <form className="input-area admin-input-area" onSubmit={sendReply}>
            {awaitingReply ? (
              <>
                <div className="input-wrapper admin-reply-wrapper">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply(e);
                      }
                    }}
                    placeholder="Type your reply as Lemod AI..."
                    rows={2}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={!input.trim()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
                <p className="input-disclaimer admin-hint">
                  The user sees "typing..." — your reply appears as Lemod AI
                </p>
              </>
            ) : (
              <p className="input-disclaimer admin-waiting">
                Waiting for {convInfo?.user_name} to send another message...
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
