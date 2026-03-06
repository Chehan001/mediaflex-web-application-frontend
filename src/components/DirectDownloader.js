import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  FileVideo,
  Info
} from 'lucide-react';
import '../styles/DirectDownloader.css';

const API_BASE_URL = '/api';

//Sub-components

const SupportedTypesBanner = () => (
  <div className="dd-banner">
    <Link2 size={18} className="dd-banner__icon" />
    <p className="dd-banner__text">
      <strong>Supported:</strong> MP4 · WebM · M3U8/HLS · MKV · Direct URLs · 1000+ Sites via yt-dlp
    </p>
  </div>
);

const UrlForm = ({ url, setUrl, filename, setFilename, downloading, onSubmit }) => (
  <form onSubmit={onSubmit} className="dd-form">
    <div className="dd-form__header">
      <Link2 size={18} className="dd-form__header-icon" />
      <span>Paste Direct Video URL</span>
    </div>

    <div className="dd-form__fields">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://...googlevideo.com/videoplayback/... or direct .mp4 link"
        className="dd-input"
        disabled={downloading}
        aria-label="Video URL"
      />
      <input
        type="text"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="Custom filename (optional) — e.g., my_video.mp4"
        className="dd-input dd-input--secondary"
        disabled={downloading}
        aria-label="Custom filename"
      />
    </div>

    <button
      type="submit"
      className={`dd-btn${downloading ? ' dd-btn--loading' : ''}`}
      disabled={downloading || !url.trim()}
    >
      {downloading ? (
        <>
          <Loader2 size={18} className="dd-spin" />
          <span>Downloading...</span>
        </>
      ) : (
        <>
          <Download size={18} />
          <span>Download Now</span>
        </>
      )}
    </button>
  </form>
);

const StatusMessage = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <div className={`dd-status ${error ? 'dd-status--error' : 'dd-status--success'}`}>
      {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      <span>{error || success}</span>
    </div>
  );
};

const DownloadProgress = ({ stage, progress }) => (
  <div className="dd-progress">
    <div className="dd-progress__preview">
      <div className="dd-progress__icon-wrap">
        <FileVideo size={36} />
      </div>
      <div className="dd-progress__meta">
        <p className="dd-progress__title">Direct URL Download</p>
        <p className="dd-progress__subtitle">Downloading video stream…</p>
      </div>
    </div>

    <div className="dd-progress__track-wrap">
      <div className="dd-progress__track-header">
        <span className="dd-progress__stage">
          <Loader2 size={14} className="dd-spin" />
          {stage}
        </span>
        <span className="dd-progress__percent">{Math.round(progress)}%</span>
      </div>
      <div className="dd-progress__track">
        <div className="dd-progress__fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  </div>
);

const InfoBox = () => (
  <details className="dd-info">
    <summary className="dd-info__summary">
      <Info size={15} />
      <span>What are Direct URLs?</span>
    </summary>
    <ul className="dd-info__list">
      <li>Direct stream URLs from video players (googlevideo.com)</li>
      <li>Raw video file links ending in .mp4, .webm, .mkv</li>
      <li>These URLs may expire quickly — download immediately</li>
      <li>No processing needed — direct file transfer</li>
    </ul>
  </details>
);

//Main Component 
const isValidDirectUrl = (inputUrl) => {
  const directPatterns = [
    /googlevideo\.com\/videoplayback/i,
    /\.googlevideo\.com/i,
    /ytimg\.com/i,
    /\.mp4(\?|$)/i,
    /\.webm(\?|$)/i,
    /\.mkv(\?|$)/i,
  ];

  return directPatterns.some((pattern) => pattern.test(inputUrl));
};

const DirectDownloader = () => {
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const eventSourceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const resetDownloadState = () => {
    setDownloading(false);
    setDownloadProgress(0);
    setDownloadStage('');
  };

  const handleDownload = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a direct video URL');
      return;
    }

    if (!isValidDirectUrl(url)) {
      setError('Please enter a valid direct video URL (googlevideo.com, .mp4, .webm, .mkv)');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Starting download…');
    setError('');
    setSuccess('');

    try {
      const { data } = await axios.post(`${API_BASE_URL}/direct/download-start`, {
        url,
        filename: filename.trim() || undefined,
      });

      const { downloadId } = data;

      const eventSource = new EventSource(
        `${API_BASE_URL}/download-progress/${downloadId}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.status === 'downloading' || payload.status === 'processing') {
          setDownloadProgress(payload.progress ?? 0);
          setDownloadStage(payload.stage ?? 'Processing…');
          return;
        }

        if (payload.status === 'completed') {
          setDownloadProgress(100);
          setDownloadStage('Download ready!');
          eventSource.close();

          const link = document.createElement('a');
          link.href = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(
            payload.filename
          )}`;
          link.download = payload.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setSuccess('Download completed successfully!');
          resetDownloadState();
          return;
        }

        if (payload.status === 'error') {
          eventSource.close();
          setError(payload.message || 'Download failed');
          resetDownloadState();
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setError('Connection lost. Please try again.');
        resetDownloadState();
      };
    } catch (err) {
      const msg =
        err.response?.status === 507
          ? `💾 ${err.response?.data?.message || 'Insufficient disk space'}`
          : err.response?.data?.error ||
            err.response?.data?.message ||
            'Download failed';

      setError(msg);
      resetDownloadState();
    }
  };

  return (
    <div className="dd-root">
      <SupportedTypesBanner />

      <UrlForm
        url={url}
        setUrl={setUrl}
        filename={filename}
        setFilename={setFilename}
        downloading={downloading}
        onSubmit={handleDownload}
      />

      <StatusMessage error={error} success={success} />

      {downloading && (
        <DownloadProgress stage={downloadStage} progress={downloadProgress} />
      )}

      <InfoBox />
    </div>
  );
};

export default DirectDownloader;