import { useState } from 'react';

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [showAdminSignup, setShowAdminSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body = isLogin
        ? { email, password }
        : {
            email,
            password,
            name: name || undefined,
            ...(showAdminSignup && adminKey ? { adminKey } : {}),
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </div>

      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-icon">🤖</div>
          <h1>Lemod AI</h1>
          <p className="auth-tagline">Advanced Artificial Intelligence</p>
        </div>

        <div className="auth-card">
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

          <form onSubmit={handleSubmit}>
            {!isLogin && (
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

            {!isLogin && showAdminSignup && (
              <div className="form-group">
                <label>Admin key</label>
                <input
                  type="password"
                  placeholder="Site owner secret key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">Please wait...</span>
              ) : isLogin ? (
                'Log in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="auth-footer">
            By using Lemod AI, you agree to our terms of service
          </p>

          {!isLogin && (
            <button
              type="button"
              className="admin-toggle-link"
              onClick={() => setShowAdminSignup(!showAdminSignup)}
            >
              {showAdminSignup ? 'Regular sign up' : 'Site owner? Create admin account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
