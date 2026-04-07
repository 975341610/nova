import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { api, getApiBase } from '../lib/api';

export interface Track {
  url: string;
  title: string;
  artist?: string;
  cover?: string;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playlist: Track[];
  volume: number;
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setProgress: (v: number) => void;
  stop: () => void;
  setPlaylist: (tracks: Track[]) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgressState(audio.currentTime / audio.duration);
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      next();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback((track: Track) => {
    if (!audioRef.current) return;
    
    if (currentTrack?.url === track.url) {
      if (!isPlaying) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    setCurrentTrack(track);
    audioRef.current.src = track.url;
    audioRef.current.play().catch(console.error);
    setIsPlaying(true);
  }, [currentTrack, isPlaying]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(console.error);
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentTrack) {
      resume();
    }
  }, [isPlaying, currentTrack, pause, resume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgressState(0);
  }, []);

  const next = useCallback(() => {
    if (playlist.length === 0 || !currentTrack) return;
    const index = playlist.findIndex(t => t.url === currentTrack.url);
    const nextIndex = (index + 1) % playlist.length;
    play(playlist[nextIndex]);
  }, [playlist, currentTrack, play]);

  const prev = useCallback(() => {
    if (playlist.length === 0 || !currentTrack) return;
    const index = playlist.findIndex(t => t.url === currentTrack.url);
    const prevIndex = (index - 1 + playlist.length) % playlist.length;
    play(playlist[prevIndex]);
  }, [playlist, currentTrack, play]);

  const setProgress = useCallback((v: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const time = v * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgressState(v);
    }
  }, []);

  // Fetch local library
  useEffect(() => {
    api.listMusicLibrary()
      .then(data => {
        if (Array.isArray(data)) {
          const apiBase = getApiBase().replace(/\/api$/, '');
          const tracks = data.map(track => ({
            ...track,
            url: track.url.startsWith('http') ? track.url : `${apiBase}${track.url}`,
            cover: track.cover ? (track.cover.startsWith('http') ? track.cover : `${apiBase}${track.cover}`) : track.cover
          }));
          setPlaylist(tracks);
        }
      })
      .catch(err => console.error('Failed to fetch music library:', err));
  }, []);

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      duration,
      playlist,
      volume,
      play,
      pause,
      resume,
      toggle,
      next,
      prev,
      setVolume,
      setProgress,
      stop,
      setPlaylist
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
