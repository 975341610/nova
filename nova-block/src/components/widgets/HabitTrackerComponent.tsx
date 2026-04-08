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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Settings2,
  Trash2,
  Plus,
  Camera,
  Wallpaper,
  Trophy,
  CalendarDays,
  PenTool,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabit } from '../../contexts/HabitContext';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const uploadFileToLocal = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.url || data.path || '';
};

// 复古印章效果
const Stamp = ({ color }: { color: string }) => (
  <motion.div
    initial={{ scale: 2, opacity: 0, rotate: -20 }}
    animate={{ scale: 1, opacity: 0.7, rotate: Math.random() * 20 - 10 }}
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
  >
    <div 
      className="w-8 h-8 rounded-full border-[3px] flex items-center justify-center font-serif font-bold text-[10px] tracking-tighter"
      style={{ 
        borderColor: color, 
        color: color,
        boxShadow: `inset 0 0 4px ${color}44`,
        filter: 'contrast(1.2) brightness(0.9) blur(0.2px)',
        background: `radial-gradient(circle, ${color}11 10%, transparent 80%)`
      }}
    >
      <div className="border border-current rounded-full w-6 h-6 flex items-center justify-center">
        DONE
      </div>
    </div>
  </motion.div>
);

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
  themeColor,
}: any) => {
  const isCompleted = val >= target;
  
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={(e) => isCurrMonth && isEditable && onLeftClick(dateStr, e)}
      onContextMenu={(e) => { e.preventDefault(); isCurrMonth && isEditable && onRightClick(dateStr, e); }}
      className={`relative aspect-[1/1.1] flex flex-col items-center justify-between p-1 transition-all border-b border-r border-stone-100 ${!isCurrMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-stone-50/50'}`}
    >
      <span className={`text-[10px] font-serif ${today ? 'text-blue-600 font-bold' : 'text-stone-400'}`}>
        {dayNumber}
      </span>
      
      <div className="flex-1 flex items-center justify-center w-full relative">
        <div className={`transition-all duration-500 ${isCompleted ? 'opacity-20 grayscale scale-75' : 'opacity-40 grayscale-[0.5]'}`}>
           <HabitIcon icon={icon} className="w-5 h-5 object-contain" />
        </div>
        {isCompleted && <Stamp color={themeColor || '#b91c1c'} />}
      </div>

      {target > 1 && (
        <div className="w-full bg-stone-100 h-[2px] rounded-full overflow-hidden mt-1">
          <motion.div 
            className="h-full" 
            style={{ backgroundColor: themeColor }}
            animate={{ width: `${(val / target) * 100}%` }}
          />
        </div>
      )}
    </motion.button>
  );
});

HabitCell.displayName = 'HabitCell';

