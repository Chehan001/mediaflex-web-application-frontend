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
  Film,
  Instagram,
  Lock,
  Globe,
  Heart,
  MessageCircle
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const InstagramDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);

  // Progress states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  // Server health states
  const [cookieWarning, setCookieWarning] = useState('');
  const [diskWarning, setDiskWarning] = useState('');

  const eventSourceRef = useRef(null);

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);

        if (response.data.cookieStatus && !response.data.cookieStatus.valid) {
          setCookieWarning('Cookies not configured. Some private videos may require login.');
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

  // Validate Instagram URL
  const isValidInstagramUrl = (inputUrl) => {
    const igPatterns = [
      /instagram\.com\/p\//i,           // Posts
      /instagram\.com\/reel\//i,        // Reels
      /instagram\.com\/reels\//i,       // Reels alt
      /instagram\.com\/tv\//i,          // IGTV
      /instagram\.com\/.*\/reel\//i,    // User reels
      /instagr\.am\//i,                 // Short URL
    ];
    return igPatterns.some(pattern => pattern.test(inputUrl));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter an Instagram URL');
      return;
    }

    if (!isValidInstagramUrl(url)) {
      setError('Please enter a valid Instagram video URL (Reel, Post, or IGTV)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setThumbnailError(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/instagram/video-info`, { url });
      setVideoInfo(response.data);
      setSuccess('Video found! Click download to save.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';

      // Friendly error messages for Instagram
      if (errorMsg.includes('login') || errorMsg.includes('private')) {
        setError('🔒 This account is private or requires login.');
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('removed') || errorMsg.includes('not found')) {
        setError('❌ This video is unavailable or has been removed.');
      } else if (errorMsg.includes('carousel') || errorMsg.includes('image')) {
        setError('📷 This post contains images only or is a carousel. Only single videos are supported.');
      } else if (errorMsg.includes('story') || errorMsg.includes('stories')) {
        setError('⏱️ Stories are not supported. Try Reels or Posts instead.');
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
    if (!videoInfo) {
      setError('No video information available');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Starting download...');
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/instagram/download-start`, {
        url,
        estimatedSize: videoInfo.filesize || 0
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
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count) => {
    if (!count) return '0';
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="ig-downloader">
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
        background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.1) 0%, rgba(131, 58, 180, 0.1) 100%)',
        border: '1px solid rgba(225, 48, 108, 0.2)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.9rem'
      }}>
        <Instagram size={20} style={{ color: '#E1306C', flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#E1306C' }}>Supported:</strong> Reels • Posts • IGTV • Stories • Highlights • Private (with cookies)
        </span>
      </div>

      {/* URL Input Section */}
      <div className="input-section">
        <div className="input-header">
          <Link2 size={20} className="input-icon" />
          <span>Paste Instagram Video URL</span>
        </div>

        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
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
          <span className="hint">Supported: Reels, Posts, IGTV videos</span>
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
              {videoInfo.thumbnail && !thumbnailError ? (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="thumbnail"
                  onError={() => setThumbnailError(true)}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <Film size={48} />
                </div>
              )}
              {videoInfo.duration && (
                <div className="duration-badge">
                  <Clock size={12} />
                  {formatDuration(videoInfo.duration)}
                </div>
              )}
              <div className="platform-badge">
                <Instagram size={12} />
                Instagram
              </div>
            </div>

            <div className="video-details">
              <h3 className="video-title">
                {videoInfo.title || 'Instagram Video'}
              </h3>

              <div className="video-meta">
                {videoInfo.author && (
                  <div className="meta-item author-item">
                    <User size={14} />
                    <span>@{videoInfo.author}</span>
                  </div>
                )}
                {videoInfo.likeCount && (
                  <div className="meta-item">
                    <Heart size={14} />
                    <span>{formatCount(videoInfo.likeCount)}</span>
                  </div>
                )}
                {videoInfo.commentCount && (
                  <div className="meta-item">
                    <MessageCircle size={14} />
                    <span>{formatCount(videoInfo.commentCount)}</span>
                  </div>
                )}
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
              </div>

              {videoInfo.caption && (
                <p className="video-caption">{videoInfo.caption}</p>
              )}

              {/* Quality Badge */}
              <div className="quality-info">
                <span className="quality-badge">
                  {videoInfo.quality || 'Best Quality'} • MP4
                </span>
                <span className="quality-note">Video + Audio included</span>
              </div>
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
            disabled={downloading}
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
                <span>Download Video</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default InstagramDownloader;
