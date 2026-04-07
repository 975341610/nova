import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { useMusic } from '../../contexts/MusicContext';

export const FloatingMusicCapsule: React.FC = () => {
  const { currentTrack, isPlaying, toggle, next, prev, stop } = useMusic();

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-white/80 backdrop-blur-md border border-white/40 shadow-xl rounded-full px-2 py-2 pr-4 select-none"
      >
        {/* Vinyl Disc */}
        <div className="relative w-12 h-12 shrink-0">
          <div className="absolute inset-0 rounded-full bg-black/90 shadow-md" />
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 4, ease: 'linear', repeat: isPlaying ? Infinity : 0 }}
            className="absolute inset-1 rounded-full overflow-hidden"
            style={{
              backgroundImage: currentTrack.cover ? `url(${currentTrack.cover})` : 'linear-gradient(45deg, #FF9A9E 0%, #FAD0C4 99%, #FAD0C4 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white/90 border border-black/10" />
          </div>
        </div>

        {/* Info & Controls */}
        <div className="flex flex-col min-w-0 max-w-[150px]">
          <div className="text-[12px] font-bold text-gray-800 truncate whitespace-nowrap">
            {currentTrack.title}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={prev}
              className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-600"
            >
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button
              onClick={toggle}
              className="p-1.5 bg-black text-white rounded-full hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            </button>
            <button
              onClick={next}
              className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-600"
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={stop}
          className="ml-2 p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
