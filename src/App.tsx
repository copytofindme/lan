/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload } from 'lucide-react';

const REDIRECT_URL = 'https://t.me/+ce7fl6Glt09jOTIy';
const REQUIRED_PLAYS = 2;

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('/video.mp4');
  const [playCount, setPlayCount] = useState<number>(0);
  const [showButton, setShowButton] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Check if public/video.mp4 exists on the server
  useEffect(() => {
    fetch('/api/check-video')
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setHasVideo(true);
        } else {
          setHasVideo(false);
        }
      })
      .catch(() => {
        setHasVideo(false);
      });
  }, []);

  // Handle uploading and playing user's selected file
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Immediately play local object URL without waiting
    const localUrl = URL.createObjectURL(file);
    setVideoSrc(localUrl);
    setHasVideo(true);
    setPlayCount(0);
    setShowButton(false);
    setIsUploading(true);

    try {
      // Save permanently to server public/video.mp4
      await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
        body: file,
      });
    } catch (err) {
      console.error('Failed to save video to server:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Attempt autoplay with maximum volume
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = 1.0;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback for browsers blocking unmuted autoplay:
        // Start muted so video rolls immediately, unmute on first gesture
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    if (hasVideo) {
      startPlayback();
    }

    // Touch/click anywhere on screen sets volume to 1.0 and unmutes
    const handleUserGesture = () => {
      const video = videoRef.current;
      if (video) {
        if (video.muted) {
          video.muted = false;
        }
        video.volume = 1.0;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
    };
  }, [hasVideo, startPlayback]);

  // Handle video ending: plays continuously, shows button after 2nd round
  const handleEnded = () => {
    const nextCount = playCount + 1;
    setPlayCount(nextCount);

    if (nextCount >= REQUIRED_PLAYS) {
      setShowButton(true);
    }

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.volume = 1.0;
      video.muted = false;
      video.play().catch(() => {});
    }
  };

  // Prevent user from pausing video
  const handlePause = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.play().catch(() => {});
  };

  // Lock volume at maximum (1.0)
  const handleVolumeChange = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.volume < 1.0 || video.muted) {
      video.volume = 1.0;
      video.muted = false;
    }
  };

  // Prevent timeline scrubbing
  const handleSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!showButton) {
      const video = e.currentTarget;
      video.play().catch(() => {});
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-screen h-[100dvh] bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* Hidden file input for uploading */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* When no video is uploaded yet: simple upload prompt */}
      {hasVideo === false && (
        <div className="flex flex-col items-center justify-center px-6 text-center max-w-sm">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-neutral-900 border-2 border-dashed border-neutral-700 hover:border-blue-500 active:scale-95 transition-all text-neutral-300 hover:text-white cursor-pointer w-full"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Выберите видеофайл</p>
              <p className="text-sm text-neutral-400 mt-1">
                Нажмите сюда или перетащите видеофайл из устройства
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Main Video View: Mobile-first 9:16 vertical full screen */}
      {hasVideo === true && (
        <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center bg-black overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            playsInline
            disablePictureInPicture
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            onEnded={handleEnded}
            onPause={handlePause}
            onVolumeChange={handleVolumeChange}
            onSeeking={handleSeeking}
            className="w-full h-full object-cover pointer-events-none"
          />

          {/* Transparent touch layer to prevent native tap-to-pause */}
          <div
            className="absolute inset-0 z-10 cursor-default"
            onClick={(e) => {
              e.preventDefault();
              const video = videoRef.current;
              if (video && video.paused) {
                video.play().catch(() => {});
              }
            }}
          />

          {/* "Лан" Button Overlay with Smooth Animation after 2nd playback */}
          <AnimatePresence>
            {showButton && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute inset-x-0 bottom-16 sm:bottom-20 z-20 flex flex-col items-center justify-center px-6"
              >
                <motion.a
                  href={REDIRECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full max-w-[280px] py-4 px-8 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-2xl text-center rounded-2xl shadow-[0_10px_35px_rgba(37,99,235,0.6)] transition-colors duration-200 tracking-wide select-none"
                >
                  Лан
                </motion.a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
