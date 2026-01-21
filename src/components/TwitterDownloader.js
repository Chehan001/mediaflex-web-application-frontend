import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  User,
  Clock,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Sparkles,
  Film,
  Zap
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// X (Twitter) Logo SVG Component
const XLogo = ({ size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TwitterDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(null);

  // Progress states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  // Server health states
  const [diskWarning, setDiskWarning] = useState('');

  const eventSourceRef = useRef(null);

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);

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

  // Validate X/Twitter URL
  const isValidTwitterUrl = (inputUrl) => {
    const twitterPatterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i,           // Standard tweet URL
      /(?:mobile\.)?twitter\.com\/\w+\/status\/\d+/i,         // Mobile Twitter
      /(?:mobile\.)?x\.com\/\w+\/status\/\d+/i,               // Mobile X
      /t\.co\/\w+/i,                                           // Short t.co URL
    ];
    return twitterPatterns.some(pattern => pattern.test(inputUrl));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter an X (Twitter) URL');
      return;
    }

    if (!isValidTwitterUrl(url)) {
      setError('Please enter a valid X (Twitter) video URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setThumbnailError(false);
    setSelectedQuality(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/twitter/video-info`, { url });
      setVideoInfo(response.data);

      // Auto-select best quality (first option is always "Best Quality (Auto)")
      if (response.data.formats && response.data.formats.length > 0) {
        setSelectedQuality(response.data.formats[0].formatId);
      } else {
        // Fallback: set 'best' as default even if no formats returned
        setSelectedQuality('best');
      }

      setSuccess('Video found! Click download to save.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';

      // Friendly error messages for Twitter
      if (errorMsg.includes('private') || errorMsg.includes('protected')) {
        setError('🔒 This tweet is from a private/protected account.');
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('removed') || errorMsg.includes('deleted')) {
        setError('❌ This tweet has been deleted or is unavailable.');
      } else if (errorMsg.includes('no video') || errorMsg.includes('not contain')) {
        setError('🎬 This tweet does not contain a video.');
      } else if (errorMsg.includes('age') || errorMsg.includes('nsfw') || errorMsg.includes('sensitive')) {
        setError('🔞 Age-restricted content requires login.');
      } else if (errorMsg.includes('geo') || errorMsg.includes('region')) {
        setError('🌍 This content is not available in your region.');
      } else {
        setError(errorMsg);
      }
      console.error('Twitter video info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedQuality) {
      setError('Please select a quality first');
      return;
    }

    setDownloading(true);
    setError('');
    setSuccess('');
    setDownloadProgress(0);
    setDownloadStage('Starting download...');

    try {
      // Start download
      const response = await axios.post(`${API_BASE_URL}/twitter/download-start`, {
        url,
        formatId: selectedQuality,
        title: videoInfo.title
      });

      const { downloadId } = response.data;

      // Set up SSE for progress
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${API_BASE_URL}/download-progress/${downloadId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'downloading' || data.status === 'processing') {
          setDownloadProgress(data.progress || 0);
          setDownloadStage(data.stage || 'Downloading...');
        } else if (data.status === 'completed') {
          setDownloadProgress(100);
          setDownloadStage('Complete!');
          setSuccess('Download complete! Starting file download...');
          eventSource.close();

          // Trigger file download
          const downloadUrl = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(data.filename)}`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setDownloading(false);
        } else if (data.status === 'error') {
          setError(data.message || 'Download failed');
          eventSource.close();
          setDownloading(false);
        }
      };

      eventSource.onerror = () => {
        setError('Connection lost. Please try again.');
        eventSource.close();
        setDownloading(false);
      };

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start download';
      setError(errorMsg);
      setDownloading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Format number with K/M suffix
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="twitter-downloader">
      {/* Disk Warning */}
      {diskWarning && (
        <div className="disk-warning">
          <AlertCircle size={16} />
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
        background: 'linear-gradient(135deg, rgba(29, 161, 242, 0.1) 0%, rgba(20, 23, 26, 0.2) 100%)',
        border: '1px solid rgba(29, 161, 242, 0.3)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.9rem'
      }}>
        <XLogo size={20} style={{ color: '#1DA1F2', flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#1DA1F2' }}>Supported:</strong> Videos • GIFs • Spaces • Clips • Media • Protected Tweets (with cookies)
        </span>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleUrlSubmit} className="url-form">
        <div className="input-wrapper">
          <Link2 className="input-icon" size={20} />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste X (Twitter) video URL here..."
            className="url-input"
            disabled={loading || downloading}
          />
          {url && !loading && !downloading && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                setUrl('');
                setVideoInfo(null);
                setError('');
                setSuccess('');
              }}
            >
              ×
            </button>
          )}
        </div>
        <button
          type="submit"
          className="fetch-btn"
          disabled={loading || downloading || !url.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="spin" size={18} />
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>Fetch Video</span>
            </>
          )}
        </button>
      </form>

      {/* Supported URLs Info */}
      <div className="supported-urls">
        <span className="supported-label">Supported:</span>
        <span className="supported-item">x.com/*/status/*</span>
        <span className="supported-item">twitter.com/*/status/*</span>
        <span className="supported-item">t.co/*</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && !error && (
        <div className="success-message">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Video Info Card */}
      {videoInfo && (
        <div className="video-info-card">
          <div className="video-preview">
            {!thumbnailError && videoInfo.thumbnail ? (
              <img
                src={videoInfo.thumbnail}
                alt="Video thumbnail"
                className="thumbnail"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              <div className="thumbnail-placeholder">
                <Film size={48} />
                <span>Video Preview</span>
              </div>
            )}
            {videoInfo.duration && (
              <div className="duration-badge">
                <Clock size={12} />
                {formatDuration(videoInfo.duration)}
              </div>
            )}
            {videoInfo.isGif && (
              <div className="gif-badge">GIF</div>
            )}
          </div>

          <div className="video-details">
            <h3 className="video-title">{videoInfo.title || 'Twitter Video'}</h3>

            <div className="video-meta">
              {videoInfo.author && (
                <span className="meta-item author">
                  <User size={14} />
                  @{videoInfo.author}
                </span>
              )}
              {videoInfo.authorName && (
                <span className="meta-item">
                  {videoInfo.authorName}
                </span>
              )}
            </div>

            {/* Tweet Stats */}
            <div className="tweet-stats">
              {videoInfo.likeCount !== undefined && (
                <span className="stat-item likes">
                  <Heart size={14} />
                  {formatNumber(videoInfo.likeCount)}
                </span>
              )}
              {videoInfo.retweetCount !== undefined && (
                <span className="stat-item retweets">
                  <Repeat2 size={14} />
                  {formatNumber(videoInfo.retweetCount)}
                </span>
              )}
              {videoInfo.viewCount !== undefined && (
                <span className="stat-item views">
                  <Eye size={14} />
                  {formatNumber(videoInfo.viewCount)}
                </span>
              )}
              {videoInfo.replyCount !== undefined && (
                <span className="stat-item replies">
                  <MessageCircle size={14} />
                  {formatNumber(videoInfo.replyCount)}
                </span>
              )}
            </div>

            {/* Quality Selection */}
            {videoInfo.formats && videoInfo.formats.length > 0 ? (
              <div className="quality-section">
                <label className="quality-label">Select Quality:</label>
                <div className="quality-options">
                  {videoInfo.formats.map((format) => (
                    <button
                      key={format.formatId}
                      className={`quality-btn ${selectedQuality === format.formatId ? 'selected' : ''} ${format.isAuto ? 'auto-quality' : ''}`}
                      onClick={() => setSelectedQuality(format.formatId)}
                      disabled={downloading}
                    >
                      <span className="quality-name">{format.quality}</span>
                      {format.filesize && (
                        <span className="quality-size">{formatFileSize(format.filesize)}</span>
                      )}
                      {format.bitrate && !format.isAuto && (
                        <span className="quality-bitrate">{format.bitrate}kbps</span>
                      )}
                      {format.isAuto && (
                        <span className="quality-bitrate">Recommended</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="quality-section">
                <label className="quality-label">Quality:</label>
                <div className="quality-options">
                  <button
                    className={`quality-btn selected auto-quality`}
                    disabled={true}
                  >
                    <span className="quality-name">Best Quality (Auto)</span>
                    <span className="quality-bitrate">Recommended</span>
                  </button>
                </div>
              </div>
            )}

            {/* Download Progress */}
            {downloading && (
              <div className="download-progress-section">
                <div className="progress-header">
                  <span className="progress-stage">{downloadStage}</span>
                  <span className="progress-percent">{downloadProgress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Download Button */}
            <button
              className="download-btn"
              onClick={handleDownload}
              disabled={downloading || !selectedQuality}
            >
              {downloading ? (
                <>
                  <Loader2 className="spin" size={20} />
                  <span>Downloading... {downloadProgress}%</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Download Video</span>
                  <Zap size={16} className="zap-icon" />
                </>
              )}
            </button>

            {/* Info Note */}
            <div className="info-note">
              <Sparkles size={14} />
              <span>Twitter videos are direct MP4 downloads - no processing needed!</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .twitter-downloader {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }

        .disk-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          color: #f59e0b;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .url-form {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .input-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--gray-500);
          pointer-events: none;
        }

        .url-input {
          width: 100%;
          padding: 16px 40px 16px 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          transition: all 0.3s;
        }

        .url-input:focus {
          outline: none;
          border-color: #1DA1F2;
          box-shadow: 0 0 0 3px rgba(29, 161, 242, 0.2);
        }

        .url-input::placeholder {
          color: var(--gray-500);
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: var(--gray-400);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .fetch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 28px;
          background: linear-gradient(135deg, #1DA1F2 0%, #0d8ecf 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .fetch-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(29, 161, 242, 0.4);
        }

        .fetch-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .supported-urls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
        }

        .supported-label {
          color: var(--gray-400);
          font-size: 13px;
          font-weight: 500;
        }

        .supported-item {
          font-size: 12px;
          color: var(--gray-500);
          background: rgba(255, 255, 255, 0.06);
          padding: 4px 10px;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #f87171;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          color: #4ade80;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .video-info-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          animation: slideUp 0.4s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .video-preview {
          position: relative;
          aspect-ratio: 16 / 9;
          background: rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--gray-500);
        }

        .duration-badge {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 6px;
          color: white;
          font-size: 13px;
          font-weight: 500;
        }

        .gif-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          background: #1DA1F2;
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .video-details {
          padding: 24px;
        }

        .video-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 12px;
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
          margin-bottom: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gray-400);
          font-size: 14px;
        }

        .meta-item.author {
          color: #1DA1F2;
          font-weight: 500;
        }

        .tweet-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          padding: 12px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gray-400);
          font-size: 14px;
        }

        .stat-item.likes svg {
          color: #f91880;
        }

        .stat-item.retweets svg {
          color: #00ba7c;
        }

        .stat-item.views svg {
          color: #1DA1F2;
        }

        .stat-item.replies svg {
          color: #1DA1F2;
        }

        .quality-section {
          margin-bottom: 20px;
        }

        .quality-label {
          display: block;
          color: var(--gray-300);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .quality-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .quality-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .quality-btn:hover:not(:disabled) {
          background: rgba(29, 161, 242, 0.1);
          border-color: rgba(29, 161, 242, 0.3);
        }

        .quality-btn.selected {
          background: rgba(29, 161, 242, 0.15);
          border-color: #1DA1F2;
        }

        .quality-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quality-btn.auto-quality {
          border-color: rgba(29, 161, 242, 0.5);
          background: rgba(29, 161, 242, 0.1);
        }

        .quality-btn.auto-quality.selected {
          background: rgba(29, 161, 242, 0.2);
          border-color: #1DA1F2;
        }

        .quality-name {
          font-weight: 600;
          font-size: 15px;
        }

        .quality-size, .quality-bitrate {
          font-size: 11px;
          color: var(--gray-400);
        }

        .download-progress-section {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(29, 161, 242, 0.1);
          border-radius: 12px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .progress-stage {
          color: var(--gray-300);
          font-size: 14px;
        }

        .progress-percent {
          color: #1DA1F2;
          font-weight: 600;
        }

        .progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1DA1F2, #0d8ecf);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .download-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px 24px;
          background: linear-gradient(135deg, #1DA1F2 0%, #0d8ecf 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 16px;
        }

        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(29, 161, 242, 0.4);
        }

        .download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .download-btn .zap-icon {
          color: #fbbf24;
        }

        .info-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: rgba(29, 161, 242, 0.08);
          border-radius: 10px;
          color: var(--gray-400);
          font-size: 13px;
        }

        .info-note svg {
          color: #1DA1F2;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .url-form {
            flex-direction: column;
          }

          .fetch-btn {
            width: 100%;
            justify-content: center;
          }

          .supported-urls {
            justify-content: center;
          }

          .quality-options {
            justify-content: center;
          }

          .tweet-stats {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TwitterDownloader;
