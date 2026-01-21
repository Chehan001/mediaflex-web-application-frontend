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
  Music,
  Globe,
  Heart,
  Eye,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TikTokDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);
  const [removeWatermark, setRemoveWatermark] = useState(true);

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

  // Validate TikTok URL
  const isValidTikTokUrl = (inputUrl) => {
    const tiktokPatterns = [
      /tiktok\.com\/@[\w.-]+\/video\/\d+/i,  // Standard video URL
      /tiktok\.com\/t\/\w+/i,                 // Short share URL
      /vm\.tiktok\.com\/\w+/i,                // VM short URL
      /vt\.tiktok\.com\/\w+/i,                // VT short URL
      /tiktok\.com\/.*\/video\/\d+/i,         // Alternative format
    ];
    return tiktokPatterns.some(pattern => pattern.test(inputUrl));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a TikTok URL');
      return;
    }

    if (!isValidTikTokUrl(url)) {
      setError('Please enter a valid TikTok video URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setThumbnailError(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/tiktok/video-info`, { url });
      setVideoInfo(response.data);
      setSuccess('Video found! Click download to save.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';

      // Friendly error messages for TikTok
      if (errorMsg.includes('private') || errorMsg.includes('login')) {
        setError('🔒 This video is private or restricted.');
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('removed') || errorMsg.includes('deleted')) {
        setError('❌ This TikTok video is no longer available.');
      } else if (errorMsg.includes('region')) {
        setError('🌍 This video is not available in your region.');
      } else if (errorMsg.includes('rate') || errorMsg.includes('limit')) {
        setError('⏳ Please wait a few minutes and try again.');
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
      const response = await axios.post(`${API_BASE_URL}/tiktok/download-start`, {
        url,
        removeWatermark,
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
    <div className="tiktok-downloader">
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
        background: 'linear-gradient(135deg, rgba(0, 242, 234, 0.1) 0%, rgba(255, 0, 80, 0.1) 100%)',
        border: '1px solid rgba(0, 242, 234, 0.3)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.9rem'
      }}>
        <Music size={20} style={{ color: '#00F2EA', flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00F2EA' }}>Supported:</strong> Videos • Slideshows • Duets • Sounds • Live • No Watermark Option
        </span>
      </div>

      {/* URL Input Section */}
      <div className="input-section tiktok-input">
        <div className="input-header">
          <Link2 size={20} className="input-icon tiktok-icon-color" />
          <span>Paste TikTok Video URL</span>
        </div>

        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@username/video/..."
              className="url-input tiktok-input-field"
              disabled={loading || downloading}
            />
            <button
              type="submit"
              className="fetch-btn tiktok-fetch-btn"
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
          <span className="hint">Supported: TikTok videos, vm.tiktok.com, vt.tiktok.com links</span>
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
        <div className="video-info-section tiktok-video-section">
          {/* Video Preview */}
          <div className="video-preview">
            <div className="thumbnail-container tiktok-thumbnail">
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
                  <Music size={48} />
                </div>
              )}
              {videoInfo.duration && (
                <div className="duration-badge">
                  <Clock size={12} />
                  {formatDuration(videoInfo.duration)}
                </div>
              )}
              <div className="platform-badge tiktok-badge">
                <Music size={12} />
                TikTok
              </div>
            </div>

            <div className="video-details">
              <h3 className="video-title">
                {videoInfo.title || 'TikTok Video'}
              </h3>

              <div className="video-meta">
                {videoInfo.author && (
                  <div className="meta-item author-item tiktok-author">
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
                {videoInfo.viewCount && (
                  <div className="meta-item">
                    <Eye size={14} />
                    <span>{formatCount(videoInfo.viewCount)}</span>
                  </div>
                )}
                <div className="meta-item">
                  <Globe size={14} />
                  <span>Public</span>
                </div>
              </div>

              {videoInfo.description && (
                <p className="video-caption">{videoInfo.description}</p>
              )}

              {/* Quality Badge */}
              <div className="quality-info">
                <span className="quality-badge tiktok-quality">
                  {videoInfo.quality || 'Best Quality'} • MP4
                </span>
                <span className="quality-note">Video + Audio included</span>
              </div>

              {/* Remove Watermark Toggle */}
              <div className="watermark-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={removeWatermark}
                    onChange={(e) => setRemoveWatermark(e.target.checked)}
                    disabled={downloading}
                  />
                  <span className="toggle-switch"></span>
                  <span className="toggle-text">
                    <Sparkles size={14} />
                    Remove TikTok Watermark
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="progress-section">
              <div className="progress-header">
                <Loader2 size={18} className="spin" />
                <span>{downloadStage}</span>
                <span className="progress-percent tiktok-progress">{Math.round(downloadProgress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar tiktok-progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="download-btn tiktok-download-btn"
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

export default TikTokDownloader;
