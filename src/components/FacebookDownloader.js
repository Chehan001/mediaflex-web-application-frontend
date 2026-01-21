import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  Video,
  User,
  Clock,
  Eye,
  Film,
  Sparkles,
  HardDrive,
  Check,
  Facebook,
  Lock,
  Globe
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const FacebookDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Progress states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  // Server health states
  // eslint-disable-next-line no-unused-vars
  const [_serverHealth, setServerHealth] = useState(null);
  const [cookieWarning, setCookieWarning] = useState('');
  const [diskWarning, setDiskWarning] = useState('');

  const eventSourceRef = useRef(null);

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        setServerHealth(response.data);

        if (response.data.cookieStatus && !response.data.cookieStatus.valid) {
          setCookieWarning('Facebook cookies not configured. Some videos may be restricted.');
        }

        if (response.data.diskSpace && !response.data.diskSpace.sufficient) {
          setDiskWarning(response.data.diskSpace.message);
        }
      } catch (err) {
        console.error('Failed to check server health:', err);
      }
    };

    checkServerHealth();
  }, []);

  // 🚀 TRIGGER AUTO-FETCH if initialUrl is present
  useEffect(() => {
    if (initialUrl) {
      handleUrlSubmit(new Event('submit'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  // Validate Facebook URL
  const isValidFacebookUrl = (inputUrl) => {
    const fbPatterns = [
      /facebook\.com\/.*\/videos\//i,
      /facebook\.com\/watch/i,
      /facebook\.com\/reel/i,
      /fb\.watch\//i,
      /facebook\.com\/.*\/posts\//i,
      /facebook\.com\/share\/v\//i,
      /facebook\.com\/share\/r\//i,  // Reel share links
      /facebook\.com\/share\//i,      // General share links
      /facebook\.com\/.*video\.php/i,
      /facebook\.com\/stories\//i,
      /facebook\.com\/.*\/reels\//i
    ];
    return fbPatterns.some(pattern => pattern.test(inputUrl));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a Facebook URL');
      return;
    }

    if (!isValidFacebookUrl(url)) {
      setError('Please enter a valid Facebook video URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setSelectedFormat(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/facebook/video-info`, { url });
      setVideoInfo(response.data);
      setSuccess('Video found! Select a quality to download.');

      // Auto-select best quality
      if (response.data.formats && response.data.formats.length > 0) {
        setSelectedFormat(response.data.formats[0]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';

      // Friendly error messages for Facebook
      if (errorMsg.includes('login') || errorMsg.includes('private')) {
        setError('🔒 This video is private or requires login. Please check if the video is public.');
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('removed')) {
        setError('❌ This video is unavailable or has been removed.');
      } else if (errorMsg.includes('region')) {
        setError('🌍 This video is not available in your region.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleDownload = async () => {
    if (!selectedFormat) {
      setError('Please select a format');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Starting download...');
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/facebook/download-start`, {
        url,
        formatId: selectedFormat.formatId,
        quality: selectedFormat.quality,
        estimatedSize: selectedFormat.filesize || 0
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
        setDiskWarning(err.response.data.message);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Download failed');
      }
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage('');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatViewCount = (count) => {
    if (!count) return '0';
    const num = parseInt(count);
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="fb-downloader">
      {/* Cookie Warning */}
      {cookieWarning && (
        <div className="warning-banner cookie-warning">
          <Lock size={16} />
          <span>{cookieWarning}</span>
        </div>
      )}

      {/* Disk Space Warning */}
      {diskWarning && (
        <div className="warning-banner disk-warning">
          <HardDrive size={16} />
          <span>{diskWarning}</span>
        </div>
      )}

      {/* Supported Video Types */}
      <div className="supported-types-banner" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(24, 119, 242, 0.1) 0%, rgba(24, 119, 242, 0.05) 100%)',
        border: '1px solid rgba(24, 119, 242, 0.2)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.9rem'
      }}>
        <Video size={20} style={{ color: '#1877F2', flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#1877F2' }}>Supported:</strong> Videos • Reels • Watch • Stories • Live • Private Videos (with cookies)
        </span>
      </div>

      {/* URL Input Section */}
      <div className="input-section">
        <div className="input-header">
          <Link2 size={20} className="input-icon" />
          <span>Paste Facebook Video URL</span>
        </div>

        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.facebook.com/watch?v=..."
              className="url-input"
              disabled={loading || downloading}
            />
            <button
              type="submit"
              className="fetch-btn"
              disabled={loading || downloading || !url.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Get Video</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="url-hints">
          <span className="hint">Supported: facebook.com/watch, fb.watch, facebook.com/reel, facebook.com/share</span>
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

      {/* Video Info Display */}
      {videoInfo && (
        <div className="video-info-section">
          {/* Video Preview */}
          <div className="video-preview">
            <div className="thumbnail-container">
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="thumbnail"
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <Film size={48} />
                </div>
              )}
              <div className="duration-badge">
                <Clock size={12} />
                {formatDuration(videoInfo.duration)}
              </div>
              <div className="platform-badge">
                <Facebook size={12} />
                Facebook
              </div>
            </div>

            <div className="video-details">
              <h3 className="video-title">{videoInfo.title || 'Facebook Video'}</h3>

              <div className="video-meta">
                {videoInfo.author && (
                  <div className="meta-item">
                    <User size={14} />
                    <span>{videoInfo.author}</span>
                  </div>
                )}
                {videoInfo.viewCount && (
                  <div className="meta-item">
                    <Eye size={14} />
                    <span>{formatViewCount(videoInfo.viewCount)} views</span>
                  </div>
                )}
                {videoInfo.isPrivate !== undefined && (
                  <div className="meta-item">
                    {videoInfo.isPrivate ? (
                      <>
                        <Lock size={14} />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe size={14} />
                        <span>Public</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quality Selection */}
          <div className="formats-section">
            <div className="formats-header">
              <Video size={18} />
              <span>Select Quality</span>
              <span className="formats-note">Facebook videos include audio</span>
            </div>

            <div className="formats-grid">
              {videoInfo.formats && videoInfo.formats.map((format, index) => (
                <div
                  key={format.formatId || index}
                  className={`format-card ${selectedFormat?.formatId === format.formatId ? 'selected' : ''}`}
                  onClick={() => !downloading && setSelectedFormat(format)}
                >
                  <div className="format-header">
                    <span className="format-quality">
                      {format.quality}
                    </span>
                    {format.quality?.includes('HD') && (
                      <span className="hd-badge">
                        <Sparkles size={10} />
                        HD
                      </span>
                    )}
                  </div>

                  <div className="format-details">
                    <span className="format-container">{format.container?.toUpperCase() || 'MP4'}</span>
                    <span className="format-size">{formatFileSize(format.filesize)}</span>
                  </div>

                  <div className="format-features">
                    <span className="feature">
                      <Video size={12} />
                      Video
                    </span>
                    <span className="feature">
                      <Check size={12} />
                      Audio
                    </span>
                  </div>

                  {selectedFormat?.formatId === format.formatId && (
                    <div className="selected-indicator">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="progress-section">
              <div className="progress-header">
                <Loader2 size={18} className="spin" />
                <span>{downloadStage}</span>
                <span className="progress-percent">{Math.round(downloadProgress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!selectedFormat || downloading}
            className="download-btn"
          >
            {downloading ? (
              <>
                <Loader2 size={20} className="spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Download {selectedFormat?.quality || 'Video'}</span>
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        .fb-downloader {
          width: 100%;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .cookie-warning {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }

        .disk-warning {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .input-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
        }

        .input-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: var(--gray-300);
          font-weight: 500;
        }

        .input-icon {
          color: #3b82f6;
        }

        .url-form {
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          gap: 12px;
        }

        .url-input {
          flex: 1;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
        }

        .url-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .url-input::placeholder {
          color: var(--gray-500);
        }

        .fetch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .fetch-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }

        .fetch-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .url-hints {
          margin-top: 12px;
        }

        .hint {
          color: var(--gray-500);
          font-size: 12px;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .video-info-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
        }

        .video-preview {
          display: flex;
          gap: 24px;
          margin-bottom: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .thumbnail-container {
          position: relative;
          flex-shrink: 0;
          width: 280px;
          border-radius: 16px;
          overflow: hidden;
        }

        .thumbnail {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
        }

        .duration-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }

        .platform-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
        }

        .video-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .video-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          margin-bottom: 16px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .video-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gray-400);
          font-size: 13px;
        }

        .meta-item svg {
          color: var(--gray-500);
        }

        .formats-section {
          margin-bottom: 24px;
        }

        .formats-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: var(--gray-300);
          font-weight: 500;
        }

        .formats-header svg {
          color: #3b82f6;
        }

        .formats-note {
          margin-left: auto;
          font-size: 12px;
          color: var(--gray-500);
          font-weight: 400;
        }

        .formats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .format-card {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .format-card:hover {
          background: rgba(59, 130, 246, 0.08);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .format-card.selected {
          background: rgba(59, 130, 246, 0.15);
          border-color: #3b82f6;
        }

        .format-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .format-quality {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }

        .hd-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 6px;
          font-size: 10px;
          color: white;
          font-weight: 600;
        }

        .format-details {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .format-container, .format-size {
          font-size: 12px;
          color: var(--gray-400);
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .format-features {
          display: flex;
          gap: 10px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--gray-400);
        }

        .feature svg {
          color: #4ade80;
        }

        .selected-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .progress-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--gray-300);
          font-size: 14px;
        }

        .progress-percent {
          margin-left: auto;
          font-weight: 600;
          color: #3b82f6;
        }

        .progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .download-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);
        }

        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.45);
        }

        .download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .input-section, .video-info-section {
            padding: 20px;
          }

          .input-wrapper {
            flex-direction: column;
          }

          .fetch-btn {
            width: 100%;
            justify-content: center;
          }

          .video-preview {
            flex-direction: column;
          }

          .thumbnail-container {
            width: 100%;
          }

          .formats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default FacebookDownloader;
