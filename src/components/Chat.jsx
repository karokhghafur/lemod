import { useState, useEffect, useRef, useCallback } from 'react';
import { useSidebar } from '../hooks/useSidebar';

function Message({ role, content }) {
  return (
    <div className={`message message-${role}`}>
      <div className="message-avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-role">
          {role === 'user' ? 'You' : 'Lemod AI'}
        </div>
        <div className="message-text">{content}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message message-assistant">
      <div className="message-avatar">🤖</div>
      <div className="message-content">
        <div className="message-role">Lemod AI</div>
        <div className="typing-indicator">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

export default function Chat({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [awaitingReply, setAwaitingReply] = useState(false);
  const { sidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('lemod_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const loadConversations = async () => {
    const res = await fetch('/api/conversations', { headers });
    const data = await res.json();
    setConversations(data.conversations || []);
  };

  const loadMessages = useCallback(async (convId, silent = false) => {
    const res = await fetch(`/api/conversations/${convId}/messages`, { headers });
    const data = await res.json();
    if (!silent) setActiveConv(convId);
    setMessages(data.messages || []);
    setAwaitingReply(data.awaitingReply || false);
    return data;
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, awaitingReply]);

  useEffect(() => {
    if (!activeConv || !awaitingReply) return;
    const interval = setInterval(() => loadMessages(activeConv, true), 2000);
    return () => clearInterval(interval);
  }, [activeConv, awaitingReply, loadMessages]);

  const newConversation = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'New chat' }),
    });
    const data = await res.json();
    setConversations((prev) => [data.conversation, ...prev]);
    setActiveConv(data.conversation.id);
    setMessages([]);
    setAwaitingReply(false);
    closeSidebar();
    inputRef.current?.focus();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || awaitingReply) return;

    let convId = activeConv;

    if (!convId) {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'New chat' }),
      });
      const data = await res.json();
      convId = data.conversation.id;
      setActiveConv(convId);
      setConversations((prev) => [data.conversation, ...prev]);
    }

    const userContent = input.trim();
    setInput('');

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: userContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [...prev, data.userMessage]);
      setAwaitingReply(true);
      loadConversations();
    } catch (err) {
      alert(err.message);
      setInput(userContent);
    }

    inputRef.current?.focus();
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${convId}`, {
      method: 'DELETE',
      headers,
    });
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConv === convId) {
      setActiveConv(null);
      setMessages([]);
      setAwaitingReply(false);
    }
  };

  const openConversation = (convId) => {
    loadMessages(convId);
    closeSidebar();
  };

  return (
    <div className="chat-layout">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={newConversation}>
            <span>+</span> New chat
          </button>
        </div>

        <div className="conversations-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${activeConv === conv.id ? 'active' : ''}`}
              onClick={() => openConversation(conv.id)}
            >
              <span className="conv-icon">💬</span>
              <span className="conv-title">{conv.title}</span>
              <button
                className="conv-delete"
                onClick={(e) => deleteConversation(conv.id, e)}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">👤</span>
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
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <div className="header-title">
            <span className="header-logo">🤖</span>
            <span>Lemod AI</span>
            <span className="header-badge">GPT-5</span>
          </div>
          <div className="header-model">Artificial Intelligence</div>
        </header>

        <div className="messages-area">
          {messages.length === 0 && !awaitingReply ? (
            <div className="welcome-screen">
              <div className="welcome-logo">🤖</div>
              <h2>Hello, {user.name}!</h2>
              <p>I'm Lemod AI — advanced artificial intelligence</p>
              <p className="welcome-sub">What would you like to ask?</p>
              <div className="suggestion-chips">
                {[
                  'How can I get smarter?',
                  'Tell me about yourself',
                  'Help me with a project',
                  'Tell me a short story',
                ].map((s) => (
                  <button
                    key={s}
                    className="chip"
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <Message key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {awaitingReply && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className="input-area" onSubmit={sendMessage}>
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={awaitingReply ? 'Waiting for Lemod AI...' : 'Message Lemod AI...'}
              rows={1}
              disabled={awaitingReply}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!input.trim() || awaitingReply}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className="input-disclaimer">
            Lemod AI can make mistakes. Check important information.
          </p>
        </form>
      </main>
    </div>
  );
}
