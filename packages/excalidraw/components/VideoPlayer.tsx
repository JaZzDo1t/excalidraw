import React, { useEffect, useRef, useState, useCallback } from "react";
import { sceneCoordsToViewportCoords } from "@excalidraw/common";
import type { ExcalidrawVideoElement } from "@excalidraw/element/types";
import { dataURLToBlobURL, captureAndCacheVideoFrame } from "@excalidraw/element";
import type { AppState, BinaryFiles } from "../types";
import type { FileId } from "@excalidraw/element/types";
import "./VideoPlayer.scss";

type VideoFrameCache = Map<
  FileId,
  { image: HTMLImageElement; capturedAt: number }
>;

interface VideoPlayerProps {
  element: ExcalidrawVideoElement;
  appState: AppState;
  files: BinaryFiles;
  videoFrameCache: VideoFrameCache;
  onClose: (state: {
    currentTime: number;
    playbackRate: number;
    volume: number;
  }) => void;
  onExtractFrame: () => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  element,
  appState,
  files,
  videoFrameCache,
  onClose,
  onExtractFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(element.currentTime || 0);
  const [duration, setDuration] = useState(element.duration || 0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(element.playbackRate ?? 1);
  const [volume, setVolume] = useState(element.volume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false);

  // Create blob URL from file dataURL on mount, revoke on unmount
  useEffect(() => {
    if (!element.fileId) {
      return;
    }
    const fileData = files[element.fileId as unknown as string];
    if (!fileData) {
      return;
    }
    const url = dataURLToBlobURL(fileData.dataURL as unknown as string);
    blobUrlRef.current = url;

    if (videoRef.current) {
      const v = videoRef.current;
      v.src = url;
      // If saved position is at end, restart from beginning
      const savedTime = element.currentTime || 0;
      const dur = element.duration || 0;
      v.currentTime = dur > 0 && savedTime >= dur - 0.1 ? 0 : savedTime;
      v.playbackRate = element.playbackRate ?? 1;
      v.volume = element.volume ?? 1;
      // Auto-play on mount; if blocked by browser policy, retry muted
      const tryPlay = () => {
        v.play()
          .then(() => setHasStarted(true))
          .catch(() => {
            v.muted = true;
            setIsMuted(true);
            v.play()
              .then(() => setHasStarted(true))
              .catch((e) => console.warn("Autoplay blocked:", e));
          });
      };
      // Wait for metadata to be ready before play
      if (v.readyState >= 2) {
        tryPlay();
      } else {
        v.addEventListener("loadeddata", tryPlay, { once: true });
      }
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.fileId]);

  // Auto-hide controls after 3 sec when playing
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !speedMenuOpen && !volumeMenuOpen) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, speedMenuOpen, volumeMenuOpen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  const togglePlay = () => {
    if (!videoRef.current) {
      return;
    }
    if (videoRef.current.paused) {
      setHasStarted(true);
      videoRef.current.play().catch((e) => console.warn("Play failed:", e));
    } else {
      videoRef.current.pause();
      if (element.fileId) {
        captureAndCacheVideoFrame(element.fileId, videoRef.current);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) {
      return;
    }
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current && element.fileId) {
      videoRef.current.pause();
      captureAndCacheVideoFrame(element.fileId, videoRef.current);
    }
    onClose({
      currentTime: videoRef.current?.currentTime || 0,
      playbackRate,
      volume: isMuted ? 0 : volume,
    });
  };

  const setSpeed = (rate: number) => {
    if (!videoRef.current) {
      return;
    }
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setSpeedMenuOpen(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) {
      return;
    }
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) {
      return;
    }
    const v = parseFloat(e.target.value);
    videoRef.current.volume = v;
    videoRef.current.muted = v === 0;
    setVolume(v);
    setIsMuted(v === 0);
  };

  // Compute screen-space transform
  const { x, y } = sceneCoordsToViewportCoords(
    { sceneX: element.x, sceneY: element.y },
    appState,
  );
  const scale = appState.zoom.value;

  const showCenterPlay = !isPlaying;

  return (
    <div
      className="excalidraw__video-container"
      style={{
        transform: `translate(${x - appState.offsetLeft}px, ${
          y - appState.offsetTop
        }px) scale(${scale})`,
        transformOrigin: "top left",
        width: element.width,
        height: element.height,
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        resetControlsTimeout();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        className="excalidraw__video-element"
        playsInline
        onPlay={() => {
          setIsPlaying(true);
          resetControlsTimeout();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (controlsTimeoutRef.current) {
            window.clearTimeout(controlsTimeoutRef.current);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime((e.target as HTMLVideoElement).currentTime);
        }}
        onLoadedMetadata={(e) => {
          setDuration((e.target as HTMLVideoElement).duration);
        }}
        onClick={togglePlay}
      />

      {showCenterPlay && (
        <button
          type="button"
          className="excalidraw__video-center-play"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          title="Play"
          aria-label="Play"
        >
          <svg viewBox="0 0 24 24" width="32" height="32">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </button>
      )}

      {showControls && (
        <button
          type="button"
          className="excalidraw__video-close"
          onClick={handleClose}
          title="Close player"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      {showControls && (
        <div
          className="excalidraw__video-controls"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="excalidraw__video-btn"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            )}
          </button>

          <input
            type="range"
            className="excalidraw__video-seek"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            onClick={(e) => e.stopPropagation()}
          />

          <span className="excalidraw__video-time">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>

          {/* Speed - popup upward */}
          <div className="excalidraw__video-popup-wrap">
            {speedMenuOpen && (
              <div className="excalidraw__video-popup excalidraw__video-popup--speed">
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={
                      "excalidraw__video-popup-item" +
                      (playbackRate === rate ? " is-active" : "")
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpeed(rate);
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="excalidraw__video-btn excalidraw__video-btn--text"
              onClick={(e) => {
                e.stopPropagation();
                setVolumeMenuOpen(false);
                setSpeedMenuOpen((v) => !v);
              }}
              title="Playback speed"
              aria-label="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>

          {/* Volume - popup upward */}
          <div className="excalidraw__video-popup-wrap">
            {volumeMenuOpen && (
              <div className="excalidraw__video-popup excalidraw__video-popup--volume">
                <input
                  type="range"
                  className="excalidraw__video-volume-vertical"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="excalidraw__video-volume-label">
                  {Math.round((isMuted ? 0 : volume) * 100)}
                </span>
              </div>
            )}
            <button
              type="button"
              className="excalidraw__video-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSpeedMenuOpen(false);
                setVolumeMenuOpen((v) => !v);
              }}
              onDoubleClick={toggleMute}
              title={
                isMuted ? "Unmute (double-click)" : "Volume (double-click to mute)"
              }
              aria-label="Volume"
            >
              {isMuted || volume === 0 ? (
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </div>

          <button
            type="button"
            className="excalidraw__video-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                if (element.fileId) {
                  captureAndCacheVideoFrame(element.fileId, videoRef.current);
                }
              }
              onExtractFrame();
            }}
            title="Extract current frame to canvas"
            aria-label="Extract frame"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
