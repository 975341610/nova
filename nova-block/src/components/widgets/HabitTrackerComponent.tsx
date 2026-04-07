import React, { useMemo, useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Crown, Plus, Settings2, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabit } from '../../contexts/HabitContext';
import { api, getApiBase } from '../../lib/api';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

const isImageSrc = (value?: string) => {
  if (!value) return false;
  return (
    value.startsWith('data:image') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('/api/media/')
  );
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const toAbsoluteMediaUrl = (maybeRelativeUrl: string) => {
  if (!maybeRelativeUrl) return maybeRelativeUrl;
  if (maybeRelativeUrl.startsWith('http://') || maybeRelativeUrl.startsWith('https://')) return maybeRelativeUrl;
  // getApiBase() 形如 http://127.0.0.1:8765/api 或 https://8765-xxx/ api
  const apiBase = getApiBase();
  const origin = apiBase.replace(/\/api\/?$/, '');
  const path = maybeRelativeUrl.startsWith('/') ? maybeRelativeUrl : `/${maybeRelativeUrl}`;
  return `${origin}${path}`;
};

const HabitIcon: React.FC<{ icon?: string; className?: string; imgClassName?: string }> = ({
  icon,
  className,
  imgClassName,
}) => {
  if (!icon) return null;
  if (isImageSrc(icon)) {
    return <img src={icon} alt="" className={imgClassName || className || 'w-7 h-7 object-contain'} />;
  }
  return <span className={className}>{icon}</span>;
};

type HabitCellProps = {
  date: Date;
  val: number;
  target: number;
  icon?: string;
  isEditable: boolean;
  onCellClick: (date: Date, event: React.MouseEvent, isRightClick?: boolean) => void;
};

const HabitCell = React.memo<HabitCellProps>(
  ({ date, val, target, icon, isEditable, onCellClick }) => {
    const percent = Math.min(val / Math.max(target, 1), 1);
    const isCompleted = val >= target;
    const today = isToday(date);

    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => onCellClick(date, e)}
        onContextMenu={(e) => {
          e.preventDefault();
          onCellClick(date, e, true);
        }}
        disabled={!isEditable}
        className={
          `relative aspect-square border-2 border-stone-800 flex items-center justify-center transition-all ` +
          `${today ? 'bg-stone-100' : ''} ` +
          `${isCompleted ? 'bg-[#fefce8]' : 'bg-white'}`
        }
        style={{
          borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px',
          boxShadow: val > 0 ? '2px 2px 0px 0px rgba(28,25,23,1)' : '1px 1px 0px 0px rgba(28,25,23,0.2)',
        }}
      >
        {/* Base Icon (Shadow/Outline) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 grayscale pointer-events-none select-none">
          {isImageSrc(icon) ? (
            <HabitIcon icon={icon} imgClassName="w-6 h-6 object-contain" />
          ) : (
            <HabitIcon icon={icon} className="text-2xl" />
          )}
        </div>

        {/* Active Icon (Progressive Clip) */}
        {val > 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{
              clipPath: `inset(calc(100% - ${percent * 100}%) 0 0 0)`,
            }}
            animate={
              isCompleted
                ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0],
                  }
                : {}
            }
            transition={{ duration: 0.4, type: 'spring' }}
          >
            {isImageSrc(icon) ? (
              <HabitIcon icon={icon} imgClassName="w-6 h-6 object-contain" />
            ) : (
              <HabitIcon icon={icon} className="text-2xl" />
            )}
          </motion.div>
        )}

        {/* Date Number */}
        <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${today ? 'text-primary' : 'text-stone-400'}`}>
          {format(date, 'd')}
        </span>

        {/* Progress Numbers */}
        {target > 1 && (
          <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-stone-500 italic">
            {val}/{target}
          </span>
        )}
      </motion.button>
    );
  },
  (prev, next) =>
    prev.date === next.date &&
    prev.val === next.val &&
    prev.target === next.target &&
    prev.icon === next.icon &&
    prev.isEditable === next.isEditable
);

export const HabitTrackerComponent: React.FC<any> = (props) => {
  const { selected, editor } = props;
  const isEditable = editor?.isEditable;

  const {
    habits,
    logs,
    activeHabitId,
    setActiveHabitId,
    logCheckIn,
    getStreak,
    addHabit,
    deleteHabit,
    updateHabit,
  } = useHabit();

  const [cursor, setCursor] = useState(() => new Date());
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const uploadHintTimerRef = useRef<number | null>(null);
  const showUploadHint = useCallback((msg: string) => {
    setUploadHint(msg);
    if (uploadHintTimerRef.current) window.clearTimeout(uploadHintTimerRef.current);
    uploadHintTimerRef.current = window.setTimeout(() => setUploadHint(null), 3500);
  }, []);

  const activeHabit = useMemo(() => habits.find((h) => h.id === activeHabitId) || habits[0], [habits, activeHabitId]);
  const streak = activeHabit ? getStreak(activeHabit.id) : 0;

  const handDrawnStyle = {
    fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Caveat', cursive",
    borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
  };

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const list = eachDayOfInterval({ start, end });
    const firstDow = Number(format(start, 'i')); // 1 (Mon) to 7 (Sun)
    const pad = firstDow - 1;
    const padded: (Date | null)[] = [...Array.from({ length: pad }, () => null), ...list];
    const tail = (7 - (padded.length % 7)) % 7;
    return [...padded, ...Array.from({ length: tail }, () => null)];
  }, [cursor]);

  const activeLogMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeHabit) return map;
    for (const l of logs) {
      if (l.habitId === activeHabit.id) map.set(l.date, l.value);
    }
    return map;
  }, [logs, activeHabit?.id]);

  const handleCellClick = useCallback(
    (date: Date, event: React.MouseEvent, isRightClick = false) => {
      if (!activeHabit || !isEditable) return;

      const dateStr = format(date, 'yyyy-MM-dd');
      const currentValue = activeLogMap.get(dateStr) ?? 0;

      let newValue: number;
      if (isRightClick) {
        newValue = Math.max(0, currentValue - 1);
      } else {
        newValue = Math.min(activeHabit.targetValue, currentValue + 1);
      }

      if (newValue === currentValue) return;

      logCheckIn(activeHabit.id, dateStr, newValue);

      // Trigger confetti if completed and was not completed before
      if (!isRightClick && newValue === activeHabit.targetValue && currentValue < activeHabit.targetValue) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        confetti({
          particleCount: 40,
          spread: 60,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          },
          colors: [activeHabit.color, '#ffffff', '#ffcc00'],
          ticks: 200,
          gravity: 1.2,
          scalar: 0.7,
        });
      }
    },
    [activeHabit, isEditable, activeLogMap, logCheckIn]
  );

  const handleHabitMediaUpload = useCallback(
    async (habitId: string, field: 'icon' | 'backgroundUrl', file: File) => {
      if (!isEditable) return;

      const label = field === 'backgroundUrl' ? '背景' : '图标';
      showUploadHint(`正在上传${label}...`);

      // 1) 优先调用后端 /api/media/upload（api.upload 内部使用 ${API_BASE}/media/upload）
      try {
        const results = (await api.upload([file])) as Array<{ url: string }>;
        const uploadedUrl = results?.[0]?.url;
        if (!uploadedUrl) throw new Error('Upload response missing url');
        const absUrl = toAbsoluteMediaUrl(uploadedUrl);
        updateHabit(habitId, { [field]: absUrl } as any);
        showUploadHint(`✅ ${label}已保存到本地媒体文件夹`);
        return;
      } catch (e) {
        console.warn(`[habit] media upload failed, fallback to base64 localStorage. field=${field}`, e);
      }

      // 2) Fallback：转 Base64 存 localStorage（无法落盘到本地文件夹）
      try {
        const dataUrl = await fileToDataUrl(file);
        updateHabit(habitId, { [field]: dataUrl } as any);
        showUploadHint(`⚠️ ${label}上传失败，已回退为 Base64 存储到 localStorage（非本地文件夹）`);
      } catch (e) {
        console.error('[habit] fileToDataUrl failed', e);
        showUploadHint(`❌ ${label}处理失败，请重试`);
      }
    },
    [isEditable, showUploadHint, updateHabit]
  );

  const apiBaseForDebug = useMemo(() => {
    try {
      return getApiBase();
    } catch {
      return '';
    }
  }, []);

  return (
    <NodeViewWrapper className={`my-8 group relative ${selected ? 'ring-2 ring-primary/20 rounded-[2rem]' : ''}`}>
      <div className="max-w-md mx-auto" style={{ fontFamily: handDrawnStyle.fontFamily }}>
        {/* Main Card */}
        <div
          className="relative overflow-hidden border-2 border-stone-800 shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] p-6 transition-all duration-500 hover:shadow-[6px_6px_0px_0px_rgba(28,25,23,1)]"
          style={{ borderRadius: handDrawnStyle.borderRadius }}
        >
          {/* Paper base + optional background */}
          <div className="absolute inset-0 bg-[#fcf9f2]" />
          {activeHabit?.backgroundUrl && (
            <img
              src={activeHabit.backgroundUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none select-none"
            />
          )}

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 flex items-center justify-center border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: (activeHabit?.color || '#a8ebd1') + '22',
                    borderRadius: '155px 15px 125px 15px/15px 125px 15px 155px',
                  }}
                >
                  {isImageSrc(activeHabit?.icon) ? (
                    <HabitIcon icon={activeHabit?.icon} imgClassName="w-7 h-7 object-contain" />
                  ) : (
                    <HabitIcon icon={activeHabit?.icon || '📅'} className="text-2xl" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1 group/select relative">
                    <select
                      value={activeHabitId || ''}
                      onChange={(e) => setActiveHabitId(e.target.value)}
                      className="bg-transparent border-none font-bold text-lg focus:ring-0 cursor-pointer p-0 pr-6 appearance-none outline-none z-10"
                    >
                      {habits.map((h) => (
                        <option key={h.id} value={h.id} className="bg-[#fcf9f2] text-sm">
                          {h.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="text-stone-800 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover/select:text-primary transition-colors"
                    />
                  </div>
                  <div className="text-xs text-stone-600 font-bold tracking-wider uppercase">{format(cursor, 'MMMM yyyy')}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fefce8] border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]"
                  style={{ borderRadius: '12px 4px 12px 4px/4px 12px 4px 12px' }}
                >
                  {streak >= 10 ? <Crown size={14} className="text-stone-800" /> : <Flame size={14} className="text-stone-800" />}
                  <span className="text-sm font-bold tabular-nums">{streak}</span>
                </div>
                <button
                  onClick={() => setIsSettingOpen(!isSettingOpen)}
                  className="p-2 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(28,25,23,1)]"
                  style={{ borderRadius: '8px 4px 8px 4px/4px 8px 4px 8px' }}
                >
                  <Settings2 size={18} className="text-stone-800" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex gap-2">
                <button
                  onClick={() => setCursor(subMonths(cursor, 1))}
                  className="p-1.5 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(28,25,23,1)]"
                  style={{ borderRadius: '6px 2px 6px 2px/2px 6px 2px 6px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCursor(addMonths(cursor, 1))}
                  className="p-1.5 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(28,25,23,1)]"
                  style={{ borderRadius: '6px 2px 6px 2px/2px 6px 2px 6px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={() => setCursor(new Date())}
                className="text-[10px] font-bold text-stone-800 border-b-2 border-stone-800 hover:text-primary transition-colors uppercase tracking-tighter"
              >
                Today
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div key={d} className="text-[10px] font-bold text-stone-600 text-center pb-2 uppercase">
                  {d}
                </div>
              ))}

              {days.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="aspect-square" />;

                const dateStr = format(date, 'yyyy-MM-dd');
                const val = activeLogMap.get(dateStr) ?? 0;
                const target = activeHabit?.targetValue || 1;

                return (
                  <HabitCell
                    key={dateStr}
                    date={date}
                    val={val}
                    target={target}
                    icon={activeHabit?.icon}
                    isEditable={!!isEditable}
                    onCellClick={handleCellClick}
                  />
                );
              })}
            </div>

            {/* Quick Settings Panel */}
            <AnimatePresence>
              {isSettingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-6 pt-4 border-t-2 border-stone-800"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase italic">Edit Habits</span>
                      <button
                        onClick={() => addHabit({ name: '新习惯', icon: '✨', color: '#b8c6db', targetValue: 1, backgroundUrl: '' })}
                        className="p-1 bg-stone-100 border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] hover:bg-white transition-all active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                        style={{ borderRadius: '4px' }}
                      >
                        <Plus size={14} className="text-stone-800" />
                      </button>
                    </div>

                    {uploadHint && (
                      <div className="text-[10px] font-bold text-stone-700 bg-white/70 border-2 border-stone-800 px-2 py-1"
                        style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                      >
                        {uploadHint}
                        {uploadHint.includes('Base64') && apiBaseForDebug ? (
                          <span className="ml-1 text-stone-500 font-normal">（API_BASE: {apiBaseForDebug}）</span>
                        ) : null}
                      </div>
                    )}

                    <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                      {habits.map((h) => (
                        <div
                          key={h.id}
                          className="p-2 bg-white border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]"
                          style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                        >
                          <div className="flex items-center gap-2">
                            {isImageSrc(h.icon) ? (
                              <div
                                className="w-8 h-8 flex-shrink-0 bg-stone-50 border-2 border-stone-800 flex items-center justify-center"
                                style={{ borderRadius: '4px' }}
                                title="已使用图片图标"
                              >
                                <HabitIcon icon={h.icon} imgClassName="w-6 h-6 object-contain" />
                              </div>
                            ) : (
                              <input
                                value={h.icon}
                                onChange={(e) => updateHabit(h.id, { icon: e.target.value })}
                                className="w-8 h-8 flex-shrink-0 bg-stone-50 border-2 border-stone-800 text-center p-0 text-sm focus:ring-0 outline-none"
                                style={{ borderRadius: '4px' }}
                                title="Emoji 图标（也可上传图片图标）"
                                disabled={!isEditable}
                              />
                            )}

                            <input
                              value={h.name}
                              onChange={(e) => updateHabit(h.id, { name: e.target.value })}
                              className="flex-grow bg-transparent border-none text-sm font-bold p-0 focus:ring-0 outline-none min-w-0"
                              disabled={!isEditable}
                            />

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={h.targetValue}
                                onChange={(e) => updateHabit(h.id, { targetValue: parseInt(e.target.value) || 1 })}
                                className="w-10 bg-stone-50 border-2 border-stone-800 text-[10px] font-bold text-center p-1 focus:ring-0 outline-none"
                                style={{ borderRadius: '4px' }}
                                disabled={!isEditable}
                              />
                              <input
                                type="color"
                                value={h.color}
                                onChange={(e) => updateHabit(h.id, { color: e.target.value })}
                                className="w-5 h-5 border-2 border-stone-800 p-0 bg-transparent cursor-pointer overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                                style={{ borderRadius: '50%' }}
                                disabled={!isEditable}
                              />
                              <button
                                onClick={() => deleteHabit(h.id)}
                                className="p-1 opacity-100 text-stone-400 hover:text-red-500 transition-all"
                                disabled={!isEditable}
                                title="删除习惯"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Upload actions */}
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              id={`habit-icon-upload-${h.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) handleHabitMediaUpload(h.id, 'icon', file);
                              }}
                              disabled={!isEditable}
                            />
                            <label
                              htmlFor={`habit-icon-upload-${h.id}`}
                              className={`text-[10px] font-bold border-2 border-stone-800 px-2 py-1 bg-white hover:bg-stone-50 transition-all ${
                                isEditable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                              }`}
                              style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                              title="上传图片作为打卡图标"
                            >
                              ⬆️ 上传图标
                            </label>

                            <input
                              id={`habit-bg-upload-${h.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) handleHabitMediaUpload(h.id, 'backgroundUrl', file);
                              }}
                              disabled={!isEditable}
                            />
                            <label
                              htmlFor={`habit-bg-upload-${h.id}`}
                              className={`text-[10px] font-bold border-2 border-stone-800 px-2 py-1 bg-[#fefce8] hover:bg-white transition-all ${
                                isEditable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                              }`}
                              style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                              title="更换当前习惯的日历背景"
                            >
                              🖼️ 更换背景
                            </label>

                            {h.backgroundUrl ? (
                              <button
                                onClick={() => updateHabit(h.id, { backgroundUrl: '' })}
                                className="text-[10px] font-bold text-stone-600 hover:text-red-500 transition-colors"
                                disabled={!isEditable}
                                title="清除背景"
                              >
                                清除
                              </button>
                            ) : (
                              <span className="text-[10px] text-stone-400">未设置背景</span>
                            )}

                            {isImageSrc(h.icon) && (
                              <button
                                onClick={() => updateHabit(h.id, { icon: '✨' })}
                                className="text-[10px] font-bold text-stone-600 hover:text-red-500 transition-colors"
                                disabled={!isEditable}
                                title="清除图片图标（恢复为 Emoji）"
                              >
                                清除图标
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
