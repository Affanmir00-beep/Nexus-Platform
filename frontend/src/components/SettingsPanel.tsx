import { useState } from 'react';
import { User, Lock, Shield, CheckCircle, AlertCircle, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth, api } from '../context/AuthContext';

export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
      {/* Settings Nav */}
      <div className="card" style={{ flex: '0 0 220px' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Settings</h3>
        {[
          { id: 'profile', label: 'Profile', icon: <User size={16} /> },
          { id: 'security', label: 'Security', icon: <Lock size={16} /> },
          { id: 'two-factor', label: 'Two-Factor Auth', icon: <Shield size={16} /> },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: activeSection === item.id ? 'var(--surface-hover)' : 'transparent',
              border: 'none',
              color: activeSection === item.id ? 'var(--primary)' : 'var(--text-main)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: activeSection === item.id ? 600 : 400,
              transition: 'var(--transition)',
              marginBottom: '0.25rem'
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card" style={{ flex: '1 1 400px' }}>
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'security' && <SecuritySection />}
        {activeSection === 'two-factor' && <TwoFactorSection />}
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await updateProfile({ bio } as any);
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <User size={20} style={{ color: 'var(--primary)' }} /> Profile Settings
      </h2>

      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input type="text" className="form-input" value={user?.name || ''} disabled style={{ width: '100%', opacity: 0.7 }} />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name cannot be changed. Contact support if needed.</p>
      </div>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" className="form-input" value={user?.email || ''} disabled style={{ width: '100%', opacity: 0.7 }} />
      </div>

      <div className="form-group">
        <label className="form-label">Role</label>
        <input type="text" className="form-input" value={user?.role || ''} disabled style={{ width: '100%', opacity: 0.7, textTransform: 'capitalize' }} />
      </div>

      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea
          className="form-input"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell investors/entrepreneurs about yourself..."
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {msg && (
        <div style={{ marginBottom: '1rem', color: msg.includes('success') ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        <Save size={16} style={{ marginRight: '0.5rem' }} />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setMsg('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await api.put('/auth/profile', { password: newPassword });
      setMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Lock size={20} style={{ color: 'var(--primary)' }} /> Security Settings
      </h2>

      <div className="form-group">
        <label className="form-label">Current Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            className="form-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            style={{ width: '100%', paddingRight: '2.5rem' }}
          />
          <button
            onClick={() => setShowPwd(!showPwd)}
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">New Password</label>
        <input
          type="password"
          className="form-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          style={{ width: '100%' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <input
          type="password"
          className="form-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          style={{ width: '100%' }}
        />
      </div>

      {msg && (
        <div style={{ marginBottom: '1rem', color: msg.includes('success') ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          {msg.includes('success') ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
        <Lock size={16} style={{ marginRight: '0.5rem' }} />
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
}

function TwoFactorSection() {
  const [enabled, setEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const handleToggle = () => {
    if (enabled) {
      setEnabled(false);
      setMsg('Two-factor authentication disabled.');
      setTimeout(() => setMsg(''), 3000);
    } else {
      setShowSetup(true);
    }
  };

  const handleVerify = () => {
    if (code.length === 6) {
      setEnabled(true);
      setShowSetup(false);
      setCode('');
      setMsg('Two-factor authentication enabled successfully!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={20} style={{ color: 'var(--primary)' }} /> Two-Factor Authentication
      </h2>

      <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Authenticator App</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use an authenticator app (like Google Authenticator) for extra security.</p>
          </div>
          <button
            className={`btn ${enabled ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggle}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {enabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <CheckCircle size={18} /> Two-factor authentication is active.
        </div>
      )}

      {showSetup && (
        <div className="animate-fade-in" style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Setup Verification</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Enter the 6-digit code from your authenticator app to complete setup.
          </p>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px dashed var(--border)' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Secret Key (demo)</p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--primary)' }}>NXUS-DEMO-2FA-KEY</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="form-input"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ flex: 1, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', fontSize: '1.25rem' }}
            />
            <button className="btn btn-primary" onClick={handleVerify} disabled={code.length !== 6}>
              Verify
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ color: msg.includes('enabled') || msg.includes('disabled') ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}
    </div>
  );
}
