import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { Search, Loader2, Link2, AlertCircle } from 'lucide-react';

import '../styles/PlatformSelector.css';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const PlatformSelector = ({ onSelectPlatform, setInitialUrl }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const carouselRef = useRef(null);

  // Auto-detect state
  const [autoUrl, setAutoUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');

  const platforms = useMemo(
    () => [
      {
        id: 'youtube',
        name: 'YouTube',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        ),
        color: '#FF0000',
        gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
        description: 'Download videos, shorts & music',
        features: ['4K/8K Quality', 'Audio Only', 'Subtitles'],
      },
      {
        id: 'facebook',
        name: 'Facebook',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ),
        color: '#1877F2',
        gradient: 'linear-gradient(135deg, #1877F2 0%, #0D5CBE 100%)',
        description: 'Videos, Reels & Watch content',
        features: ['HD Quality', 'Private Videos', 'Reels'],
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
          </svg>
        ),
        color: '#E4405F',
        gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
        description: 'Reels, Stories & Posts',
        features: ['Reels', 'Stories', 'IGTV'],
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        ),
        color: '#000000',
        gradient: 'linear-gradient(135deg, #00F2EA 0%, #FF0050 100%)',
        description: 'Videos without watermark',
        features: ['No Watermark', 'HD Quality', 'Audio'],
      },
      {
        id: 'twitter',
        name: 'X (Twitter)',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        ),
        color: '#000000',
        gradient: 'linear-gradient(135deg, #1DA1F2 0%, #14171A 100%)',
        description: 'Videos, GIFs & Media',
        features: ['HD Video', 'GIFs', 'Threads'],
      },
      {
        id: 'direct',
        name: 'Direct URL',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-platform-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        ),
        color: '#6366F1',
        gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        description: 'Any video URL',
        features: ['Any Site', 'M3U8/HLS', 'Direct MP4'],
      },
    ],
    []
  );

  const totalItems = platforms.length;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  const goToIndex = (index) => setActiveIndex(index);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Enter') onSelectPlatform(platforms[activeIndex].id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, activeIndex, onSelectPlatform, platforms]);

  const handleAutoDetect = async (url) => {
    if (!url.trim()) return;

    setDetecting(true);
    setDetectError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/detect-platform`, { url });
      const { platform } = response.data;

      if (platform && platform !== 'unknown') {
        setInitialUrl(url);
        onSelectPlatform(platform);
      } else {
        setDetectError('Could not detect platform. Please select manually.');
      }
    } catch (err) {
      setDetectError('Failed to detect platform. Please try again.');
    } finally {
      setDetecting(false);
    }
  };

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    setStartX(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    setDragOffset(currentX - startX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50;
    if (dragOffset > threshold) goToPrev();
    else if (dragOffset < -threshold) goToNext();
    setDragOffset(0);
  };

  const getCardStyle = (index) => {
    let diff = index - activeIndex;

    if (diff > totalItems / 2) diff -= totalItems;
    if (diff < -totalItems / 2) diff += totalItems;

    const isCenter = diff === 0;
    const isAdjacent = Math.abs(diff) === 1;
    const isVisible = Math.abs(diff) <= 2;

    if (!isVisible) {
      return {
        opacity: 0,
        transform: `translateX(${diff * 100}%) scale(0.5)`,
        zIndex: 0,
        pointerEvents: 'none',
      };
    }

    let scale, opacity, blur, zIndex;
    if (isCenter) {
      scale = 1;
      opacity = 1;
      blur = 0;
      zIndex = 10;
    } else if (isAdjacent) {
      scale = 0.85;
      opacity = 0.6;
      blur = 2;
      zIndex = 5;
    } else {
      scale = 0.7;
      opacity = 0.3;
      blur = 4;
      zIndex = 1;
    }

    const translateX = diff * 280 + (isDragging ? dragOffset * 0.5 : 0);

    return {
      transform: `translateX(${translateX}px) scale(${scale})`,
      opacity,
      filter: blur > 0 ? `blur(${blur}px)` : 'none',
      zIndex,
      pointerEvents: isCenter ? 'auto' : 'none',
    };
  };

  return (
    <div className="ps-container">
      <div className="ps-backgroundGradient" />

      {/* Header */}
      <div className="ps-header">
        <h1 className="ps-title">MediaFlex Downloader</h1>
        <p className="ps-subtitle">Premium Video Downloader</p>
      </div>

      {/* Search bar directly under subtitle */}
      <div className="ps-autoDetectWrap">
        <form
          className="ps-autoDetectForm"
          onSubmit={(e) => {
            e.preventDefault();
            handleAutoDetect(autoUrl);
          }}
        >
          <div className="ps-inputWrap">
            <div className="ps-inputIcon">
              <Link2 size={20} />
            </div>
            <input
              type="text"
              value={autoUrl}
              onChange={(e) => setAutoUrl(e.target.value)}
              placeholder="Paste any video link to auto-start..."
              className="ps-autoDetectInput"
            />
          </div>

          <button
            type="submit"
            disabled={detecting || !autoUrl.trim()}
            className="ps-autoDetectBtn"
          >
            {detecting ? (
              <Loader2 size={20} className="ps-spin" />
            ) : (
              <>
                <span>Go</span>
                <Search size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Navigation Bar Above Cards */}
      <div className="ps-navBar">
        <button className="ps-navArrowButton" onClick={goToPrev} aria-label="Previous platform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-arrowIcon">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <div className="ps-dotsContainer">
          {platforms.map((platform, index) => (
            <button
              key={platform.id}
              className={`ps-dot ${index === activeIndex ? 'ps-dotActive' : ''}`}
              style={
                index === activeIndex
                  ? { background: platform.gradient, boxShadow: `0 0 20px ${platform.color}` }
                  : undefined
              }
              onClick={() => goToIndex(index)}
              aria-label={`Go to ${platform.name}`}
            />
          ))}
        </div>

        <button className="ps-navArrowButton" onClick={goToNext} aria-label="Next platform">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ps-arrowIcon">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* Instruction Card */}
      <div className="ps-instructionCard">
        <div className="ps-instructionItem">
          <div className="ps-keyGroup">
            <kbd className="ps-kbd">←</kbd>
            <kbd className="ps-kbd">→</kbd>
          </div>
          <span className="ps-instructionLabel">Navigate</span>
        </div>

        <div className="ps-instructionDivider" />

        <div className="ps-instructionItem">
          <kbd className="ps-kbd">Enter</kbd>
          <span className="ps-instructionLabel">Select</span>
        </div>
      </div>

      {/* Carousel */}
      <div
        className="ps-carouselWrapper"
        ref={carouselRef}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <div className="ps-carouselTrack">
          {platforms.map((platform, index) => (
            <div
              key={platform.id}
              className="ps-card"
              style={{
                ...getCardStyle(index),
                '--platform-color': platform.color,
                '--platform-gradient': platform.gradient,
              }}

              onClick={() => {
                if (index === activeIndex) onSelectPlatform(platform.id);
                else goToIndex(index);
              }}
            >
              <div className="ps-cardGlow" />

              <div className="ps-cardContent">
                <div className="ps-iconWrapper">{platform.icon}</div>

                <h2 className="ps-cardTitle">{platform.name}</h2>
                <p className="ps-cardDescription">{platform.description}</p>

                <div className="ps-features">
                  {platform.features.map((feature, i) => (
                    <span key={i} className="ps-featureTag">
                      {feature}
                    </span>
                  ))}
                </div>

                {index === activeIndex && (
                  <button
                    className="ps-selectButton"
                    style={{ background: platform.gradient }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlatform(platform.id);
                    }}
                  >
                    Select Platform
                    <svg viewBox="0 0 24 24" fill="currentColor" className="ps-selectArrow">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="ps-disclaimer">
        <svg viewBox="0 0 24 24" fill="currentColor" className="ps-disclaimerIcon">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <span>
          Please respect the Terms of Service of all platforms. Download content for personal use only and
          respect content creators&apos; rights.
        </span>
      </div>

      {/* Error shown at the bottom (under everything) */}
      {detectError && (
        <div className="ps-bottomError">
          <AlertCircle size={14} />
          <span>{detectError}</span>
        </div>
      )}
    </div>
  );
};

export default PlatformSelector;
