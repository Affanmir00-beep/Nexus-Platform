import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, User, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('entrepreneur');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await register(name, email, password, role);
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{
      minHeight: '100vh',
      padding: '1rem',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%), radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
    }}>
      <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary), #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
          }}>N</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            NEXUS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Welcome back, sign in to continue' : 'Join the collaboration platform'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--danger)',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  required
                />
                <User style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                required
              />
              <Mail style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                required
                minLength={6}
              />
              <Lock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            </div>
          </div>

          {!isLogin && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">I am a...</label>
              <select
                className="form-input"
                style={{ width: '100%' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="entrepreneur">Entrepreneur</option>
                <option value="investor">Investor</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
              position: 'relative'
            }}
          >
            {loading ? (
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isLogin ? (
              <><LogIn size={18} style={{ marginRight: '0.5rem' }} /> Sign In</>
            ) : (
              <><UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Create Account</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
