import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lemod_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('lemod_token'))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (token, userData) => {
    localStorage.setItem('lemod_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('lemod_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="logo-pulse">🤖</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  if (user.role === 'admin') {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  return <Chat user={user} onLogout={handleLogout} />;
}
