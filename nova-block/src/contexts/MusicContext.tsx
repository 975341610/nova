import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, getApiBase } from '../lib/api';

export interface Track {
  url: string;
  title: string;
  artist?: string;
  cover?: string;
}

interface MusicControlsContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  volume: number;
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  stop: () => void;
  setPlaylist: (tracks: Track[]) => void;
  refreshPlaylist: () => Promise<void>;
}

interface MusicProgressContextType {
  progress: number;
  duration: number;
  setProgress: (v: number) => void;
}

const MusicControlsContext = createContext<MusicControlsContextType | undefined>(undefined);
const MusicProgressContext = createContext<MusicProgressContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [volume, setVolume] = useState(0.8);

  // 让 audio 标签在顶层常驻（避免因组件隐藏/重渲染导致音频中断）
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => {});

  const play = useCallback(
    (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentTrack?.url === track.url) {
        if (!isPlaying) {
          audio.play().catch(console.error);
          setIsPlaying(true);
        }
        return;
      }

      setCurrentTrack(track);
      audio.src = track.url;
      audio.play().catch(console.error);
      setIsPlaying(true);
    },
    [currentTrack, isPlaying],
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(console.error);
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
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgressState(0);
    setDuration(0);
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
    const audio = audioRef.current;
    if (audio && audio.duration) {
      const time = v * audio.duration;
      audio.currentTime = time;
      setProgressState(v);
    }
  }, []);

  const refreshPlaylist = useCallback(async () => {
    try {
      const data = await api.listMusicLibrary();
      if (Array.isArray(data)) {
        const apiBase = getApiBase().replace(/\/api$/, '');
        const tracks = data.map((track: any) => ({
          ...track,
          url: track.url.startsWith('http') ? track.url : `${apiBase}${track.url}`,
          cover: track.cover
            ? track.cover.startsWith('http')
              ? track.cover
              : `${apiBase}${track.cover}`
            : track.cover,
        }));
        setPlaylist(tracks);
      }
    } catch (err) {
      console.error('Failed to fetch music library:', err);
    }
  }, []);

  // Fetch local library
  useEffect(() => {
    refreshPlaylist();
  }, [refreshPlaylist]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgressState(audio.currentTime / audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      nextRef.current();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const controlsValue = useMemo<MusicControlsContextType>(
    () => ({
      currentTrack,
      isPlaying,
      playlist,
      volume,
      play,
      pause,
      resume,
      toggle,
      next,
      prev,
      setVolume,
      stop,
      setPlaylist,
      refreshPlaylist,
    }),
    [
      currentTrack,
      isPlaying,
      playlist,
      volume,
      play,
      pause,
      resume,
      toggle,
      next,
      prev,
      stop,
      refreshPlaylist,
    ],
  );

  const progressValue = useMemo<MusicProgressContextType>(
    () => ({
      progress,
      duration,
      setProgress,
    }),
    [progress, duration, setProgress],
  );

  return (
    <MusicControlsContext.Provider value={controlsValue}>
      <MusicProgressContext.Provider value={progressValue}>
        <audio ref={audioRef} preload="metadata" />
        {children}
      </MusicProgressContext.Provider>
    </MusicControlsContext.Provider>
  );
};

export const useMusicControls = () => {
  const context = useContext(MusicControlsContext);
  if (!context) {
    throw new Error('useMusicControls must be used within a MusicProvider');
  }
  return context;
};

export const useMusicProgress = () => {
  const context = useContext(MusicProgressContext);
  if (!context) {
    throw new Error('useMusicProgress must be used within a MusicProvider');
  }
  return context;
};

export const useMusic = () => {
  return {
    ...useMusicControls(),
    ...useMusicProgress(),
  };
};
