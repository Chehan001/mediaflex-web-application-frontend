import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
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

import '../styles/TwitterDownloader.css';

const API_BASE_URL = '/api';

// X  Logo
const XLogo = ({ size = 24, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
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

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  const [diskWarning, setDiskWarning] = useState('');

  const eventSourceRef = useRef(null);

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

  useEffect(() => {
    if (initialUrl) {
      handleUrlSubmit({ preventDefault: () => {} });
    }
  }, [initialUrl]);

  const isValidTwitterUrl = (inputUrl) => {
    const twitterPatterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i,
      /(?:mobile\.)?twitter\.com\/\w+\/status\/\d+/i,
      /(?:mobile\.)?x\.com\/\w+\/status\/\d+/i,
      /t\.co\/\w+/i,
    ];
    return twitterPatterns.some((pattern) => pattern.test(inputUrl));
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

      if (response.data.formats && response.data.formats.length > 0) {
        setSelectedQuality(response.data.formats[0].formatId);
      } else {
        setSelectedQuality('best');
      }

      setSuccess('Video found! Click download to save.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';
      setError(errorMsg);
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
      //FIXED endpoint
      const response = await axios.post(`${API_BASE_URL}/twitter/download-start`, {
        url,
        formatId: selectedQuality,
        title: videoInfo.title,
      });

      const { downloadId } = response.data;

      if (eventSourceRef.current) eventSourceRef.current.close();

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

          const downloadUrl = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(
            data.filename
          )}`;

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

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="twitter-downloader">
      {diskWarning && (
        <div className="disk-warning">
          <AlertCircle size={16} />
          <span>{diskWarning}</span>
        </div>
      )}

      <div className="supported-types-banner">
        <XLogo size={20} className="x-logo" />
        <span>
          <strong className="supported-strong">Supported:</strong> Videos • GIFs • Spaces • Clips • Media
        </span>
      </div>

      <form onSubmit={handleUrlSubmit} className="url-form">
        <div className="input-wrapper">
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

        <button type="submit" className="fetch-btn" disabled={loading || downloading || !url.trim()}>
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

      <div className="supported-urls">
        <span className="supported-label">Supported:</span>
        <span className="supported-item">x.com/*/status/*</span>
        <span className="supported-item">twitter.com/*/status/*</span>
        <span className="supported-item">t.co/*</span>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && !error && (
        <div className="success-message">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

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

            {videoInfo.isGif && <div className="gif-badge">GIF</div>}
          </div>

          <div className="video-details">
            <h3 className="video-title">{videoInfo.title || 'Twitter Video'}</h3>

            <div className="video-meta">
              {videoInfo.author && (
                <span className="meta-item author">
                  <User size={14} />@{videoInfo.author}
                </span>
              )}
              {videoInfo.authorName && <span className="meta-item">{videoInfo.authorName}</span>}
            </div>

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

            {videoInfo.formats && videoInfo.formats.length > 0 && (
              <div className="quality-section">
                <label className="quality-label">Select Quality:</label>
                <div className="quality-options">
                  {videoInfo.formats.map((format) => (
                    <button
                      key={format.formatId}
                      type="button"
                      className={`quality-btn ${selectedQuality === format.formatId ? 'selected' : ''}`}
                      onClick={() => setSelectedQuality(format.formatId)}
                      disabled={downloading}
                    >
                      <span className="quality-name">{format.quality}</span>
                      {format.filesize && <span className="quality-size">{formatFileSize(format.filesize)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {downloading && (
              <div className="download-progress-section">
                <div className="progress-header">
                  <span className="progress-stage">{downloadStage}</span>
                  <span className="progress-percent">{downloadProgress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${downloadProgress}%` }} />
                </div>
              </div>
            )}

            <button className="download-btn" type="button" onClick={handleDownload} disabled={downloading}>
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

            <div className="info-note">
              <Sparkles size={14} />
              <span>Downloads run on your backend server.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwitterDownloader;
