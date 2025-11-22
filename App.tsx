
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Message, MessageRole, Attachment, GroundingMetadata, AppSettings } from './types';
import { streamGeminiResponse } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants';
import { logger } from './services/loggerService';
import { Maximize, Minimize, Sparkles, Trash2, AlertTriangle, Info, Settings, ArrowDown } from 'lucide-react';

const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl border backdrop-blur-md animate-in fade-in slide-in-from-top-5 ${
      type === 'error' 
        ? 'bg-red-900/80 border-red-500/50 text-red-100' 
        : 'bg-gray-800/90 border-blue-500/30 text-blue-100'
    }`}>
      {type === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
      <span className="text-sm font-medium truncate max-w-[300px]">{message}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' } | null>(null);
  
  // Application Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Scroll & Layout Logic
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);

  // 1. Initialize
  useEffect(() => {
    // Load Settings
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        try {
            setSettings(JSON.parse(savedSettings));
        } catch (e) { console.error("Error loading settings", e); }
    }

    // Load History
    const savedHistory = localStorage.getItem(STORAGE_KEYS.GEMINI_HISTORY);
    if (savedHistory) {
        try {
            setMessages(JSON.parse(savedHistory));
        } catch (e) { console.error("Error loading history", e); }
    }

    // Handle OAuth Callback (Google Login)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
        try {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                setSettings(prev => {
                    const newSettings = { ...prev, accessToken: token };
                    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
                    return newSettings;
                });
                // Clean URL
                window.history.replaceState(null, '', window.location.pathname);
                setTimeout(() => setToast({ message: "Google 登录成功！Access Token 已保存", type: 'info' }), 500);
                logger.info("User logged in via Google OAuth");
            }
        } catch (e) {
            console.error("Error parsing OAuth token", e);
            logger.error("OAuth Token Parse Error", e);
        }
    }
    
    logger.info("App Initialized", { userAgent: navigator.userAgent });
    setIsInitialized(true);
  }, []);

  // 2. Save Side Effects
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.GEMINI_HISTORY, JSON.stringify(messages));
  }, [messages, isInitialized]);


  // --- Dynamic Layout Logic ---
  useLayoutEffect(() => {
    if (!footerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        setFooterHeight(height);
        if (!showScrollButton && scrollContainerRef.current) {
           scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }
    });
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, [showScrollButton]);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        showToast("全屏模式被浏览器拦截", "error");
      }
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom) {
      if (showScrollButton) setShowScrollButton(false);
    } else {
      if (!showScrollButton) setShowScrollButton(true);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: behavior
      });
    }
    setShowScrollButton(false);
  };
  
  // Auto-scroll
  useLayoutEffect(() => {
    if (!showScrollButton && scrollContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isStreaming = lastMessage?.isStreaming;
      if (isStreaming) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      } else {
        scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, showScrollButton, footerHeight]);

  const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
    setToast({ message: msg, type });
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空当前对话历史吗？')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.GEMINI_HISTORY);
      showToast("历史记录已清空", "info");
      logger.info("User cleared chat history");
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      showToast("生成已停止", "info");
      window.speechSynthesis.cancel();
      logger.info("Generation stopped by user");

      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === MessageRole.Model && lastMsg.isStreaming) {
           return [ ...newMsgs.slice(0, -1), { ...lastMsg, isStreaming: false } ];
        }
        return newMsgs;
      });
    }
  };

  // Main Send Handler
  const handleSend = async (text: string, attachments: Attachment[], useSearch: boolean) => {
    if (isLoading) return;
    
    // Check auth
    if (!settings.geminiApiKey && !settings.geminiCookie && !settings.accessToken) {
        showToast("请先在设置中登录或配置 API Key", "error");
        setShowSettings(true);
        logger.warn("Attempted to send message without auth");
        return;
    }

    // Add User Message
    const newMessageId = Date.now().toString();
    setMessages(prev => [...prev, {
       id: newMessageId,
       role: MessageRole.User,
       content: text,
       timestamp: Date.now(),
       attachments: attachments
    }]);
    setIsLoading(true);
    setShowScrollButton(false); 

    // Add AI Placeholder
    const modelMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
       id: modelMessageId,
       role: MessageRole.Model,
       content: '',
       timestamp: Date.now(),
       isStreaming: true
    }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
       await streamGeminiResponse({
           model: settings.model,
           history: messages,
           newMessage: text,
           attachments: attachments,
           useSearch: useSearch,
           apiKey: settings.geminiApiKey,
           baseUrl: settings.baseUrl,
           cookie: settings.geminiCookie,
           accessToken: settings.accessToken,
           customHeaders: settings.customHeaders,
           signal: abortController.signal,
           onStream: (text, metadata) => {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const index = newMsgs.findIndex(m => m.id === modelMessageId);
                    if (index !== -1) {
                        newMsgs[index] = {
                            ...newMsgs[index],
                            content: text,
                            groundingMetadata: metadata
                        };
                    }
                    return newMsgs;
                });
           }
       });
       
       if (settings.enableTTS) {
           // TTS logic skipped for brevity
       }

    } catch (error: any) {
        if (error.message === "Generation stopped.") {
            // handled
        } else {
            console.error(error);
            showToast(error.message || "发送失败", "error");
            setMessages(prev => {
                const newMsgs = [...prev];
                const index = newMsgs.findIndex(m => m.id === modelMessageId);
                if (index !== -1) {
                    newMsgs[index] = {
                        ...newMsgs[index],
                        isError: true,
                        content: "请求失败: " + (error.message || "未知错误"),
                        isStreaming: false
                    };
                }
                return newMsgs;
            });
        }
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        setMessages(prev => {
            const newMsgs = [...prev];
            const index = newMsgs.findIndex(m => m.id === modelMessageId);
            if (index !== -1) {
                newMsgs[index] = { ...newMsgs[index], isStreaming: false };
            }
            return newMsgs;
        });
    }
  };

  if (!isInitialized) return null;

  return (
    <div className={`flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30 ${
        settings.textSize === 'small' ? 'text-sm' : settings.textSize === 'large' ? 'text-lg' : 'text-base'
    }`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Gemini AI
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
             {settings.model.replace('gemini-', '')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clearHistory} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors" title="清空历史">
            <Trash2 size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors" title="设置">
            <Settings size={18} />
          </button>
          <button onClick={toggleFullScreen} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors hidden md:block" title="全屏模式">
            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main 
          className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ paddingBottom: footerHeight ? `${footerHeight}px` : '150px' }}
      >
          {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-0 animate-in fade-in zoom-in duration-500 delay-100 fill-mode-forwards">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-blue-900/20">
                  <Sparkles size={48} className="text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                  你好，我是 Gemini
              </h2>
              <p className="text-gray-400 max-w-md mb-8 text-base leading-relaxed">
                 支持 Gemini 3.0 Pro 强推理模型、200万上下文、多模态文件分析、代码实时预览与联网搜索。
              </p>
              
              {/* Example Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {["写一个贪吃蛇游戏 (HTML)", "解释量子纠缠", "分析这张图片", "搜索今日科技新闻"].map((q, i) => (
                  <button 
                      key={i} 
                      onClick={() => handleSend(q, [], false)}
                      className="px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-sm text-left text-gray-300 hover:text-white transition-all hover:translate-y-[-2px] shadow-sm"
                  >
                      {q}
                  </button>
                  ))}
              </div>
          </div>
          ) : (
          <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} textSize={settings.textSize} />
              ))}
              <div ref={messagesEndRef} />
          </div>
          )}
          
          {showScrollButton && (
          <button 
              onClick={() => scrollToBottom('smooth')}
              className="fixed bottom-32 right-6 z-40 p-3 bg-gray-800 text-blue-400 rounded-full shadow-xl border border-gray-700 hover:bg-gray-700 transition-all animate-in fade-in slide-in-from-bottom-4"
          >
              <ArrowDown size={20} />
          </button>
          )}
      </main>

      <footer ref={footerRef} className="fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent pt-10 pb-4 px-2">
          <InputArea 
              onSend={handleSend} 
              onStop={handleStopGeneration} 
              isLoading={isLoading}
              enableTTS={settings.enableTTS}
              onToggleTTS={() => setSettings(s => ({...s, enableTTS: !s.enableTTS}))}
          />
          <p className="text-center text-[10px] text-gray-600 mt-2">
              Gemini 可能会生成不准确的信息，请核实。
          </p>
          </div>
      </footer>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onSave={(newSettings) => {
            setSettings(newSettings);
            showToast("设置已保存", "info");
        }} 
      />
    </div>
  );
};

export default App;
