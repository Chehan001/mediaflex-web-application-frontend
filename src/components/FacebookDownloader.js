import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
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
} from "lucide-react";

import "../styles/FacebookDownloader.css";

// (setupProxy.js)
const API_BASE_URL = '/api';

export default function FacebookDownloader({ initialUrl }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState("");

  const [cookieWarning, setCookieWarning] = useState("");
  const [diskWarning, setDiskWarning] = useState("");

  const eventSourceRef = useRef(null);

  // Helpers
  const isValidFacebookUrl = (inputUrl) => {
    const fbPatterns = [
      /facebook\.com\/.*\/videos\//i,
      /facebook\.com\/watch/i,
      /facebook\.com\/reel/i,
      /fb\.watch\//i,
      /facebook\.com\/.*\/posts\//i,
      /facebook\.com\/share\/v\//i,
      /facebook\.com\/share\/r\//i,
      /facebook\.com\/share\//i,
      /facebook\.com\/.*video\.php/i,
      /facebook\.com\/stories\//i,
      /facebook\.com\/.*\/reels\//i
    ];
    return fbPatterns.some((pattern) => pattern.test(inputUrl));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const s = Number(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatViewCount = (count) => {
    if (!count) return "0";
    const num = parseInt(count, 10);
    if (Number.isNaN(num)) return String(count);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // Health check (optional)
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/health`);
        const data = res.data;

        if (data?.cookieStatus && !data.cookieStatus.valid) {
          setCookieWarning(
            data.cookieStatus.message ||
            "Cookies not configured. Some videos may be restricted."
          );
        } else {
          setCookieWarning("");
        }

        if (data?.diskSpace && !data.diskSpace.sufficient) {
          setDiskWarning(data.diskSpace.message);
        } else {
          setDiskWarning("");
        }
      } catch {
        // ignore health errors
      }
    };

    checkServerHealth();
  }, []);

  // Auto-fetch when initialUrl exists
  useEffect(() => {
    if (initialUrl?.trim()) {
      setUrl(initialUrl);
      // run after state update
      setTimeout(() => {
        handleUrlSubmit({ preventDefault: () => { } });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Get Video
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a Facebook URL");
      return;
    }

    if (!isValidFacebookUrl(trimmed)) {
      setError("Please enter a valid Facebook video URL");
      return;
    }

    setLoading(true);
    setVideoInfo(null);
    setSelectedFormat(null);

    try {
      // Backend must implement --> POST /api/facebook/video-info
      const res = await axios.post(`${API_BASE_URL}/facebook/video-info`, {
        url: trimmed
      });

      setVideoInfo(res.data);
      setSuccess("Video found! Select a quality to download.");

      if (res.data?.formats?.length) {
        setSelectedFormat(res.data.formats[0]);
      }
    } catch (err) {
      const status = err.response?.status;
      const backendMsg = err.response?.data?.error || err.response?.data?.message;

      if (status === 404) {
        setError(
          "404 Not Found: Backend route /api/facebook/video-info does not exist. Add it to server."
        );
      } else if (status === 403) {
        setError(
          backendMsg ||
          "This video may be private/age restricted. Add cookies.txt to backend."
        );
      } else {
        setError(backendMsg || "Failed to fetch Facebook video information");
      }
    } finally {
      setLoading(false);
    }
  };

  // Download
  const handleDownload = async () => {
    if (!selectedFormat) {
      setError("Please select a format");
      return;
    }

    clearMessages();
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage("Starting download...");

    try {
      // Backend must implement --> POST /api/facebook/download-start
      const res = await axios.post(`${API_BASE_URL}/facebook/download-start`, {
        url: url.trim(),
        formatId: selectedFormat.formatId,
        quality: selectedFormat.quality,
        estimatedSize: selectedFormat.filesize || 0
      });

      const { downloadId } = res.data;
      const es = new EventSource(`${API_BASE_URL}/download-progress/${downloadId}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === "downloading" || data.status === "processing") {
          setDownloadProgress(data.progress || 0);
          setDownloadStage(data.stage || "Processing...");
        }

        if (data.status === "completed") {
          es.close();
          setDownloadProgress(100);
          setDownloadStage("Download ready!");

          //  Backend--> /api/download-file/:downloadId
          const link = document.createElement("a");
          link.href = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(
            data.filename
          )}`;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setSuccess("Download completed successfully!");
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage("");
        }

        if (data.status === "error") {
          es.close();
          setError(data.message || "Download failed");
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage("");
        }
      };

      es.onerror = () => {
        es.close();
        setError("Connection lost. Please try again.");
        setDownloading(false);
        setDownloadProgress(0);
        setDownloadStage("");
      };
    } catch (err) {
      const status = err.response?.status;
      const backendMsg = err.response?.data?.error || err.response?.data?.message;

      if (status === 404) {
        setError(
          "404 Not Found: Backend route /api/facebook/download-start does not exist. Add it to server."
        );
      } else if (status === 507) {
        setError(` ${backendMsg || "Insufficient disk space"}`);
        setDiskWarning(backendMsg || "");
      } else {
        setError(backendMsg || "Download failed");
      }

      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage("");
    }
  };

  return (
    <div className="fb-downloader">
      {/* Cookie warning */}
      {cookieWarning && (
        <div className="fb-banner fb-banner--cookie">
          <Lock size={16} />
          <span>{cookieWarning}</span>
        </div>
      )}

      {/* Disk warning */}
      {diskWarning && (
        <div className="fb-banner fb-banner--disk">
          <HardDrive size={16} />
          <span>{diskWarning}</span>
        </div>
      )}

      {/* Supported types */}
      <div className="fb-supported">
        <Video size={20} className="fb-supported__icon" />
        <span className="fb-supported__text">
          <strong>Supported:</strong> Videos • Reels • Watch • Stories • Live •
          Private Videos (with cookies)
        </span>
      </div>

      {/* Input */}
      <div className="fb-card fb-input">
        <div className="fb-input__header">
          <Link2 size={20} className="fb-input__headerIcon" />
          <span>Paste Facebook Video URL</span>
        </div>

        <form onSubmit={handleUrlSubmit} className="fb-input__form">
          <div className="fb-input__row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.facebook.com/watch?v=..."
              className="fb-input__field"
              disabled={loading || downloading}
            />

            <button
              type="submit"
              className="fb-btn fb-btn--primary"
              disabled={loading || downloading || !url.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="fb-spin" />
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

          <div className="fb-input__hint">
            Supported: facebook.com/watch, fb.watch, facebook.com/reel,
            facebook.com/share
          </div>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className="fb-message fb-message--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="fb-message fb-message--success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Video Info */}
      {videoInfo && (
        <div className="fb-card fb-video">
          <div className="fb-video__top">
            {/* Thumbnail */}
            <div className="fb-thumb">
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title || "Facebook Video"}
                  className="fb-thumb__img"
                />
              ) : (
                <div className="fb-thumb__placeholder">
                  <Film size={48} />
                </div>
              )}

              <div className="fb-thumb__badge fb-thumb__badge--duration">
                <Clock size={12} />
                {formatDuration(videoInfo.duration)}
              </div>

              <div className="fb-thumb__badge fb-thumb__badge--platform">
                <Facebook size={12} />
                Facebook
              </div>
            </div>

            {/* Details */}
            <div className="fb-video__details">
              <h3 className="fb-video__title">
                {videoInfo.title || "Facebook Video"}
              </h3>

              <div className="fb-meta">
                {videoInfo.author && (
                  <div className="fb-meta__item">
                    <User size={14} />
                    <span>{videoInfo.author}</span>
                  </div>
                )}

                {videoInfo.viewCount && (
                  <div className="fb-meta__item">
                    <Eye size={14} />
                    <span>{formatViewCount(videoInfo.viewCount)} views</span>
                  </div>
                )}

                {videoInfo.isPrivate !== undefined && (
                  <div className="fb-meta__item">
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

          {/* Formats */}
          <div className="fb-formats">
            <div className="fb-formats__header">
              <Video size={18} />
              <span>Select Quality</span>
              <span className="fb-formats__note">
                Facebook videos include audio
              </span>
            </div>

            <div className="fb-formats__grid">
              {videoInfo.formats?.map((format, index) => {
                const selected = selectedFormat?.formatId === format.formatId;
                const isHD = String(format.quality || "")
                  .toUpperCase()
                  .includes("HD");

                return (
                  <button
                    type="button"
                    key={format.formatId || index}
                    className={`fb-format ${selected ? "is-selected" : ""}`}
                    onClick={() => !downloading && setSelectedFormat(format)}
                    disabled={downloading}
                  >
                    <div className="fb-format__head">
                      <span className="fb-format__quality">{format.quality}</span>
                      {isHD && (
                        <span className="fb-format__hd">
                          <Sparkles size={10} /> HD
                        </span>
                      )}
                    </div>

                    <div className="fb-format__mid">
                      <span className="fb-format__pill">
                        {(format.container || "mp4").toUpperCase()}
                      </span>
                      <span className="fb-format__pill">
                        {formatFileSize(format.filesize)}
                      </span>
                    </div>

                    <div className="fb-format__foot">
                      <span className="fb-format__feature">
                        <Video size={12} /> Video
                      </span>
                      <span className="fb-format__feature">
                        <Check size={12} /> Audio
                      </span>
                    </div>

                    {selected && (
                      <span className="fb-format__check">
                        <Check size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          {downloading && (
            <div className="fb-progress">
              <div className="fb-progress__top">
                <Loader2 size={18} className="fb-spin" />
                <span>{downloadStage}</span>
                <span className="fb-progress__pct">
                  {Math.round(downloadProgress)}%
                </span>
              </div>

              <div className="fb-progress__bar">
                <div
                  className="fb-progress__fill"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedFormat || downloading}
            className="fb-btn fb-btn--download"
          >
            {downloading ? (
              <>
                <Loader2 size={20} className="fb-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Download {selectedFormat?.quality || "Video"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
