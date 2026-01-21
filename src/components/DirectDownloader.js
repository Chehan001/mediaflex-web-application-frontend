import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  FileVideo,
  HardDrive
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const DirectDownloader = () => {
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Progress states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  const eventSourceRef = useRef(null);

  // Validate direct URL
  const isValidDirectUrl = (inputUrl) => {
    const directPatterns = [
      /googlevideo\.com\/videoplayback/i,
      /\.googlevideo\.com/i,
      /ytimg\.com/i,
      /\.mp4(\?|$)/i,
      /\.webm(\?|$)/i,
      /\.mkv(\?|$)/i,
    ];
    return directPatterns.some(pattern => pattern.test(inputUrl));
  };

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleDownload = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a direct video URL');
      return;
    }

    if (!isValidDirectUrl(url)) {
      setError('Please enter a valid direct video URL (googlevideo.com, .mp4, .webm)');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Starting download...');
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/direct/download-start`, {
        url,
        filename: filename.trim() || undefined
      });

      const { downloadId } = response.data;

      // Connect to SSE for progress updates
      const eventSource = new EventSource(`${API_BASE_URL}/download-progress/${downloadId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'downloading' || data.status === 'processing') {
          setDownloadProgress(data.progress || 0);
          setDownloadStage(data.stage || 'Processing...');
        } else if (data.status === 'completed') {
          setDownloadProgress(100);
          setDownloadStage('Download ready!');
          eventSource.close();

          // Trigger file download
          const link = document.createElement('a');
          link.href = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(data.filename)}`;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setSuccess('Download completed successfully!');
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage('');
        } else if (data.status === 'error') {
          eventSource.close();
          setError(data.message || 'Download failed');
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage('');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setError('Connection lost. Please try again.');
        setDownloading(false);
        setDownloadProgress(0);
        setDownloadStage('');
      };

    } catch (err) {
      if (err.response?.status === 507) {
        setError(`💾 ${err.response.data.message || 'Insufficient disk space'}`);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Download failed');
      }
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage('');
    }
  };

  return (
    <div className="direct-downloader">
      {/* Supported Video Types */}
      <div className="supported-types-banner" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.2) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.9rem'
      }}>
        <Link2 size={20} style={{ color: '#818CF8', flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#818CF8' }}>Supported:</strong> MP4 • WebM • M3U8/HLS • MKV • Direct URLs • 1000+ Sites via yt-dlp
        </span>
      </div>

      {/* URL Input Section */}
      <div className="input-section direct-input">
        <div className="input-header">
          <Link2 size={20} className="input-icon direct-icon-color" />
          <span>Paste Direct Video URL</span>
        </div>

        <form onSubmit={handleDownload} className="url-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://...googlevideo.com/videoplayback/... or direct .mp4 link"
              className="url-input direct-input-field"
              disabled={downloading}
            />
          </div>

          {/* Optional filename input */}
          <div className="input-wrapper" style={{ marginTop: '12px' }}>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Custom filename (optional) - e.g., my_video.mp4"
              className="url-input direct-input-field"
              disabled={downloading}
              style={{ flex: 1 }}
            />
          </div>

          <button
            type="submit"
            className="download-btn direct-download-btn"
            disabled={downloading || !url.trim()}
            style={{ marginTop: '16px' }}
          >
            {downloading ? (
              <>
                <Loader2 size={20} className="spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Download Now</span>
              </>
            )}
          </button>
        </form>

        <div className="url-hints">
          <span className="hint">Supported: googlevideo.com streams, direct .mp4, .webm, .mkv links</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="message error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="message success-message">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Download Progress */}
      {downloading && (
        <div className="video-info-section direct-video-section">
          <div className="video-preview" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="thumbnail-placeholder" style={{ width: '120px', height: '120px', marginBottom: '16px' }}>
              <FileVideo size={48} />
            </div>
            <h3 className="video-title">Direct URL Download</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px' }}>
              Downloading video stream directly...
            </p>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <Loader2 size={18} className="spin" />
              <span>{downloadStage}</span>
              <span className="progress-percent direct-progress">{Math.round(downloadProgress)}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar direct-progress-bar"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="info-box" style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h4 style={{ color: '#10B981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={18} />
          What are Direct URLs?
        </h4>
        <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Direct stream URLs from video players (googlevideo.com)</li>
          <li>Raw video file links ending in .mp4, .webm, .mkv</li>
          <li>These URLs may expire quickly - download immediately</li>
          <li>No processing needed - direct file transfer</li>
        </ul>
      </div>
    </div>
  );
};

export default DirectDownloader;
