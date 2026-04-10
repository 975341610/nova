import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Image as ImageIcon, Plus, Sparkles, X, Copy, Share2 } from 'lucide-react'

// --- Types ---

interface MoodboardItem {
  id: string
  url: string
  tags: string[]
  dayIndex: number // 0-6 (Mon-Sun)
  rotation: number
  isAnalyzing?: boolean
  caption?: string
}

// --- Constants ---

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DESIGN_TERMS = [
  'Minimalism', 'Bauhaus', 'Neumorphism', 'Glassmorphism', 'Brutalism',
  'Organic Shapes', 'Swiss Style', 'Art Deco', 'Vaporwave', 'Cyberpunk',
  'Duotone', 'Grainy Gradients', 'Asymmetrical', 'Negative Space', 'Bento Grid'
]

// --- Components ---

/**
 * AI 情绪板主视图 (1:1 像素级复刻)
 */
export const MoodboardView: React.FC = () => {
  const [items, setItems] = useState<MoodboardItem[]>([])
  const [weeklyNote, setWeeklyNote] = useState('')

  // 模拟分析
  const simulateAIAnalysis = (itemId: string) => {
    setTimeout(() => {
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const shuffled = [...DESIGN_TERMS].sort(() => 0.5 - Math.random())
          const selectedTags = shuffled.slice(0, 4 + Math.floor(Math.random() * 3))
          return { ...item, tags: selectedTags, isAnalyzing: false, caption: "Captured Inspiration #" + itemId.slice(0,3) }
        }
        return item
      }))
    }, 2000)
  }

  const handleDrop = async (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const url = URL.createObjectURL(file)
      const mockId = Math.random().toString(36).substr(2, 9)
      const newItem: MoodboardItem = {
        id: mockId,
        url: url,
        tags: [],
        dayIndex,
        rotation: (Math.random() - 0.5) * 15,
        isAnalyzing: true
      }
      setItems(prev => [...prev, newItem])
      simulateAIAnalysis(mockId)
    }
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  return (
    <div className="relative flex flex-col w-full h-full min-h-screen bg-[#0A0A0B] overflow-y-auto custom-scrollbar p-10 font-sans">
      {/* 背景噪声纹理 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 z-[1]" />
      
      {/* 顶部流体渐变 */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full z-0" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full z-0" />

      <div className="relative z-10 max-w-[1400px] mx-auto w-full">
        {/* Header Section */}
        <header className="flex items-end justify-between mb-16 px-2">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">Creative Workspace</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-white">Moodboard <span className="text-white/20">/04</span></h1>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Current Session</div>
              <div className="text-2xl font-mono text-white/90 italic tracking-tighter">Apr 2026 / W14</div>
            </div>
          </div>
        </header>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-4 mb-20 h-[500px]">
          {DAYS.map((day, index) => (
            <div 
              key={day}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
              className="relative group h-full flex flex-col rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            >
              {/* Day Label */}
              <div className="pt-8 pb-4 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-white/60 transition-colors duration-500">
                  {day}
                </span>
              </div>

              {/* Interaction Area */}
              <div className="flex-1 px-2 pb-8 relative flex items-center justify-center overflow-visible">
                <AnimatePresence>
                  {items.filter(item => item.dayIndex === index).length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 group-hover:scale-110 transition-transform duration-700"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all duration-500">
                        <Plus size={20} className="text-white/20 group-hover:text-white group-hover:rotate-90 transition-all duration-700" />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                       {items.filter(item => item.dayIndex === index).map(item => (
                         <PolaroidCard key={item.id} item={item} onRemove={removeItem} />
                       ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Dot */}
              <div className="pb-6 flex justify-center">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${items.filter(item => item.dayIndex === index).length > 0 ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-white/5'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Reflection Section - 毛玻璃极致效果 */}
        <section className="group relative w-full rounded-[3rem] bg-white/[0.01] backdrop-blur-3xl border border-white/5 p-16 shadow-2xl transition-all duration-1000 hover:bg-white/[0.02] hover:border-white/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-16 items-start">
            <div className="w-full md:w-1/3 space-y-6">
              <h2 className="text-4xl font-bold tracking-tight text-white/90 leading-tight">Weekly <br/><span className="text-white/30 italic font-serif">Aesthetics</span></h2>
              <p className="text-sm text-white/40 leading-relaxed font-medium">
                Documenting the evolution of your creative eye. AI-powered metadata tagging helps you bridge the gap between intuition and articulation.
              </p>
              
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <div className="w-8 h-px bg-white/10" />
                  Insight Stats
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-2xl font-mono text-white/80">{items.length}</div>
                    <div className="text-[9px] text-white/20 uppercase mt-1">Images Curated</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-2xl font-mono text-white/80">{Array.from(new Set(items.flatMap(i => i.tags))).length}</div>
                    <div className="text-[9px] text-white/20 uppercase mt-1">Design Tags</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              <textarea
                value={weeklyNote}
                onChange={(e) => setWeeklyNote(e.target.value)}
                placeholder="Write your creative reflection here..."
                className="w-full min-h-[400px] bg-white/[0.03] border border-white/5 rounded-[2rem] p-10 text-xl font-serif italic text-white/70 leading-relaxed outline-none focus:bg-white/[0.05] focus:border-white/20 transition-all duration-700 placeholder:text-white/5 resize-none selection:bg-blue-500/40"
              />
              <div className="absolute bottom-6 right-8 flex items-center gap-4">
                 <div className="text-[10px] font-black tracking-widest text-white/10 uppercase">Auto-syncing to SecondBrain</div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Navigation Overlay */}
      <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <nav className="flex items-center gap-1 p-2 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl scale-90 md:scale-100">
           <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-500">
             <Calendar size={20} />
           </button>
           <button className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-500">
             <ImageIcon size={20} />
           </button>
           <button className="w-12 h-12 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-500">
             <Share2 size={20} />
           </button>
        </nav>
      </footer>
    </div>
  )
}

/**
 * 宝丽来卡片组件 (像素级复刻抖音参考视频效果)
 */
const PolaroidCard: React.FC<{ item: MoodboardItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false)

  // 模拟气泡定位
  const bubblePositions = [
    { top: '-10%', left: '-20%' },
    { top: '20%', left: '110%' },
    { top: '70%', left: '-30%' },
    { top: '80%', right: '-25%' },
    { top: '-5%', right: '-15%' },
  ]

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: item.rotation * 2 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        rotate: isHovered ? 0 : item.rotation,
        zIndex: isHovered ? 50 : 10,
        y: isHovered ? -20 : 0
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative p-4 pb-16 bg-white rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] cursor-pointer group/card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 移除按钮 */}
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all z-[60] hover:bg-red-500"
      >
        <X size={12} />
      </button>

      {/* 图片主体 */}
      <div className="relative w-[180px] aspect-[4/5] bg-stone-100 overflow-hidden shadow-inner">
        <img 
          src={item.url} 
          alt="Mood" 
          className={`w-full h-full object-cover transition-all duration-1000 ${isHovered ? 'scale-110 contrast-110' : 'scale-100 contrast-[1.05] saturate-[0.9]'}`} 
        />
        
        {/* 光影效果叠加 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
        
        {/* Analyzing Overlay */}
        <AnimatePresence>
          {item.isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles size={24} className="text-amber-400" />
              </motion.div>
              <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">Neural Analyzing</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 手写签名 / 文字 */}
      <div className="absolute bottom-4 left-6 right-6">
        <div className="font-serif italic text-stone-800 text-sm truncate opacity-70">
          {item.caption || '...'}
        </div>
      </div>

      {/* AI 气泡标签 (像素级复刻悬浮设计) */}
      <AnimatePresence>
        {isHovered && !item.isAnalyzing && item.tags.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {item.tags.slice(0, 5).map((tag, i) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  delay: i * 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 15
                }}
                className="absolute z-[100] pointer-events-auto"
                style={bubblePositions[i % bubblePositions.length]}
              >
                <div className="group/tag relative flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl hover:bg-white hover:border-black transition-all duration-500 cursor-copy">
                  <Sparkles size={10} className="text-amber-400 group-hover/tag:text-black transition-colors" />
                  <span className="text-[10px] font-black text-white group-hover/tag:text-black transition-colors whitespace-nowrap">{tag}</span>
                  <Copy size={8} className="text-white/20 group-hover/tag:text-black/40" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
