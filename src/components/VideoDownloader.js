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
import '../styles/VideoDownloader.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const VideoDownloader = ({ initialUrl }) => {
  const [url, setUrl] = useState(initialUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('video');

  const [, setLoadingMetadata] = useState(false);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [, setMetadataLoaded] = useState(false);
  const [formatsLoaded, setFormatsLoaded] = useState(false);

  const [, setServerHealth] = useState(null);
  const [cookieWarning, setCookieWarning] = useState('');
  const [diskWarning, setDiskWarning] = useState('');

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const [convertToMp3, setConvertToMp3] = useState(false);
  const [mp3Bitrate, setMp3Bitrate] = useState(192);
  const [autoMerge, setAutoMerge] = useState(true);
  const eventSourceRef = useRef(null);

  const getApiErrorMessage = (err, fallback = 'Something went wrong') => {
    if (!err.response) {
      return 'Cannot connect to the server. Please try again later.';
    }

    const status = err.response.status;
    const data = err.response.data;

    if (status === 403) {
      return (
        data?.error ||
        data?.message ||
        'Access denied. This video may be private, age-restricted, or require refreshed cookies.'
      );
    }

    if (status === 404) {
      return data?.error || data?.message || 'Requested resource was not found.';
    }

    if (status === 400) {
      return data?.error || data?.message || 'Invalid request. Please check the URL and try again.';
    }

    if (status === 507) {
      return data?.message || data?.error || 'Insufficient server disk space.';
    }

    if (status >= 500) {
      return data?.error || data?.message || 'Server error. Please try again later.';
    }

    return data?.error || data?.message || fallback;
  };

  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        setServerHealth(response.data);

        if (response.data.cookieStatus) {
          if (!response.data.cookieStatus.valid) {
            setCookieWarning(response.data.cookieStatus.message);
          } else if (response.data.cookieStatus.expiringSoon) {
            setCookieWarning(response.data.cookieStatus.message);
          } else {
            setCookieWarning('');
          }
        }

        if (response.data.diskSpace && !response.data.diskSpace.sufficient) {
          setDiskWarning(response.data.diskSpace.message);
        } else {
          setDiskWarning('');
        }
      } catch (err) {
        console.error('Failed to check server health:', err);

        if (err.response?.status === 403) {
          setCookieWarning(
            err.response?.data?.message ||
            err.response?.data?.error ||
            'Server access is forbidden.'
          );
        } else if (!err.response) {
          setCookieWarning('Cannot connect to server.');
        }
      }
    };

    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialUrl) {
      handleUrlSubmit(new Event('submit'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const fetchMetadata = async (videoUrl) => {
    setLoadingMetadata(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/video-metadata`, { url: videoUrl });
      setVideoInfo(prevInfo => ({
        ...prevInfo,
        ...response.data,
        formats: [],
      }));
      setMetadataLoaded(true);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch video metadata'));
      return false;
    } finally {
      setLoadingMetadata(false);
    }
  };

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
      setError(getApiErrorMessage(err, 'Failed to fetch video formats'));
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
      const metadataSuccess = await fetchMetadata(url);

      if (metadataSuccess) {
        setSuccess('Video found! ✓ Loading formats...');
        fetchFormats(url);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch video information'));
    } finally {
      setLoading(false);
    }
  };

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
      const message = getApiErrorMessage(err, 'Download failed');
      setError(message);

      if (err.response?.status === 507) {
        setDiskWarning(err.response?.data?.message || 'Insufficient disk space');
      }

      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage('');
    }
  };

  const formatDuration = (seconds) => {
    const totalSeconds = parseInt(seconds, 10) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

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
    const num = parseInt(count, 10) || 0;
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

  const formatQualityText = (text) => {
    if (!text) return '';
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getAudioFormat = (format) => {
    if (format.audioQuality) {
      return formatQualityText(format.audioQuality);
    }
    if (format.audioBitrate) {
      return `${format.audioBitrate}kbps`;
    }
    if (format.quality) {
      return formatQualityText(format.quality);
    }
    return 'Audio';
  };

  const getFilteredFormats = () => {
    if (!videoInfo?.formats) return [];

    if (activeTab === 'video') {
      const videoFormats = videoInfo.formats.filter(format => format.hasVideo);

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
      const audioFormats = videoInfo.formats.filter(format =>
        !format.hasVideo && format.hasAudio
      );

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
      {cookieWarning && (
        <div className="warning-banner cookie-warning">
          <AlertCircle size={18} />
          <span>🍪 {cookieWarning}</span>
          <button onClick={() => setCookieWarning('')} className="dismiss-btn">×</button>
        </div>
      )}

      {diskWarning && (
        <div className="warning-banner disk-warning">
          <HardDrive size={18} />
          <span>💾 {diskWarning}</span>
          <button onClick={() => setDiskWarning('')} className="dismiss-btn">×</button>
        </div>
      )}

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
                  <span>{formatDuration(videoInfo.duration)}</span>
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

          {loadingFormats && (
            <div className="formats-loading">
              <Loader2 className="spinner" size={24} />
              <p>Loading available formats...</p>
            </div>
          )}

          {formatsLoaded && (
            <>
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

          {selectedFormat && (
            <div className="download-section animate-fade-in">
              <div className="download-options">
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
    </div>
  );
};

export default VideoDownloader;