import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  startOfToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Crown, Plus, Settings2, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useHabit } from '../../contexts/HabitContext';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

export const HabitTrackerComponent: React.FC<any> = (props) => {
  const { node, updateAttributes, selected, editor } = props;
  const isEditable = editor?.isEditable;
  
  const { 
    habits, 
    activeHabitId, 
    setActiveHabitId, 
    logCheckIn, 
    getLogForDate, 
    getStreak,
    addHabit,
    deleteHabit,
    updateHabit
  } = useHabit();

  const [cursor, setCursor] = useState(() => new Date());
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const activeHabit = habits.find(h => h.id === activeHabitId) || habits[0];
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

  const handleCellClick = (date: Date, event: React.MouseEvent, isRightClick = false) => {
    if (!activeHabit || !isEditable) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = getLogForDate(activeHabit.id, dateStr);
    const currentValue = existingLog ? existingLog.value : 0;
    
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
          y: (rect.top + rect.height / 2) / window.innerHeight 
        },
        colors: [activeHabit.color, '#ffffff', '#ffcc00'],
        ticks: 200,
        gravity: 1.2,
        scalar: 0.7,
      });
    }
  };

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
                className="w-12 h-12 flex items-center justify-center text-2xl border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                style={{ 
                  backgroundColor: activeHabit?.color + '22',
                  borderRadius: '155px 15px 125px 15px/15px 125px 15px 155px'
                }}
              >
                {activeHabit?.icon || '📅'}
              </div>
              <div>
                <div className="flex items-center gap-1 group/select relative">
                   <select 
                    value={activeHabitId || ''} 
                    onChange={(e) => setActiveHabitId(e.target.value)}
                    className="bg-transparent border-none font-bold text-lg focus:ring-0 cursor-pointer p-0 pr-6 appearance-none outline-none z-10"
                  >
                    {habits.map(h => (
                      <option key={h.id} value={h.id} className="bg-[#fcf9f2] text-sm">{h.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-stone-800 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover/select:text-primary transition-colors" />
                </div>
                <div className="text-xs text-stone-600 font-bold tracking-wider uppercase">
                  {format(cursor, 'MMMM yyyy')}
                </div>
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
                 <ChevronLeft size={16}/>
               </button>
               <button 
                onClick={() => setCursor(addMonths(cursor, 1))} 
                className="p-1.5 border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] bg-white hover:bg-stone-50 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(28,25,23,1)]"
                style={{ borderRadius: '6px 2px 6px 2px/2px 6px 2px 6px' }}
               >
                 <ChevronRight size={16}/>
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
            {weekDays.map(d => (
              <div key={d} className="text-[10px] font-bold text-stone-600 text-center pb-2 uppercase">{d}</div>
            ))}
            
            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
              
              const dateStr = format(date, 'yyyy-MM-dd');
              const isCurrMonth = isSameMonth(date, cursor);
              const log = getLogForDate(activeHabit?.id || '', dateStr);
              const val = log ? log.value : 0;
              const target = activeHabit?.targetValue || 1;
              const percent = Math.min(val / target, 1);
              const isCompleted = val >= target;
              const today = isToday(date);

              return (
                <motion.button
                  key={dateStr}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => isCurrMonth && handleCellClick(date, e)}
                  onContextMenu={(e) => { e.preventDefault(); isCurrMonth && handleCellClick(date, e, true); }}
                  disabled={!isCurrMonth || !isEditable}
                  className={`
                    relative aspect-square border-2 border-stone-800 flex items-center justify-center transition-all
                    ${isCurrMonth ? 'cursor-pointer' : 'opacity-0 pointer-events-none'}
                    ${today ? 'bg-stone-100' : ''}
                    ${isCompleted ? 'bg-[#fefce8]' : 'bg-white'}
                  `}
                  style={{
                    borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px',
                    boxShadow: val > 0 ? '2px 2px 0px 0px rgba(28,25,23,1)' : '1px 1px 0px 0px rgba(28,25,23,0.2)',
                  }}
                >
                  {/* Base Emoji (Shadow/Outline) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 grayscale pointer-events-none select-none text-2xl">
                    {activeHabit?.icon}
                  </div>

                  {/* Active Emoji (Progressive Clip) */}
                  {val > 0 && (
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none select-none"
                      style={{
                        clipPath: `inset(calc(100% - ${percent * 100}%) 0 0 0)`
                      }}
                      animate={isCompleted ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 0.4, type: 'spring' }}
                    >
                      {activeHabit?.icon}
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
                        onClick={() => addHabit({ name: '新习惯', icon: '✨', color: '#b8c6db', targetValue: 1 })}
                        className="p-1 bg-stone-100 border-2 border-stone-800 shadow-[1px_1px_0px_0px_rgba(28,25,23,1)] hover:bg-white transition-all active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                        style={{ borderRadius: '4px' }}
                     >
                       <Plus size={14} className="text-stone-800" />
                     </button>
                   </div>
                   <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                      {habits.map(h => (
                        <div 
                          key={h.id} 
                          className="flex items-center gap-2 p-2 bg-white border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] group/item"
                          style={{ borderRadius: '8px 2px 8px 2px/2px 8px 2px 8px' }}
                        >
                          <input 
                            value={h.icon} 
                            onChange={(e) => updateHabit(h.id, { icon: e.target.value })}
                            className="w-8 h-8 flex-shrink-0 bg-stone-50 border-2 border-stone-800 text-center p-0 text-sm focus:ring-0 outline-none"
                            style={{ borderRadius: '4px' }}
                          />
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
                            >
                              <Trash2 size={14} />
                            </button>
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
    </NodeViewWrapper>
  );
};