export const HabitTrackerComponent: React.FC<any> = (props) => {
  const { selected, editor } = props;
  const isEditable = editor?.isEditable;
  const { habits, logs, activeHabitId, setActiveHabitId, logCheckIn, getStreak, updateHabit, addHabit, deleteHabit } = useHabit();
  const [cursor, setCursor] = useState(() => new Date());
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const streak = activeHabit ? getStreak(activeHabit.id) : 0;

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const list = eachDayOfInterval({ start, end });
    const firstDow = Number(format(start, 'i')) % 7; // 0 (Sun) to 6 (Sat)
    return [...Array(firstDow).fill(null), ...list];
  }, [cursor]);

  const logsMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (activeHabit) {
      logs.filter(l => l.habitId === activeHabit.id).forEach(l => map[l.date] = l.value);
    }
    return map;
  }, [logs, activeHabit?.id]);

  const handleAction = useCallback((dateStr: string, isRight: boolean, e: any) => {
    if (!activeHabit || !isEditable) return;
    const cur = logsMap[dateStr] || 0;
    const next = isRight ? Math.max(0, cur - 1) : Math.min(activeHabit.targetValue, cur + 1);
    if (next === cur) return;
    logCheckIn(activeHabit.id, dateStr, next);
    if (!isRight && next === activeHabit.targetValue && cur < activeHabit.targetValue) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: [activeHabit.color, '#F6F3EF'] });
    }
  }, [activeHabit, isEditable, logCheckIn, logsMap]);

  return (
    <NodeViewWrapper className={`my-12 group font-serif ${selected ? 'ring-1 ring-stone-200' : ''}`}>
      <div className="max-w-4xl mx-auto bg-[#FDFCFB] border border-stone-200 shadow-xl flex flex-col md:flex-row min-h-[480px] overflow-hidden rounded-sm relative">
        {/* 淡淡的点阵底纹 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Left Side: Habit Info & Stats (杂志风左栏) */}
        <div className="w-full md:w-72 bg-[#F6F3EF]/50 border-r border-stone-100 p-8 flex flex-col relative z-10">
          <div className="mb-10">
            <span className="text-[10px] tracking-[0.2em] text-stone-400 uppercase font-bold block mb-2">Selected Habit</span>
            <div className="relative group/select">
              <select
                value={activeHabitId || ''}
                onChange={(e) => setActiveHabitId(e.target.value)}
                className="w-full bg-transparent border-b border-stone-200 py-2 text-xl font-serif focus:outline-none appearance-none cursor-pointer"
              >
                {habits.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 space-y-12">
            <div>
              <div className="w-16 h-16 bg-white border border-stone-100 shadow-sm rounded-full flex items-center justify-center text-3xl mb-4 grayscale-[0.2]">
                <HabitIcon icon={activeHabit?.icon} />
              </div>
              <h2 className="text-2xl font-serif text-stone-800 leading-tight">{activeHabit?.name || 'Untitled'}</h2>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed italic">"Keep going, even on the quiet days."</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/40 border border-stone-100 rounded-sm">
                <Flame size={14} className="text-orange-400 mb-2" />
                <div className="text-xl font-bold tabular-nums">{streak}</div>
                <div className="text-[9px] text-stone-400 uppercase tracking-widest">Streak</div>
              </div>
              <div className="p-4 bg-white/40 border border-stone-100 rounded-sm">
                <Trophy size={14} className="text-yellow-500 mb-2" />
                <div className="text-xl font-bold tabular-nums">{Math.round((Object.values(logsMap).filter(v => v >= (activeHabit?.targetValue||1)).length / 30) * 100)}%</div>
                <div className="text-[9px] text-stone-400 uppercase tracking-widest">Monthly</div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsSettingOpen(!isSettingOpen)}
            className="mt-8 flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs border-t border-stone-100 pt-4"
          >
            <Settings2 size={14} />
            <span>Customize Palette</span>
          </button>
        </div>

        {/* Right Side: Calendar Grid (手账格) */}
        <div className="flex-1 p-8 relative z-10 flex flex-col">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <h3 className="text-lg font-serif text-stone-700 uppercase tracking-widest">
                {format(cursor, 'MMMM')} <span className="text-stone-300 ml-1">{format(cursor, 'yyyy')}</span>
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setCursor(subMonths(cursor, 1))} className="p-1 hover:bg-stone-100 rounded text-stone-400 transition-colors"><ChevronLeft size={16}/></button>
                <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-1 hover:bg-stone-100 rounded text-stone-400 transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-[10px] text-stone-300 uppercase tracking-widest font-bold flex items-center gap-1">
                 <CalendarDays size={12} /> Journal Entry
               </span>
            </div>
          </header>

          <div className="flex-1 border-l border-t border-stone-100">
            <div className="grid grid-cols-7 border-b border-stone-100">
              {weekDays.map(d => (
                <div key={d} className="py-2 text-[10px] text-center font-bold text-stone-300 uppercase tracking-widest border-r border-stone-100">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 relative">
              {days.map((date, i) => {
                if (!date) return <div key={`e-${i}`} className="aspect-[1/1.1] border-r border-b border-stone-50/50" />;
                const dateStr = format(date, 'yyyy-MM-dd');
                return (
                  <HabitCell
                    key={dateStr}
                    dateStr={dateStr}
                    dayNumber={format(date, 'd')}
                    val={logsMap[dateStr] || 0}
                    target={activeHabit?.targetValue || 1}
                    icon={activeHabit?.icon}
                    isToday={isToday(date)}
                    isCurrMonth={isSameMonth(date, cursor)}
                    isEditable={isEditable}
                    onLeftClick={(d:any, e:any) => handleAction(d, false, e)}
                    onRightClick={(d:any, e:any) => handleAction(d, true, e)}
                    themeColor={activeHabit?.color}
                  />
                );
              })}
            </div>
          </div>
          
          <footer className="mt-6 flex justify-between items-center text-[10px] text-stone-300 italic">
            <span>"Every small step counts towards the horizon."</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeHabit?.color }} />
              <span className="uppercase tracking-widest not-italic font-bold">{activeHabit?.name} Focus</span>
            </div>
          </footer>
        </div>

        {/* Settings Panel Overlay */}
        <AnimatePresence>
          {isSettingOpen && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl z-[100] p-8 border-l border-stone-100 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-serif text-lg text-stone-800">Habit Settings</h4>
                <button onClick={() => setIsSettingOpen(false)} className="text-stone-400 hover:text-stone-600"><Plus size={20} className="rotate-45" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                {habits.map(h => (
                  <div key={h.id} className="p-4 bg-[#FDFCFB] border border-stone-100 rounded-sm space-y-4 group">
                    <div className="flex items-center justify-between">
                       <input 
                         value={h.name} 
                         onChange={(e) => updateHabit(h.id, { name: e.target.value })}
                         className="bg-transparent border-none font-serif text-sm focus:outline-none w-32"
                       />
                       <button onClick={() => deleteHabit(h.id)} className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white border border-stone-100 rounded flex items-center justify-center text-xl">
                         <HabitIcon icon={h.icon} />
                       </div>
                       <input 
                         value={isImageIcon(h.icon) ? '' : h.icon}
                         onChange={(e) => updateHabit(h.id, { icon: e.target.value })}
                         placeholder="Icon"
                         className="w-10 h-10 bg-white border border-stone-100 rounded text-center focus:outline-none text-sm"
                       />
                       <label className="p-2 bg-stone-50 border border-stone-100 rounded cursor-pointer hover:bg-stone-100 transition-colors">
                          <Camera size={14} className="text-stone-400" />
                          <input type="file" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if(f) updateHabit(h.id, { icon: await uploadFileToLocal(f) });
                          }} />
                       </label>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="flex-1">
                         <div className="text-[9px] text-stone-300 uppercase mb-1">Target</div>
                         <input 
                           type="number" 
                           value={h.targetValue} 
                           onChange={(e) => updateHabit(h.id, { targetValue: parseInt(e.target.value) || 1 })}
                           className="w-full bg-white border border-stone-100 rounded p-1 text-xs focus:outline-none"
                         />
                       </div>
                       <div>
                         <div className="text-[9px] text-stone-300 uppercase mb-1">Ink</div>
                         <input 
                           type="color" 
                           value={h.color} 
                           onChange={(e) => updateHabit(h.id, { color: e.target.value })}
                           className="w-8 h-8 border-none p-0 bg-transparent cursor-pointer"
                         />
                       </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => addHabit({ name: 'New Habit', icon: '📝', color: '#b8c6db', targetValue: 1 })}
                  className="w-full py-3 border border-dashed border-stone-200 text-stone-400 text-xs hover:border-stone-400 hover:text-stone-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add New Entry
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 text-[10px] text-stone-400 flex items-center gap-2">
                <PenTool size={12} />
                <span>Journal Edition v0.06 - Hobonichi</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeViewWrapper>
  );
};
