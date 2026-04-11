import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Loader2, Settings } from 'lucide-react';
import { api } from '../lib/api';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [hwStatus, setHwStatus] = useState<{ compatible: boolean; details: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const status = await api.getAIPluginStatus();
      setAiEnabled(status.enabled);
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await api.toggleAIPlugin(!aiEnabled);
      setAiEnabled(res.enabled);
    } catch (err) {
      console.error('Failed to toggle AI plugin:', err);
    } finally {
      setToggling(false);
    }
  };

  const checkHardware = async () => {
    setChecking(true);
    try {
      const res = await api.checkAIHardware();
      setHwStatus(res);
    } catch (err) {
      console.error('Failed to check hardware:', err);
      setHwStatus({ compatible: false, details: '检查失败，请确保后端服务正常运行' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-background/80 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">设置与空间管理</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Plugin Toggle */}
              <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border/20">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">本地 AI 引擎 (Local AI Plugin)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">启用本地 LLM 进行隐私优先的智能处理</p>
                  </div>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className="p-1 hover:scale-110 transition-transform disabled:opacity-50"
                >
                  {aiEnabled ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Hardware Check */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">硬件兼容性</h3>
                  <button
                    onClick={checkHardware}
                    disabled={checking}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1.5"
                  >
                    {checking ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        检查中...
                      </>
                    ) : (
                      '检查硬件兼容性'
                    )}
                  </button>
                </div>

                {hwStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border ${
                      hwStatus.compatible
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {hwStatus.compatible ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-bold">
                          {hwStatus.compatible ? '硬件已就绪' : '发现潜在限制'}
                        </p>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">{hwStatus.details}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                完成
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
