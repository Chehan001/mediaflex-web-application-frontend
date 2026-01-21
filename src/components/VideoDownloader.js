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
  Music,
  User,
  Clock,
  Eye,
  Film,
  Sparkles,
  HardDrive,
  Check,
  Merge,
  FileAudio,
  Settings
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const VideoDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('video'); // 'video' or 'audio'

  // 🚀 New states for two-step fetching optimization
  // eslint-disable-next-line no-unused-vars
  const [_loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingFormats, setLoadingFormats] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [_metadataLoaded, setMetadataLoaded] = useState(false);
  const [formatsLoaded, setFormatsLoaded] = useState(false);

  // 🍪 Cookie & 💾 Disk space health states
  // eslint-disable-next-line no-unused-vars
  const [_serverHealth, setServerHealth] = useState(null);
  const [cookieWarning, setCookieWarning] = useState('');
  const [diskWarning, setDiskWarning] = useState('');

  // New states for advanced features
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const [convertToMp3, setConvertToMp3] = useState(false);
  const [mp3Bitrate, setMp3Bitrate] = useState(192);
  const [autoMerge, setAutoMerge] = useState(true);
  const eventSourceRef = useRef(null);

  // 🍪 Check server health on mount (cookies, disk space, etc.)
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        setServerHealth(response.data);

        // Check cookie status
        if (response.data.cookieStatus) {
          if (!response.data.cookieStatus.valid) {
            setCookieWarning(response.data.cookieStatus.message);
          } else if (response.data.cookieStatus.expiringSoon) {
            setCookieWarning(response.data.cookieStatus.message);
          }
        }

        // Check disk space
        if (response.data.diskSpace && !response.data.diskSpace.sufficient) {
          setDiskWarning(response.data.diskSpace.message);
        }
      } catch (err) {
        console.error('Failed to check server health:', err);
      }
    };

    checkServerHealth();
    // Re-check every 5 minutes
    const interval = setInterval(checkServerHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 TRIGGER AUTO-FETCH if initialUrl is present
  useEffect(() => {
    if (initialUrl) {
      handleUrlSubmit(new Event('submit'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  // 🚀 STEP 1: Fetch only metadata (FAST - 2-4 seconds)
  const fetchMetadata = async (videoUrl) => {
    setLoadingMetadata(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/video-metadata`, { url: videoUrl });
      setVideoInfo(prevInfo => ({
        ...prevInfo,
        ...response.data,
        formats: [], // Will be loaded in step 2
      }));
      setMetadataLoaded(true);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch video metadata');
      return false;
    } finally {
      setLoadingMetadata(false);
    }
  };

  // 🚀 STEP 2: Fetch formats lazily (happens in background)
  const fetchFormats = async (videoUrl) => {
    setLoadingFormats(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/video-formats`, { url: videoUrl });
      setVideoInfo(prevInfo => ({
        ...prevInfo,
        formats: response.data.formats,
        bestAudioItag: response.data.bestAudioItag
      }));
      setFormatsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch formats:', err);
      setError(err.response?.data?.error || 'Failed to fetch video formats');
    } finally {
      setLoadingFormats(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setSelectedFormat(null);
    setMetadataLoaded(false);
    setFormatsLoaded(false);

    try {
      // 🚀 STEP 1: Fetch metadata first (INSTANT UI UPDATE)
      const metadataSuccess = await fetchMetadata(url);

      if (metadataSuccess) {
        setSuccess('Video found! ✓ Loading formats...');

        // 🚀 STEP 2: Fetch formats in background
        fetchFormats(url); // Don't await - let it run in background
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch video information');
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
      const isVideoOnly = selectedFormat.hasVideo && !selectedFormat.hasAudio;
      const isAudioFormat = !selectedFormat.hasVideo && selectedFormat.hasAudio;
      const shouldMerge = autoMerge && isVideoOnly;
      const shouldConvertMp3 = convertToMp3 && isAudioFormat;

      // Start download with progress tracking
      const response = await axios.post(`${API_BASE_URL}/download-start`, {
        url,
        itag: selectedFormat.itag || selectedFormat.formatId,
        formatId: selectedFormat.formatId || selectedFormat.itag,
        convertToMp3: shouldConvertMp3,
        mp3Bitrate: mp3Bitrate,
        mergeAudio: shouldMerge,
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
      // Handle specific error types
      if (err.response?.status === 507) {
        // Insufficient disk space
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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

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

  // Format quality text - remove underscores and capitalize properly
  const formatQualityText = (text) => {
    if (!text) return '';
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get display format for audio (prefer audioQuality over container)
  const getAudioFormat = (format) => {
    // If it has audioQuality, use that
    if (format.audioQuality) {
      return formatQualityText(format.audioQuality);
    }
    // Otherwise show bitrate or quality
    if (format.audioBitrate) {
      return `${format.audioBitrate}kbps`;
    }
    if (format.quality) {
      return formatQualityText(format.quality);
    }
    return 'Audio';
  };

  // Filter formats based on active tab
  const getFilteredFormats = () => {
    if (!videoInfo?.formats) return [];

    if (activeTab === 'video') {
      // Show formats with video (prioritize video+audio, then video-only)
      const videoFormats = videoInfo.formats.filter(format => format.hasVideo);

      // Remove duplicates and sort by quality
      const uniqueFormats = [];
      const seen = new Set();

      for (const format of videoFormats) {
        const key = `${format.quality}-${format.container}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFormats.push(format);
        }
      }

      return uniqueFormats.slice(0, 8);
    } else {
      // Show audio-only formats (no video)
      const audioFormats = videoInfo.formats.filter(format =>
        !format.hasVideo && format.hasAudio
      );

      // Remove duplicates based on quality and container
      const uniqueFormats = [];
      const seen = new Set();

      for (const format of audioFormats) {
        const key = `${format.quality || format.audioBitrate}-${format.container}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFormats.push(format);
        }
      }

      return uniqueFormats.slice(0, 6);
    }
  };

  return (
    <div className="downloader-container">
      {/* 🍪 Cookie Warning Banner */}
      {cookieWarning && (
        <div className="warning-banner cookie-warning">
          <AlertCircle size={18} />
          <span>🍪 {cookieWarning}</span>
          <button onClick={() => setCookieWarning('')} className="dismiss-btn">×</button>
        </div>
      )}

      {/* 💾 Disk Space Warning Banner */}
      {diskWarning && (
        <div className="warning-banner disk-warning">
          <HardDrive size={18} />
          <span>💾 {diskWarning}</span>
          <button onClick={() => setDiskWarning('')} className="dismiss-btn">×</button>
        </div>
      )}

      {/* Supported Video Types Banner */}
      <div className="info-banner supported-types-banner" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(255, 0, 0, 0.05) 100%)', border: '1px solid rgba(255, 0, 0, 0.2)' }}>
        <Video size={18} style={{ color: '#ff0000' }} />
        <span>
          <strong>Supported:</strong> Videos • Shorts • Music • Live Streams • Playlists • Age-Restricted (with cookies)
        </span>
      </div>

      {/* URL Input Card */}
      <div className="glass-card input-card">
        <div className="card-header">
          <div className="card-icon">
            <Link2 size={20} />
          </div>
          <div>
            <h2 className="card-title">Paste Video URL</h2>
            <p className="card-description">Enter a YouTube video link to get started</p>
          </div>
        </div>

        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="input-wrapper">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-modern"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
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

        {/* Status Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && !videoInfo && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Video Information Card */}
      {videoInfo && (
        <div className="glass-card video-card animate-fade-in">
          <div className="video-content">
            <div className="thumbnail-container">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="video-thumbnail"
              />
              <div className="thumbnail-overlay">
                <div className="duration-badge">
                  <Clock size={12} />
                  <span>{formatDuration(parseInt(videoInfo.duration))}</span>
                </div>
              </div>
            </div>

            <div className="video-details">
              <h3 className="video-title line-clamp-2">{videoInfo.title}</h3>

              <div className="video-stats">
                <div className="stat-item">
                  <User size={16} />
                  <span>{videoInfo.author}</span>
                </div>
                <div className="stat-item">
                  <Eye size={16} />
                  <span>{formatViewCount(videoInfo.viewCount)} views</span>
                </div>
              </div>

              <div className="video-badges">
                <span className="badge badge-quality">
                  <Sparkles size={12} />
                  HD Available
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Format Selection Card */}
      {videoInfo && (
        <div className="glass-card formats-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <div className="card-icon">
              <Film size={20} />
            </div>
            <div>
              <h2 className="card-title">Select Format & Quality</h2>
              <p className="card-description">Choose between video or audio download</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tabs-container">
            <button
              className={`tab-button ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('video');
                setSelectedFormat(null);
              }}
            >
              <Video size={18} />
              <span>Video</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('audio');
                setSelectedFormat(null);
              }}
            >
              <Music size={18} />
              <span>Audio</span>
            </button>
          </div>

          {/* 🚀 Loading state for formats */}
          {loadingFormats && (
            <div className="formats-loading">
              <Loader2 className="spinner" size={24} />
              <p>Loading available formats...</p>
            </div>
          )}

          {/* Show formats once loaded */}
          {formatsLoaded && (
            <>
              {/* Info banner for video-only formats */}
              {activeTab === 'video' && getFilteredFormats().some(f => f.hasVideo && !f.hasAudio) && (
                <div className="info-banner">
                  <Sparkles size={16} />
                  <span>
                    High-quality formats (720p, 1080p, 4K) are video-only.
                    They will be automatically merged with the best audio for the complete experience!
                  </span>
                </div>
              )}

              <div className="formats-list">
                {getFilteredFormats().length === 0 ? (
                  <div className="no-formats-message">
                    <AlertCircle size={24} />
                    <p>No {activeTab} formats available</p>
                  </div>
                ) : (
                  getFilteredFormats().map((format, index) => (
                    <div
                      key={format.formatId || format.itag}
                      className={`format-card ${(selectedFormat?.formatId || selectedFormat?.itag) === (format.formatId || format.itag) ? 'selected' : ''}`}
                      onClick={() => setSelectedFormat(format)}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="format-left">
                        <div className={`format-icon ${activeTab === 'video' ? 'video' : 'audio'}`}>
                          {activeTab === 'video' ? <Video size={22} /> : <Music size={22} />}
                        </div>
                        <div className="format-info">
                          <div className="format-quality">
                            {activeTab === 'video' ? format.quality : getAudioFormat(format)}
                          </div>
                          <div className="format-meta">
                            <span className="format-container">{format.container?.toUpperCase()}</span>
                            <span className="format-divider">•</span>
                            <span className="format-size">
                              <HardDrive size={12} />
                              {formatFileSize(format.filesize)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="format-right">
                        {activeTab === 'video' && (
                          <>
                            <span className={`format-type-badge ${format.hasVideo && format.hasAudio ? 'full' : 'video-only'}`}>
                              {format.hasVideo && format.hasAudio ? 'Video + Audio' : 'Video Only'}
                            </span>
                            {format.hasVideo && !format.hasAudio && (
                              <span className="merge-badge" title="Will auto-merge with best audio">
                                <Merge size={12} />
                                Auto-merge
                              </span>
                            )}
                          </>
                        )}
                        {activeTab === 'audio' && (
                          <span className="format-type-badge audio-only">
                            Audio Only
                          </span>
                        )}
                        {(selectedFormat?.formatId || selectedFormat?.itag) === (format.formatId || format.itag) && (
                          <div className="selected-indicator">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Download Options & Button */}
          {selectedFormat && (
            <div className="download-section animate-fade-in">
              {/* Download Options */}
              <div className="download-options">
                {/* Auto-merge option for video-only formats */}
                {activeTab === 'video' && selectedFormat.hasVideo && !selectedFormat.hasAudio && (
                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={autoMerge}
                      onChange={(e) => setAutoMerge(e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="option-label">
                      <Merge size={16} />
                      Auto-merge with best audio (Recommended for 1080p+)
                    </span>
                  </label>
                )}

                {/* MP3 conversion option for audio formats */}
                {activeTab === 'audio' && (
                  <div className="audio-options">
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={convertToMp3}
                        onChange={(e) => setConvertToMp3(e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="option-label">
                        <FileAudio size={16} />
                        Convert to MP3
                      </span>
                    </label>

                    {convertToMp3 && (
                      <div className="bitrate-selector">
                        <Settings size={14} />
                        <span>Bitrate:</span>
                        <select
                          value={mp3Bitrate}
                          onChange={(e) => setMp3Bitrate(Number(e.target.value))}
                          className="bitrate-select"
                        >
                          <option value={128}>128 kbps</option>
                          <option value={192}>192 kbps</option>
                          <option value={256}>256 kbps</option>
                          <option value={320}>320 kbps (Best)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {downloading && (
                <div className="progress-container">
                  <div className="progress-info">
                    <span className="progress-stage">{downloadStage}</span>
                    <span className="progress-percent">{downloadProgress}%</span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-success download-btn"
              >
                {downloading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{downloadStage || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>
                      {activeTab === 'video' ? (
                        selectedFormat.hasAudio
                          ? `Download ${selectedFormat.quality}`
                          : autoMerge
                            ? `Download ${selectedFormat.quality} + Audio (Merged)`
                            : `Download ${selectedFormat.quality} (Video Only)`
                      ) : (
                        convertToMp3 ? 'Download MP3' : 'Download Audio'
                      )}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .downloader-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* 🍪 Warning Banners */
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        }

        .warning-banner.cookie-warning {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
          border: 1px solid rgba(251, 191, 36, 0.3);
          color: #fcd34d;
        }

        .warning-banner.disk-warning {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .warning-banner svg {
          flex-shrink: 0;
        }

        .warning-banner span {
          flex: 1;
        }

        .dismiss-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: inherit;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .input-card {
          padding: 28px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .card-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
        }

        .card-description {
          font-size: 14px;
          color: var(--gray-400);
          margin: 0;
        }

        .url-form {
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          gap: 12px;
        }

        .input-wrapper .input-modern {
          flex: 1;
        }

        .submit-btn {
          white-space: nowrap;
        }

        .alert {
          margin-top: 20px;
        }

        /* Video Card Styles */
        .video-card {
          padding: 24px;
        }

        .video-content {
          display: flex;
          gap: 24px;
        }

        .thumbnail-container {
          position: relative;
          flex-shrink: 0;
        }

        .thumbnail-overlay {
          position: absolute;
          bottom: 8px;
          right: 8px;
        }

        .duration-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.8);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .video-details {
          flex: 1;
          min-width: 0;
        }

        .video-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .video-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .video-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Formats Card Styles */
        .formats-card {
          padding: 28px;
        }

        /* Tabs Container */
        .tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tab-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 24px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          color: var(--gray-400);
          cursor: pointer;
          transition: all var(--transition-normal);
          position: relative;
          overflow: hidden;
        }

        .tab-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
          opacity: 0;
          transition: opacity var(--transition-normal);
          border-radius: var(--radius-md);
        }

        .tab-button:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .tab-button.active {
          color: white;
          background: transparent;
        }

        .tab-button.active::before {
          opacity: 1;
        }

        .tab-button span,
        .tab-button svg {
          position: relative;
          z-index: 1;
        }

        /* Info Banner */
        .info-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
          font-size: 13px;
          color: var(--gray-300);
          line-height: 1.5;
        }

        .info-banner svg {
          color: var(--primary-400);
          flex-shrink: 0;
        }

        .formats-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 8px;
          margin-top: 4px;
          animation: fadeIn 0.3s ease-out;
        }

        .no-formats-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 48px 24px;
          color: var(--gray-400);
          text-align: center;
        }

        .no-formats-message svg {
          opacity: 0.5;
        }

        .no-formats-message p {
          font-size: 15px;
          margin: 0;
        }

        .format-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          position: relative;
          z-index: 1;
          min-height: 88px;
        }

        .format-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .format-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all var(--transition-normal);
        }

        .format-icon.video {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .format-icon.audio {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .format-card:hover .format-icon {
          transform: scale(1.05);
        }

        .format-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .format-quality {
          font-size: 17px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }

        .format-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--gray-400);
          margin-top: 2px;
        }

        .format-container {
          font-weight: 700;
          color: var(--gray-300);
          text-transform: uppercase;
        }

        .format-divider {
          color: var(--gray-600);
        }

        .format-size {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .format-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .format-type-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .format-type-badge.full {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.15) 100%);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }

        .format-type-badge.video-only {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .format-type-badge.audio-only {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .merge-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.15) 100%);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.4);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .merge-badge svg {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .selected-indicator {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          animation: fadeIn 0.2s ease-out;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
          flex-shrink: 0;
        }

        .download-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Download Options Styles */
        .download-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .audio-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .option-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          transition: all var(--transition-normal);
        }

        .option-checkbox:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .option-checkbox input[type="checkbox"] {
          display: none;
        }

        .checkbox-custom {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-normal);
          flex-shrink: 0;
        }

        .option-checkbox input[type="checkbox"]:checked + .checkbox-custom {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          border-color: var(--primary-500);
        }

        .option-checkbox input[type="checkbox"]:checked + .checkbox-custom::after {
          content: '✓';
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--gray-200);
          font-weight: 500;
        }

        .option-label svg {
          color: var(--primary-400);
        }

        .bitrate-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          margin-left: 34px;
          font-size: 14px;
          color: var(--gray-300);
        }

        .bitrate-selector svg {
          color: var(--gray-400);
        }

        .bitrate-select {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-md);
          color: white;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          transition: all var(--transition-normal);
        }

        .bitrate-select:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--primary-500);
        }

        .bitrate-select:focus {
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .bitrate-select option {
          background: #1a1a2e;
          color: white;
        }

        /* Progress Bar Styles */
        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: var(--radius-lg);
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-stage {
          font-size: 14px;
          color: var(--gray-200);
          font-weight: 500;
        }

        .progress-percent {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-400);
        }

        .progress-bar-wrapper {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-500), var(--primary-400), #8b5cf6);
          background-size: 200% 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease-out;
          animation: shimmer 2s linear infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .download-btn {
          font-size: 16px;
          padding: 18px 32px;
        }

        @media (max-width: 640px) {
          .input-wrapper {
            flex-direction: column;
          }

          .submit-btn {
            width: 100%;
          }

          .video-content {
            flex-direction: column;
          }

          .video-thumbnail {
            max-width: 100%;
          }

          .format-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .format-right {
            width: 100%;
            justify-content: space-between;
          }

          .format-type-badge {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoDownloader;
