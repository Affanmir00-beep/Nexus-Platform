import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../context/AuthContext';

interface Doc {
  _id: string;
  title: string;
  status: string;
  filePath: string;
  createdAt: string;
}

export default function DocumentChamber() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setError('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', file.name);

    try {
      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus('success');
      setDocuments(prev => [res.data, ...prev]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      setError(err.response?.data?.msg || 'Upload failed. Please try again.');
    }
  };

  const handleSign = async (docId: string) => {
    // For now, create a simple signature (in production, you'd use a canvas-based signature pad)
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 24px Georgia';
        ctx.fillStyle = '#6366f1';
        ctx.fillText('Signed ✓', 20, 40);
      }
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append('signature', blob, 'signature.png');
        await api.post(`/documents/${docId}/sign`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fetchDocuments();
      });
    } catch (err) {
      console.error('Sign failed:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-col gap-4">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={20} style={{ color: 'var(--primary)' }} /> Upload New Document
        </h2>
        <div
          className="flex flex-col items-center justify-center"
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            background: 'rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-main)', fontWeight: 500 }}>
            {file ? file.name : "Click to upload or drag and drop"}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            PDF, DOCX, JPG, PNG up to 10MB
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.jpg,.png"
          />
        </div>

        {file && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploadStatus === 'uploading'}
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div style={{ marginTop: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> Document uploaded successfully!
          </div>
        )}

        {error && (
          <div style={{ marginTop: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} /> Your Documents
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        </h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No documents yet. Upload your first one above!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map(doc => (
              <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileText size={24} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p style={{ fontWeight: 500 }}>{doc.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded on {formatDate(doc.createdAt)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: doc.status === 'signed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: doc.status === 'signed' ? 'var(--success)' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {doc.status === 'signed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {doc.status.toUpperCase()}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => doc.status === 'pending' ? handleSign(doc._id) : window.open(doc.filePath, '_blank')}
                  >
                    {doc.status === 'pending' ? 'Sign Now' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
