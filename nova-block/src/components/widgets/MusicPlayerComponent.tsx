import React, { useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link2, Play, Pause, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { useMusic } from '../../contexts/MusicContext';
import { getApiBase } from '../../lib/api';

const palette = {
  bg: 'bg-[#F6F3EF]',
  card: 'bg-white/70',
  text: 'text-[#2E2A2A]',
  subtle: 'text-[#6E6868]',
  border: 'border-[#E6DFD8]',
};

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MusicPlayerComponent: React.FC<any> = (props) => {
  const { editor, node, updateAttributes, selected } = props;
  const isEditable = editor?.isEditable;

  const { currentTrack, isPlaying, progress, duration, play, toggle, setProgress } = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);

  const src = node?.attrs?.src || '';
  const title = node?.attrs?.title || '未命名歌曲';
  const artist = node?.attrs?.artist || '未知艺术家';
  const cover = node?.attrs?.cover || '';

  const isCurrent = currentTrack?.url === src || (currentTrack?.url === (src.startsWith('http') || src.startsWith('blob:') ? src : `${getApiBase().replace(/\/api$/, '')}${src}`));
  const isActive = isCurrent && isPlaying;

  const handleToggle = () => {
    if (isCurrent) {
      toggle();
    } else {
      const apiBase = getApiBase().replace(/\/api$/, '');
      const normalizedSrc = src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:') ? src : `${apiBase}${src}`;
      const normalizedCover = cover && !cover.startsWith('http') ? `${apiBase}${cover}` : cover;
      play({ url: normalizedSrc, title, artist, cover: normalizedCover });
    }
  };

  const currentProgress = isCurrent ? progress : 0;
  const currentDuration = isCurrent ? duration : 0;

  return (
    <NodeViewWrapper
      className={`my-5 rounded-3xl border ${palette.border} ${palette.bg} shadow-soft overflow-hidden ${selected ? 'ring-2 ring-black/10' : ''}`}
      data-drag-handle
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-5">
          {/* Vinyl */}
          <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0 cursor-pointer" onClick={handleToggle}>
            <div className="absolute inset-0 rounded-full bg-black/80 shadow-[0_12px_30px_rgba(0,0,0,0.2)]" />
            <motion.div
              animate={isActive ? { rotate: 360 } : { rotate: 0 }}
              transition={isActive ? { duration: 3, ease: 'linear', repeat: Infinity } : { duration: 0 }}
              className="absolute inset-2 rounded-full overflow-hidden"
              style={{
                backgroundImage: cover ? `url(${cover})` : 'linear-gradient(45deg, #f3ec78, #af4261)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_45%,rgba(0,0,0,0.65)_100%)]" />
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage:
                  'repeating-radial-gradient(circle at center, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(0,0,0,0) 5px, rgba(0,0,0,0) 8px)',
              }} />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-[#F6F3EF] border border-black/10 flex items-center justify-center">
                 {isActive ? <Pause size={10} className="text-black" /> : <Play size={10} className="ml-0.5 text-black" />}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className={`text-base md:text-lg font-black tracking-tight ${palette.text} truncate`}>{title}</div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors text-black/40"
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            <div className={`mt-0.5 text-sm font-semibold ${palette.subtle} truncate flex items-center gap-1.5`}>
              <Music size={12} /> {artist}
            </div>

            {/* Simple Player Progress (Always shown in block) */}
            <div className="mt-4">
               <div 
                className={`relative h-1.5 rounded-full bg-black/5 cursor-pointer overflow-hidden`}
                onClick={(e) => {
                  if (!isCurrent) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const ratio = Math.min(1, Math.max(0, x / rect.width));
                  setProgress(ratio);
                }}
              >
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-black/60" 
                  initial={false}
                  animate={{ width: `${currentProgress * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-bold text-black/30 tabular-nums uppercase tracking-wider">
                <span>{isCurrent ? formatTime(currentProgress * currentDuration) : '0:00'}</span>
                <span>{isCurrent ? formatTime(currentDuration) : '0:00'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel (Expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-black/5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 text-[10px] font-black text-black/20 tracking-[0.2em] uppercase mb-1">播放器设置</div>
                
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-black/5 bg-white/40 hover:bg-white hover:shadow-sm transition-all text-xs font-bold flex items-center gap-2"
                  onClick={() => {
                    const v = window.prompt('音频直链 URL：', src);
                    if (v !== null) updateAttributes({ src: v.trim() });
                  }}
                >
                  <Link2 size={14} className="text-black/40" /> 设置音频直链
                </button>

                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-black/5 bg-white/40 hover:bg-white hover:shadow-sm transition-all text-xs font-bold flex items-center gap-2"
                  onClick={() => {
                    const v = window.prompt('封面图片 URL：', cover);
                    if (v !== null) updateAttributes({ cover: v.trim() });
                  }}
                >
                  <Link2 size={14} className="text-black/40" /> 设置封面
                </button>

                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-black/5 bg-white/40 hover:bg-white hover:shadow-sm transition-all text-xs font-bold flex items-center gap-2"
                  onClick={() => {
                    const v = window.prompt('歌曲名：', title);
                    if (v !== null) updateAttributes({ title: v.trim() || '未命名歌曲' });
                  }}
                >
                  <Link2 size={14} className="text-black/40" /> 设置歌曲名
                </button>

                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-black/5 bg-white/40 hover:bg-white hover:shadow-sm transition-all text-xs font-bold flex items-center gap-2"
                  onClick={() => {
                    const v = window.prompt('艺术家：', artist);
                    if (v !== null) updateAttributes({ artist: v.trim() || '未知艺术家' });
                  }}
                >
                  <Link2 size={14} className="text-black/40" /> 设置艺术家
                </button>

                {isEditable && (
                  <label className="md:col-span-2 px-4 py-2.5 rounded-xl border border-black/5 bg-white/40 text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                    <Upload size={14} className="text-black/40" /> 上传音频文件（本地）
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = URL.createObjectURL(f);
                        updateAttributes({ src: url, title: f.name.replace(/\.[^/.]+$/, "") });
                      }}
                    />
                  </label>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeViewWrapper>
  );
};
