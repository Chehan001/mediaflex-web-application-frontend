import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Link2,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

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

  const handleAutoDetect = async (url) => {
    if (!url.trim()) return;

    setDetecting(true);
    setDetectError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/detect-platform`, { url });
      const { platform } = response.data;

      if (platform && platform !== 'unknown') {
        setInitialUrl(url); // Set the URL for the next screen
        onSelectPlatform(platform); // Navigate
      } else {
        setDetectError('Could not detect platform. Please select manually.');
      }
    } catch (err) {
      setDetectError('Failed to detect platform. Please try again.');
    } finally {
      setDetecting(false);
    }
  };

  const platforms = useMemo(() => [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      color: '#FF0000',
      gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
      description: 'Download videos, shorts & music',
      features: ['4K/8K Quality', 'Audio Only', 'Subtitles']
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: '#1877F2',
      gradient: 'linear-gradient(135deg, #1877F2 0%, #0D5CBE 100%)',
      description: 'Videos, Reels & Watch content',
      features: ['HD Quality', 'Private Videos', 'Reels']
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
      color: '#E4405F',
      gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
      description: 'Reels, Stories & Posts',
      features: ['Reels', 'Stories', 'IGTV']
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
      color: '#000000',
      gradient: 'linear-gradient(135deg, #00F2EA 0%, #FF0050 100%)',
      description: 'Videos without watermark',
      features: ['No Watermark', 'HD Quality', 'Audio']
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: '#000000',
      gradient: 'linear-gradient(135deg, #1DA1F2 0%, #14171A 100%)',
      description: 'Videos, GIFs & Media',
      features: ['HD Video', 'GIFs', 'Threads']
    },
    {
      id: 'direct',
      name: 'Direct URL',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '48px', height: '48px' }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
      color: '#6366F1',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      description: 'Any video URL',
      features: ['Any Site', 'M3U8/HLS', 'Direct MP4']
    }
  ], []);

  const totalItems = platforms.length;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  const goToIndex = (index) => {
    setActiveIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'Enter') {
        onSelectPlatform(platforms[activeIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, activeIndex, onSelectPlatform, platforms]);

  // Touch/Mouse drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    setStartX(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
    setDragOffset(0);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startX;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50;
    if (dragOffset > threshold) {
      goToPrev();
    } else if (dragOffset < -threshold) {
      goToNext();
    }
    setDragOffset(0);
  };

  // Calculate card position and style
  const getCardStyle = (index) => {
    let diff = index - activeIndex;

    // Handle wrap-around for infinite feel
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
    <div style={styles.container}>
      {/* Background gradient */}
      <div style={styles.backgroundGradient} />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titleIcon}>⚡</span>
          MediaFlow
        </h1>
        <p style={styles.subtitle}>Premium Video Downloader</p>
      </div>

      {/* Navigation Bar Above Cards */}
      <div style={styles.navBar}>
        {/* Left Arrow */}
        <button
          style={styles.navArrowButton}
          onClick={goToPrev}
          aria-label="Previous platform"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Dot Indicators */}
        <div style={styles.dotsContainer}>
          {platforms.map((platform, index) => (
            <button
              key={platform.id}
              style={{
                ...styles.dot,
                ...(index === activeIndex ? {
                  ...styles.dotActive,
                  background: platform.gradient,
                  boxShadow: `0 0 20px ${platform.color}`,
                } : {}),
              }}
              onClick={() => goToIndex(index)}
              aria-label={`Go to ${platform.name}`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          style={styles.navArrowButton}
          onClick={goToNext}
          aria-label="Next platform"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* 🚀 NEW: Auto-Detect Input */}
      <div style={{
        marginBottom: '30px',
        width: '100%',
        maxWidth: '600px',
        zIndex: 10
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAutoDetect(autoUrl);
          }}
          style={{
            position: 'relative',
            display: 'flex',
            gap: '12px'
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Link2 size={20} />
            </div>
            <input
              type="text"
              value={autoUrl}
              onChange={(e) => setAutoUrl(e.target.value)}
              placeholder="Paste any video link to auto-start..."
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              className="auto-detect-input"
            />
          </div>
          <button
            type="submit"
            disabled={detecting || !autoUrl.trim()}
            style={{
              padding: '0 24px',
              background: 'white',
              border: 'none',
              borderRadius: '16px',
              color: 'black',
              fontWeight: '600',
              cursor: detecting || !autoUrl.trim() ? 'not-allowed' : 'pointer',
              opacity: detecting || !autoUrl.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {detecting ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <>
                <span>Go</span>
                <Search size={18} />
              </>
            )}
          </button>
        </form>
        {detectError && (
          <div style={{
            marginTop: '12px',
            color: '#ff4d4d',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 77, 77, 0.1)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 77, 77, 0.2)'
          }}>
            <AlertCircle size={14} />
            {detectError}
          </div>
        )}
      </div>

      {/* Instruction Card Above Carousel */}
      <div style={styles.instructionCard}>
        <div style={styles.instructionItem}>
          <div style={styles.keyGroup}>
            <kbd style={styles.kbd}>←</kbd>
            <kbd style={styles.kbd}>→</kbd>
          </div>
          <span style={styles.instructionLabel}>Navigate</span>
        </div>
        <div style={styles.instructionDivider} />
        <div style={styles.instructionItem}>
          <kbd style={styles.kbd}>Enter</kbd>
          <span style={styles.instructionLabel}>Select</span>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        style={styles.carouselWrapper}
        ref={carouselRef}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Cards */}
        <div style={styles.carouselTrack}>
          {platforms.map((platform, index) => (
            <div
              key={platform.id}
              style={{
                ...styles.card,
                ...getCardStyle(index),
                '--platform-color': platform.color,
                '--platform-gradient': platform.gradient,
              }}
              onClick={() => {
                if (index === activeIndex) {
                  onSelectPlatform(platform.id);
                } else {
                  goToIndex(index);
                }
              }}
            >
              {/* Card glow effect */}
              <div style={{
                ...styles.cardGlow,
                background: platform.gradient,
              }} />

              {/* Card content */}
              <div style={styles.cardContent}>
                <div style={{
                  ...styles.iconWrapper,
                  background: platform.gradient,
                }}>
                  {platform.icon}
                </div>

                <h2 style={styles.cardTitle}>{platform.name}</h2>
                <p style={styles.cardDescription}>{platform.description}</p>

                <div style={styles.features}>
                  {platform.features.map((feature, i) => (
                    <span key={i} style={styles.featureTag}>
                      {feature}
                    </span>
                  ))}
                </div>

                {index === activeIndex && (
                  <button
                    style={{
                      ...styles.selectButton,
                      background: platform.gradient,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlatform(platform.id);
                    }}
                  >
                    Select Platform
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px', marginLeft: '8px' }}>
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Disclaimer Notice */}
      <div style={styles.disclaimer}>
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <span>
          Please respect the Terms of Service of all platforms. Download content for personal use only and respect content creators' rights.
        </span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 70%)
    `,
    pointerEvents: 'none',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    zIndex: 10,
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  titleIcon: {
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    WebkitTextFillColor: 'initial',
  },
  subtitle: {
    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '8px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '30px',
    padding: '16px 32px',
    borderRadius: '50px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    zIndex: 20,
  },
  navArrowButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  carouselWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '1200px',
    height: '420px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    userSelect: 'none',
  },
  carouselTrack: {
    position: 'relative',
    width: '320px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: '300px',
    height: '380px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.37),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1)
    `,
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    opacity: 0.1,
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  cardContent: {
    position: 'relative',
    zIndex: 2,
    padding: '32px 24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  features: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  featureTag: {
    padding: '6px 12px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.75rem',
    fontWeight: '500',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  selectButton: {
    marginTop: 'auto',
    padding: '14px 28px',
    borderRadius: '12px',
    border: 'none',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  dotsContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    padding: 0,
  },
  dotActive: {
    width: '36px',
    borderRadius: '6px',
    boxShadow: '0 0 20px currentColor',
  },
  platformIndicator: {
    marginTop: '24px',
    textAlign: 'center',
    zIndex: 10,
  },
  platformName: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '8px',
    transition: 'color 0.3s ease',
  },
  platformHint: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  instructionCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '16px 32px',
    marginBottom: '24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    zIndex: 10,
  },
  instructionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  instructionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  instructionDivider: {
    width: '1px',
    height: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
  },
  keyGroup: {
    display: 'flex',
    gap: '6px',
  },
  kbd: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  videoTypes: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '16px',
    padding: '10px 16px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  videoTypesLabel: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  videoTypesList: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  disclaimer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '30px',
    padding: '14px 24px',
    maxWidth: '600px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    color: 'rgba(251, 191, 36, 0.9)',
    fontSize: '0.8rem',
    textAlign: 'center',
    lineHeight: '1.5',
    zIndex: 10,
  },
};

// Add CSS for hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;
document.head.appendChild(styleSheet);

export default PlatformSelector;
