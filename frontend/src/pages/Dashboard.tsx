import { useState, useEffect } from 'react';
import { Calendar, Video, FileText, CreditCard, LogOut, Settings, BarChart3, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

import DocumentChamber from '../components/DocumentChamber';
import MeetingCalendar from '../components/MeetingCalendar';
import VideoChamber from '../components/VideoChamber';
import PaymentSection from '../components/PaymentSection';
import SettingsPanel from '../components/SettingsPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ meetings: 0, documents: 0, transactions: '$0' });

  useEffect(() => {
    async function loadStats() {
      try {
        const [meetingsRes, docsRes, txRes] = await Promise.allSettled([
          api.get('/meetings'),
          api.get('/documents'),
          api.get('/payments/history'),
        ]);

        const meetingCount = meetingsRes.status === 'fulfilled' ? meetingsRes.value.data.length : 0;
        const docCount = docsRes.status === 'fulfilled' ? docsRes.value.data.length : 0;
        const txTotal = txRes.status === 'fulfilled'
          ? txRes.value.data.reduce((acc: number, t: any) => acc + t.amount, 0)
          : 0;

        setStats({
          meetings: meetingCount,
          documents: docCount,
          transactions: `$${txTotal.toLocaleString()}`
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
    }
    loadStats();
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={20} /> },
    { id: 'meetings', label: 'Meetings', icon: <Calendar size={20} /> },
    { id: 'video', label: 'Video Chamber', icon: <Video size={20} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={20} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="glass" style={{ width: '260px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}>N</div>
            <div>
              <h2 style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.25rem', lineHeight: 1 }}>NEXUS</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user?.role || 'User'} Dashboard</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: activeTab === item.id ? 'var(--surface-hover)' : 'transparent',
                border: 'none',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left',
                borderLeft: activeTab === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'var(--transition)',
                fontSize: '0.9rem'
              }}
            >
              <span style={{ marginRight: '0.75rem', opacity: activeTab === item.id ? 1 : 0.7 }}>{item.icon}</span>
              <span style={{ fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}>{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0.6rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'var(--background)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {activeTab === 'overview' ? `Welcome back, ${user?.name?.split(' ')[0] || 'User'}` : activeTab}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {activeTab === 'overview' ? "Here's what's happening with your deals." : `Manage your ${activeTab}`}
            </p>
          </div>
        </header>

        {/* Tab Content */}
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 400 }}>Upcoming Meetings</h3>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.meetings}</p>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)' }}>
                      <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #a855f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 400 }}>Documents</h3>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.documents}</p>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)' }}>
                      <FileText size={20} style={{ color: '#a855f7' }} />
                    </div>
                  </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 400 }}>Total Transactions</h3>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.transactions}</p>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
                      <TrendingUp size={20} style={{ color: 'var(--success)' }} />
                    </div>
                  </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 400 }}>Your Role</h3>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{user?.role}</p>
                    </div>
                    <div style={{ padding: '0.5rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: 'var(--radius-md)' }}>
                      <Users size={20} style={{ color: 'var(--secondary)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setActiveTab('meetings')}>
                    <Calendar size={16} style={{ marginRight: '0.5rem' }} /> Schedule Meeting
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('documents')}>
                    <FileText size={16} style={{ marginRight: '0.5rem' }} /> Upload Document
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('video')}>
                    <Video size={16} style={{ marginRight: '0.5rem' }} /> Join Video Call
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('payments')}>
                    <CreditCard size={16} style={{ marginRight: '0.5rem' }} /> Make Deposit
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meetings' && <MeetingCalendar />}
          {activeTab === 'video' && <VideoChamber />}
          {activeTab === 'documents' && <DocumentChamber />}
          {activeTab === 'payments' && <PaymentSection />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}
