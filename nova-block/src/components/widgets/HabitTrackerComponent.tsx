import React, { useCallback, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
  isToday,
} from 'date-fns';
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Image as ImageIcon,
  Plus,
  Settings2,
  Trash2,
  Wallpaper,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabit } from '../../contexts/HabitContext';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

const isImageIcon = (icon?: string) => {
  if (!icon) return false;
  return icon.startsWith('data:image/') || icon.startsWith('http');
};

const HabitIcon: React.FC<{ icon?: string; className?: string }> = ({ icon, className }) => {
  const value = icon || '📅';

  if (isImageIcon(value)) {
    return (
      <img
        src={value}
        className={className || 'object-contain w-full h-full'}
        draggable={false}
        alt="habit icon"
      />
    );
  }

  return <span className="leading-none">{value}</span>;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fileToCompressedDataUrl = async (file: File, maxSize = 128, quality = 0.82) => {
  const dataUrl = await fileToDataUrl(file);
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, width, height);

  // Prefer webp for smaller localStorage footprint.
  return canvas.toDataURL('image/webp', quality);
};

const uploadFileToLocal = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  // Assume the API returns { url: '/uploads/xxx.png' } or similar
  return data.url || data.path || '';
};

type HabitCellProps = {
  dateStr: string;
  dayNumber: string;
  val: number;
  target: number;
  icon: string;
  isToday: boolean;
  isCurrMonth: boolean;
  isEditable: boolean;
  onLeftClick: (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onRightClick: (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => void;
};

const HabitCell = React.memo(({
  dateStr,
  dayNumber,
  val,
  target,
  icon,
  isToday: today,
  isCurrMonth,
  isEditable,
  onLeftClick,
  onRightClick,
}: HabitCellProps) => {
  const percent = Math.min(val / target, 1);
  const isCompleted = val >= target;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        if (!isCurrMonth || !isEditable) return;
        onLeftClick(dateStr, e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isCurrMonth || !isEditable) return;
        onRightClick(dateStr, e);
      }}
      disabled={!isCurrMonth || !isEditable}
      className={
        `relative aspect-square border-2 border-stone-800 flex items-center justify-center transition-all ` +
        `${isCurrMonth ? 'cursor-pointer' : 'opacity-0 pointer-events-none'} ` +
        `${today ? 'bg-stone-100' : ''} ` +
        `${isCompleted ? 'bg-[#fefce8]' : 'bg-white'}`
      }
      style={{
        borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px',
        boxShadow:
          val > 0
            ? '2px 2px 0px 0px rgba(28,25,23,1)'
            : '1px 1px 0px 0px rgba(28,25,23,0.2)',
      }}
    >
      {/* Base Icon (Shadow/Outline) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 grayscale pointer-events-none select-none text-2xl p-1.5">
        <div className="w-full h-full flex items-center justify-center">
          <HabitIcon icon={icon} />
        </div>
      </div>

      {/* Active Icon (Progressive Clip) */}
      {val > 0 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none select-none p-1.5"
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
          <div className="w-full h-full flex items-center justify-center">
            <HabitIcon icon={icon} />
          </div>
        </motion.div>
      )}

      {/* Date Number */}
      <span
        className={`absolute top-0.5 right-1 text-[9px] font-bold ${today ? 'text-primary' : 'text-stone-400'}`}
      >
        {dayNumber}
      </span>

      {/* Progress Numbers */}
      {target > 1 && (
        <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-stone-500 italic">
          {val}/{target}
        </span>
      )}
    </motion.button>
  );
});

