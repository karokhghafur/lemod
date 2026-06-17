import { useState } from 'react';

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (adminMode && !adminKey.trim()) {
      setError('Admin key is required');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body = isLogin
        ? { email, password, ...(adminMode && adminKey ? { adminKey } : {}) }
        : {
            email,
            password,
            name: name || undefined,
            wantAdmin: adminMode,
            ...(adminMode ? { adminKey } : {}),
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (adminMode && data.user.role !== 'admin') {
        throw new Error('Admin access failed. Check your admin key.');
      }

      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminMode = () => {
    setAdminMode(!adminMode);
    setAdminKey('');
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-icon">{adminMode ? '🛡️' : '🤖'}</div>
          <h1>Lemod AI</h1>
          <p className="auth-tagline">
            {adminMode ? 'Site owner access' : 'Advanced Artificial Intelligence'}
          </p>
        </div>

        <div className="auth-card">
          {!adminMode && (
            <div className="auth-tabs">
              <button
                className={isLogin ? 'active' : ''}
                onClick={() => { setIsLogin(true); setError(''); }}
              >
                Log in
              </button>
              <button
                className={!isLogin ? 'active' : ''}
                onClick={() => { setIsLogin(false); setError(''); }}
              >
                Sign up
              </button>
            </div>
          )}

          {adminMode && (
            <div className="admin-mode-banner">
              🛡️ Admin {isLogin ? 'login' : 'sign up'}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && !adminMode && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {!isLogin && adminMode && (
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>

            {adminMode && (
              <div className="form-group">
                <label>Admin key</label>
                <input
                  type="password"
                  placeholder="Enter admin secret key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  required
                />
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">Please wait...</span>
              ) : adminMode ? (
                isLogin ? 'Log in as admin' : 'Create admin account'
              ) : isLogin ? (
                'Log in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {!adminMode && (
            <p className="auth-footer">
              By using Lemod AI, you agree to our terms of service
            </p>
          )}

          <button
            type="button"
            className="admin-toggle-link"
            onClick={toggleAdminMode}
          >
            {adminMode
              ? '← Back to regular login'
              : '🛡️ Site owner? Admin login'}
          </button>
        </div>
      </div>
    </div>
  );
}
