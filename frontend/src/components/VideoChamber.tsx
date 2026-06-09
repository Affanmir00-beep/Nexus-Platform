import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth, api } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface Meeting {
  _id: string;
  title: string;
  roomId: string;
  date: string;
  status: string;
  requester: { name: string; _id: string };
  participant?: { name: string; _id: string };
}

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'https://backend-pi-one-71.vercel.app';

export default function VideoChamber() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [customRoomId, setCustomRoomId] = useState('');
  const [error, setError] = useState('');

  // Call States
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [statusText, setStatusText] = useState('Initializing local stream...');

  // WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // STUN Servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const res = await api.get('/meetings');
      // Show accepted meetings or pending meetings as options to call
      setMeetings(res.data.filter((m: Meeting) => m.status === 'accepted'));
    } catch (err) {
      console.error('Failed to load meetings for video room list:', err);
    }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error('Media devices access error:', err);
      setError('Could not access camera/microphone. Please verify permissions.');
      throw err;
    }
  };

  const initializeCall = async (roomId: string) => {
    setError('');
    setInCall(true);
    setStatusText('Accessing media devices...');

    let localStream: MediaStream;
    try {
      localStream = await startLocalStream();
    } catch {
      setInCall(false);
      return;
    }

    setStatusText('Connecting to signaling server...');
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit('join-room', roomId, user?.id);

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Remote track handler
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatusText('Connected to Peer');
      }
    };

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          roomId,
          userId: user?.id,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    socket.on('user-connected', async () => {
      setStatusText('Peer joined. Initiating offer...');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', {
          roomId,
          userId: user?.id,
          signal: offer
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    });

    socket.on('signal', async (data) => {
      const { signal } = data;

      try {
        if (signal.type === 'offer') {
          setStatusText('Processing offer...');
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            roomId,
            userId: user?.id,
            signal: answer
          });
          setStatusText('Answer sent');
        } else if (signal.type === 'answer') {
          setStatusText('Processing answer...');
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Signal handling error:', err);
      }
    });

    socket.on('user-disconnected', () => {
      setStatusText('Peer left the room.');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });
  };

  const handleJoinCall = (roomId: string) => {
    setActiveRoom(roomId);
    initializeCall(roomId);
  };

  const handleCustomJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomId.trim()) return;
    handleJoinCall(customRoomId.trim());
  };

  const handleEndCall = () => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close Peer Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Disconnect Socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset UI State
    setInCall(false);
    setActiveRoom(null);
    setCustomRoomId('');
    setStatusText('Call ended.');
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoOn;
        setVideoOn(!videoOn);
      }
    }
  };

  if (!inCall) {
    return (
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        {/* Call Room List */}
        <div className="card" style={{ flex: '2 1 400px' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} /> Call Room Lobby
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Select an scheduled meeting below to enter the secure room, or create/join a custom room.
          </p>

          {error && (
            <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {meetings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No active accepted meetings. Schedule a meeting to create a room.
              </p>
            ) : (
              meetings.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'var(--surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{m.title}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      With {user?.role === 'investor' ? m.requester?.name : m.participant?.name || m.requester?.name}
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleJoinCall(m.roomId)}>
                    Join Room
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Custom Room Card */}
        <div className="card" style={{ flex: '1 1 300px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Join by Room ID</h3>
          <form onSubmit={customRoomId.trim() ? handleCustomJoin : (e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. meeting-room-id"
              value={customRoomId}
              onChange={(e) => setCustomRoomId(e.target.value)}
              style={{ width: '100%' }}
            />
            <button className="btn btn-primary" type="submit" disabled={!customRoomId.trim()}>
              Join Custom Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      <div style={{ flex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Remote Video Container */}
        <div style={{ flex: '2 1 450px', background: '#000', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden', minHeight: '300px' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.6)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusText.includes('Connected') ? 'var(--success)' : 'var(--warning)' }} />
            {statusText}
          </div>
        </div>

        {/* Local Feed & Sidebar */}
        <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Local Video */}
          <div style={{ height: '200px', background: '#1e293b', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'white' }}>
              You (Local Feed)
            </div>
          </div>

          {/* Room details */}
          <div className="card" style={{ flex: 1, padding: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Room Info</h4>
            <p style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              Room ID: {activeRoom}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span>Signaling Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="card glass flex items-center justify-center gap-4" style={{ padding: '0.75rem', borderRadius: 'var(--radius-full)', maxWidth: '400px', margin: '0 auto' }}>
        <button
          onClick={toggleMic}
          style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: micOn ? 'var(--surface-hover)' : 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          onClick={toggleVideo}
          style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: videoOn ? 'var(--surface-hover)' : 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
          title={videoOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button
          onClick={handleEndCall}
          style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
          title="End Call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