HabitCell.displayName = 'HabitCell';

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

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const streak = activeHabit ? getStreak(activeHabit.id) : 0;

  // Optimization B: Map 查表，O(1) 获取每天 val
  const logsMap = useMemo(() => {
    if (!activeHabit?.id) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const l of logs) {
      if (l.habitId === activeHabit.id) {
        map[l.date] = l.value;
      }
    }
    return map;
  }, [logs, activeHabit?.id]);

  // Optimization C: 回调函数保持稳定，同时可读取最新 logsMap
  const logsMapRef = useRef<Record<string, number>>({});
  logsMapRef.current = logsMap;

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

  const applyCellChange = useCallback(
    (dateStr: string, event: React.MouseEvent<HTMLButtonElement>, isRightClick: boolean) => {
      if (!activeHabit || !isEditable) return;

      const currentValue = logsMapRef.current[dateStr] || 0;

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
    [activeHabit, isEditable, logCheckIn],
  );

  const handleLeftClick = useCallback(
    (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => applyCellChange(dateStr, e, false),
    [applyCellChange],
  );

  const handleRightClick = useCallback(
    (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => applyCellChange(dateStr, e, true),
    [applyCellChange],
  );

  const handleIconFileSelected = useCallback(
    async (habitId: string, file: File) => {
      try {
        // 1. 优先尝试物理上传
        const url = await uploadFileToLocal(file);
        updateHabit(habitId, { icon: url });
      } catch (e) {
        // 2. 降级回 base64 (localStorage 存储)
        console.warn('Physical upload failed, fallback to base64:', e);
        try {
          const base64 = await fileToCompressedDataUrl(file);
          updateHabit(habitId, { icon: base64 });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    },
    [updateHabit],
  );

  const handleBgFileSelected = useCallback(
    async (habitId: string, file: File) => {
      try {
        // 1. 优先尝试物理上传
        const url = await uploadFileToLocal(file);
        updateHabit(habitId, { bgImage: url });
      } catch (e) {
        // 2. 降级回 base64 (localStorage 存储)
        console.warn('Physical upload failed, fallback to base64:', e);
        try {
          // 壁纸建议压缩得稍大一点，比如 512px，质量 0.7 左右
          const base64 = await fileToCompressedDataUrl(file, 512, 0.7);
          updateHabit(habitId, { bgImage: base64 });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    },
    [updateHabit],
  );

  const activeIcon = activeHabit?.icon || '📅';

  return (
    <NodeViewWrapper className={`my-8 group relative ${selected ? 'ring-2 ring-primary/20 rounded-[2rem]' : ''}`}>
      <div className="max-w-md mx-auto" style={{ fontFamily: handDrawnStyle.fontFamily }}>
        {/* Main Card */}
        <div
          className="relative bg-[#fcf9f2] border-2 border-stone-800 shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] p-6 transition-all duration-500 hover:shadow-[6px_6px_0px_0px_rgba(28,25,23,1)]"
          style={{ borderRadius: handDrawnStyle.borderRadius }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 flex items-center justify-center text-2xl border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] transition-transform hover:scale-110 active:scale-95 cursor-pointer overflow-hidden p-1.5"
                style={{
                  backgroundColor: activeHabit?.color + '22',
                  borderRadius: '155px 15px 125px 15px/15px 125px 15px 155px',
                }}
              >
                <div className="w-full h-full flex items-center justify-center select-none">
                  <HabitIcon icon={activeIcon} />
                </div>
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
                className="p-1.5 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]"
                style={{ borderRadius: '6px 2px 6px 2px/2px 6px 2px 6px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCursor(addMonths(cursor, 1))}
                className="p-1.5 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]"
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
          <div className="relative mt-2">
            {/* Custom Background Wallpaper */}
            {activeHabit?.bgImage && (
              <div
                className="absolute inset-0 pointer-events-none opacity-20 z-0 transition-opacity"
                style={{
                  backgroundImage: `url(${activeHabit.bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                }}
              />
            )}
            <div className="grid grid-cols-7 gap-2 relative z-10">
              {weekDays.map((d) => (
                <div key={d} className="text-[10px] font-bold text-stone-600 text-center pb-2 uppercase">
                  {d}
                </div>
              ))}

              {days.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="aspect-square" />;

                const dateStr = format(date, 'yyyy-MM-dd');
                const isCurrMonth = isSameMonth(date, cursor);
                const val = logsMap[dateStr] || 0;
                const target = activeHabit?.targetValue || 1;
                const today = isToday(date);

                return (
                  <HabitCell
                    key={dateStr}
                    dateStr={dateStr}
                    dayNumber={format(date, 'd')}
                    val={val}
                    target={target}
                    icon={activeIcon}
                    isToday={today}
                    isCurrMonth={isCurrMonth}
                    isEditable={!!isEditable}
                    onLeftClick={handleLeftClick}
                    onRightClick={handleRightClick}
                  />
                );
              })}
            </div>
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
                      onClick={() => addHabit({ name: '新习惯', icon: '✨', color: '#b8c6db', targetValue: 1 })}
                      className="p-1 bg-stone-100 border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] hover:bg-white transition-all active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                      style={{ borderRadius: '4px' }}
                    >
                      <Plus size={14} className="text-stone-800" />
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-3 pr-1 pb-2">
                    {habits.map((h) => {
                      const fileInputId = `habit-icon-upload-${h.id}`;
                      const imageMode = isImageIcon(h.icon);

                      return (
                        <div
                          key={h.id}
                          className="flex items-center gap-2 p-2 bg-white border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] group/item"
                          style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                        >
                          {/* Icon editor + upload */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div
                              className="w-10 h-10 bg-stone-50 border-2 border-stone-800 overflow-hidden p-1 flex items-center justify-center text-xl"
                              style={{ borderRadius: '4px' }}
                            >
                              <div className="w-full h-full flex items-center justify-center select-none">
                                <HabitIcon icon={h.icon} />
                              </div>
                            </div>

                            <input
                              value={imageMode ? '' : h.icon}
                              onChange={(e) => updateHabit(h.id, { icon: e.target.value })}
                              placeholder={imageMode ? '✨' : ''}
                              className="w-8 h-10 flex-shrink-0 bg-stone-50 border-2 border-stone-800 text-center p-0 text-sm focus:ring-0 outline-none"
                              style={{ borderRadius: '4px' }}
                              title={imageMode ? '当前为图片图标：如需改回 emoji，可在这里输入' : '输入 emoji 作为图标'}
                            />

                            <input
                              id={fileInputId}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                if (file) void handleIconFileSelected(h.id, file);
                                e.currentTarget.value = '';
                              }}
                            />

                            <label
                              htmlFor={fileInputId}
                              className="p-1 bg-white border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                              style={{ borderRadius: '4px' }}
                              title="上传图片作为打卡图标"
                            >
                              <Camera size={14} className="text-stone-800" />
                            </label>

                            {/* Wallpaper button */}
                            <input
                              id={`habit-bg-upload-${h.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                if (file) void handleBgFileSelected(h.id, file);
                                e.currentTarget.value = '';
                              }}
                            />
                            <label
                              htmlFor={`habit-bg-upload-${h.id}`}
                              className="p-1 bg-white border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                              style={{ borderRadius: '4px' }}
                              title="设置习惯日历背景壁纸"
                            >
                              <Wallpaper size={14} className="text-stone-800" />
                            </label>
                          </div>

                          <input
                            value={h.name}
                            onChange={(e) => updateHabit(h.id, { name: e.target.value })}
                            className="flex-grow bg-transparent border-none text-sm font-bold p-0 focus:ring-0 outline-none min-w-0"
                          />

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={h.targetValue}
                              onChange={(e) => updateHabit(h.id, { targetValue: parseInt(e.target.value) || 1 })}
                              className="w-10 bg-stone-50 border-2 border-stone-800 text-[10px] font-bold text-center p-1 focus:ring-0 outline-none"
                              style={{ borderRadius: '4px' }}
                            />
                            <input
                              type="color"
                              value={h.color}
                              onChange={(e) => updateHabit(h.id, { color: e.target.value })}
                              className="w-5 h-5 border-2 border-stone-800 p-0 bg-transparent cursor-pointer overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                              style={{ borderRadius: '50%' }}
                            />
                            <button
                              onClick={() => deleteHabit(h.id)}
                              className="p-1 opacity-100 text-stone-400 hover:text-red-500 transition-all"
                              title="删除习惯"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
