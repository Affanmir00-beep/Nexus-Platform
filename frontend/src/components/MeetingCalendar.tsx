import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Plus, Check, X, AlertCircle } from 'lucide-react';
import { api } from '../context/AuthContext';

interface Meeting {
  _id: string;
  title: string;
  date: string;
  status: string;
  roomId: string;
  requester: { name: string; email: string } | string;
  participant: { name: string; email: string } | string;
}

export default function MeetingCalendar() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', participant: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await api.get('/meetings');
      setMeetings(res.data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!newMeeting.title || !newMeeting.date) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/meetings', {
        title: newMeeting.title,
        date: newMeeting.date,
        participant: newMeeting.participant || undefined
      });
      setMeetings(prev => [res.data, ...prev]);
      setShowModal(false);
      setNewMeeting({ title: '', date: '', participant: '' });
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (meetingId: string, status: string) => {
    try {
      await api.put(`/meetings/${meetingId}`, { status });
      fetchMeetings();
    } catch (err: any) {
      console.error('Failed to update meeting:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getParticipantName = (p: Meeting['participant']) => {
    if (typeof p === 'object' && p !== null) return p.name;
    return 'Participant';
  };

  const upcoming = meetings.filter(m => m.status === 'accepted' || m.status === 'pending');
  const past = meetings.filter(m => m.status === 'rejected' || m.status === 'completed');

  return (
    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
      <div className="card" style={{ flex: '2 1 500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} style={{ color: 'var(--primary)' }} /> Your Schedule
          </h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Schedule Meeting
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading meetings...</p>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No meetings scheduled yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Click "Schedule Meeting" to get started!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.length > 0 && (
              <>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Upcoming</h4>
                {upcoming.map(meeting => (
                  <div key={meeting._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
                        <CalendarIcon size={24} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '1rem' }}>{meeting.title}</p>
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} /> {formatDate(meeting.date)} at {formatTime(meeting.date)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Users size={14} /> {getParticipantName(meeting.participant)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {meeting.status === 'pending' ? (
                        <>
                          <button className="btn btn-secondary" style={{ color: 'var(--success)', borderColor: 'var(--success)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleStatusUpdate(meeting._id, 'accepted')}>
                            <Check size={14} style={{ marginRight: '0.25rem' }} /> Accept
                          </button>
                          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleStatusUpdate(meeting._id, 'rejected')}>
                            <X size={14} style={{ marginRight: '0.25rem' }} /> Decline
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500, fontSize: '0.85rem' }}>
                          <Check size={16} /> Accepted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem', marginBottom: '0.5rem' }}>Past / Declined</h4>
                {past.map(meeting => (
                  <div key={meeting._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', opacity: 0.6 }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <CalendarIcon size={18} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 500 }}>{meeting.title}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{meeting.status}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ flex: '1 1 280px' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Quick Stats</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Meetings</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{meetings.length}</p>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{meetings.filter(m => m.status === 'pending').length}</p>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Accepted</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{meetings.filter(m => m.status === 'accepted').length}</p>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Schedule New Meeting</h2>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Meeting Title</label>
              <input type="text" className="form-input" placeholder="e.g. Investment Pitch Discussion" value={newMeeting.title} onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))} style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input type="datetime-local" className="form-input" value={newMeeting.date} onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))} style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Participant Email (optional)</label>
              <input type="email" className="form-input" placeholder="investor@example.com" value={newMeeting.participant} onChange={(e) => setNewMeeting(prev => ({ ...prev, participant: e.target.value }))} style={{ width: '100%' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSchedule} disabled={submitting || !newMeeting.title || !newMeeting.date}>
                {submitting ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
