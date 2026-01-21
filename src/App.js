import React, { useState } from 'react';
import VideoDownloader from './components/VideoDownloader';
import FacebookDownloader from './components/FacebookDownloader';
import InstagramDownloader from './components/InstagramDownloader';
import TikTokDownloader from './components/TikTokDownloader';
import TwitterDownloader from './components/TwitterDownloader';
import DirectDownloader from './components/DirectDownloader';
import PlatformSelector from './components/PlatformSelector';
import { Youtube, Facebook, Instagram, Download, Zap, Shield, Heart, ArrowLeft, Film, Music, Sparkles, Link2 } from 'lucide-react';
import './App.css';

//Logo Component
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

function App() {
  const [selectedPlatform, setSelectedPlatform] = useState(null); // null, 'youtube', 'facebook', 'instagram', 'tiktok', 'twitter', or 'direct'
  const [initialUrl, setInitialUrl] = useState(''); // 🚀 NEW: Auto-detected URL

  const handleBackToSelector = () => {
    setSelectedPlatform(null);
    setInitialUrl(''); // Clear URL when going back
  };

  // Platform Selector (Landing Page)
  if (!selectedPlatform) {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <PlatformSelector
          onSelectPlatform={setSelectedPlatform}
          setInitialUrl={setInitialUrl}
        />
      </div>
    );
  }

  // YouTube Downloader View
  if (selectedPlatform === 'youtube') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon youtube-logo">
                <Youtube size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              YouTube <span className="gradient-text">Downloader</span>
            </h1>

            <p className="app-subtitle">
              Download your favorite YouTube videos in multiple formats and quality levels.
              Fast, secure, and completely free!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Zap size={14} />
                <span>Lightning Fast</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>100% Secure</span>
              </div>
              <div className="feature-pill">
                <Download size={14} />
                <span>Multiple Formats</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <VideoDownloader initialUrl={initialUrl} />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect YouTube's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Facebook Downloader View
  if (selectedPlatform === 'facebook') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon facebook-logo">
                <Facebook size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge facebook-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              Facebook <span className="gradient-text-fb">Downloader</span>
            </h1>

            <p className="app-subtitle">
              Download Facebook videos in HD and SD quality.
              Fast single-stream downloads with audio included!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Zap size={14} />
                <span>Fast Downloads</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>Private Videos</span>
              </div>
              <div className="feature-pill">
                <Download size={14} />
                <span>HD Quality</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <FacebookDownloader initialUrl={initialUrl} />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect Facebook's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  // Instagram Downloader View
  if (selectedPlatform === 'instagram') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon instagram-logo">
                <Instagram size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge instagram-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              Instagram <span className="gradient-text-ig">Downloader</span>
            </h1>

            <p className="app-subtitle">
              Download Instagram Reels, Posts, and IGTV videos instantly.
              Simple one-click downloads with video and audio!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Film size={14} />
                <span>Reels & IGTV</span>
              </div>
              <div className="feature-pill">
                <Zap size={14} />
                <span>One-Click Download</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>Best Quality</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <InstagramDownloader initialUrl={initialUrl} />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect Instagram's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  // TikTok Downloader View
  if (selectedPlatform === 'tiktok') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon tiktok-logo">
                <Music size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge tiktok-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              TikTok <span className="gradient-text-tiktok">Downloader</span>
            </h1>

            <p className="app-subtitle">
              Download TikTok videos without watermark in best quality.
              Fast, simple, and instant downloads!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Sparkles size={14} />
                <span>No Watermark</span>
              </div>
              <div className="feature-pill">
                <Zap size={14} />
                <span>Instant Download</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>Best Quality</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <TikTokDownloader initialUrl={initialUrl} />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect TikTok's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  // X (Twitter) Downloader View
  if (selectedPlatform === 'twitter') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon twitter-logo">
                <XLogo size={40} />
              </div>
              <div className="logo-badge twitter-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              X (Twitter) <span className="gradient-text-twitter">Downloader</span>
            </h1>

            <p className="app-subtitle">
              Download Twitter/X videos and GIFs in multiple quality options.
              Super fast direct downloads with no processing!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Zap size={14} />
                <span>Super Fast</span>
              </div>
              <div className="feature-pill">
                <Film size={14} />
                <span>Videos & GIFs</span>
              </div>
              <div className="feature-pill">
                <Sparkles size={14} />
                <span>Multi Quality</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <TwitterDownloader initialUrl={initialUrl} />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect X (Twitter) Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  // Direct URL Downloader View
  if (selectedPlatform === 'direct') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon direct-logo">
                <Link2 size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge direct-badge">
                <Download size={16} />
              </div>
            </div>

            <h1 className="app-title">
              Direct <span className="gradient-text-direct">URL Download</span>
            </h1>

            <p className="app-subtitle">
              Download from direct video URLs like googlevideo.com streams or raw .mp4 links.
              Fast, no processing needed!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Zap size={14} />
                <span>Raw Streams</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>No Processing</span>
              </div>
              <div className="feature-pill">
                <Download size={14} />
                <span>Direct Transfer</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <DirectDownloader />
          </main>

          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2026 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Direct URLs expire quickly - download immediately after obtaining them
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  return null;
}

export default App;
