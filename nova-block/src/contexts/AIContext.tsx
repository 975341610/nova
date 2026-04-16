import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AIContextType {
  isAiEnabled: boolean;
  setIsAiEnabled: (enabled: boolean) => void;
  contextLength: number;
  setContextLength: (length: number) => void;
  refreshAiStatus: () => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const STORAGE_KEY = 'nova_ai_plugin_enabled';

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAiEnabled, setIsAiEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // 默认开启 AI 插件（如果是首次安装）
    return saved !== null ? saved === 'true' : true;
  });
  const [contextLength, setContextLength] = useState(8192);

  const refreshAiStatus = async () => {
    try {
      const status = await api.getAIPluginStatus() as any;
      const enabled = status.enabled;
      setIsAiEnabled(enabled);
      localStorage.setItem(STORAGE_KEY, String(enabled));
      if (status.num_ctx) {
        setContextLength(status.num_ctx);
      }
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
      // 📂 Phase 4 离线修复：
      // 不再强制设为 true。如果无法连接后端，保持当前的本地状态。
    }
  };

  // 监听 isAiEnabled 的变化并保存到本地
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isAiEnabled));
  }, [isAiEnabled]);

  useEffect(() => {
    refreshAiStatus();
  }, []);

  return (
    <AIContext.Provider value={{ 
      isAiEnabled, 
      setIsAiEnabled, 
      contextLength, 
      setContextLength, 
      refreshAiStatus 
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
