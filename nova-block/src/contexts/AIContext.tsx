import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const isMounted = useRef(true);

  const refreshAiStatus = async () => {
    try {
      const status = await api.getAIPluginStatus() as any;
      if (!isMounted.current) return;

      if (status && typeof status.enabled === 'boolean') {
        const enabled = status.enabled;
        setIsAiEnabled(enabled);
        localStorage.setItem(STORAGE_KEY, String(enabled));
      }
      if (status?.num_ctx) {
        setContextLength(status.num_ctx);
      }
    } catch (err) {
      console.warn('Backend AI status fetch failed, using local persistence.');
      // 离线模式下，保持 localStorage 中的状态不被覆盖
    }
  };

  // 监听 isAiEnabled 的变化并保存到本地
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isAiEnabled));
  }, [isAiEnabled]);

  useEffect(() => {
    isMounted.current = true;
    refreshAiStatus();
    return () => {
      isMounted.current = false;
    };
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
