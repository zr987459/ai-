import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Trash2, Settings, Maximize, Minimize } from 'lucide-react';
import { AppTab, AppSettings, Message, MessageRole, Attachment } from './types';
import { STORAGE_KEYS, DEFAULT_SETTINGS, MODELS } from './constants';
import { streamGeminiResponse } from './services/geminiService';
import { streamDoubaoResponse } from './services/doubaoService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<AppTab>('gemini');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Effects ---

  // 1. Initialization (Load Settings & History)
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      if (savedTab === 'gemini' || savedTab === 'doubao') {
        setActiveTab(savedTab);
      }
    } catch (e) {
      console.error("Failed to load initialization data", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Load Messages when Tab Changes
  useEffect(() => {
    if (!isInitialized) return;
    const key = activeTab === 'gemini' ? STORAGE_KEYS.GEMINI_HISTORY : STORAGE_KEYS.DOUBAO_HISTORY;
    const savedMsgs = localStorage.getItem(key);
    if (savedMsgs) {
      try {
        setMessages(JSON.parse(savedMsgs));
      } catch { setMessages([]); }
    } else {
      setMessages([]);
    }
  }, [activeTab, isInitialized]);

  // 3. Auto-scroll
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]); 

  // --- Handlers ---

  const handleTabChange = (tab: AppTab) => {
    if (isLoading) return;
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
  };

  const handleClearHistory = () => {
    if (confirm("确定要清空当前的聊天记录吗？")) {
      setMessages([]);
      const key = activeTab === 'gemini' ? STORAGE_KEYS.GEMINI_HISTORY : STORAGE_KEYS.DOUBAO_HISTORY;
      localStorage.removeItem(key);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  };

  const saveMessagesToStorage = (msgs: Message[]) => {
    const key = activeTab === 'gemini' ? STORAGE_KEYS.GEMINI_HISTORY : STORAGE_KEYS.DOUBAO_HISTORY;
    localStorage.setItem(key, JSON.stringify(msgs));
  };

  const speakText = (text: string) => {
    if (!settings.enableTTS) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to select a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    
    utterance.rate = settings.ttsSpeed;
    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      window.speechSynthesis.cancel();
      setMessages(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === MessageRole.Model && last.isStreaming) {
            const updated = prev.slice(0, -1).concat({ ...last, isStreaming: false });
            saveMessagesToStorage(updated);
            return updated;
         }
         return prev;
      });
    }
  };

  const handleSend = async (text: string, attachments: Attachment[], useSearch: boolean) => {
    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.User,
      content: text,
      timestamp: Date.now(),
      attachments
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessagesToStorage(newMessages);
    setIsLoading(true);

    // Placeholder for AI
    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: Message = {
      id: aiMsgId,
      role: MessageRole.Model,
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    setMessages(prev => [...prev, initialAiMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let accumulatedText = "";

    const onStream = (chunkText: string, metadata?: any) => {
        accumulatedText = chunkText;
        setMessages(current => {
            const updated = [...current];
            const idx = updated.findIndex(m => m.id === aiMsgId);
            if (idx !== -1) {
                updated[idx] = { 
                    ...updated[idx], 
                    content: accumulatedText,
                    groundingMetadata: metadata
                };
            }
            return updated;
        });
    };

    try {
        if (activeTab === 'gemini') {
            await streamGeminiResponse({
                model: settings.model || MODELS.GEMINI_PRO,
                history: newMessages,
                newMessage: text,
                attachments,
                useSearch,
                apiKey: settings.geminiApiKey,
                baseUrl: settings.baseUrl,
                cookie: settings.geminiCookie,
                customHeaders: settings.customHeaders,
                signal: controller.signal,
                onStream
            });
        } else {
            await new Promise<void>((resolve, reject) => {
                 streamDoubaoResponse({
                    prompt: text,
                    attachments,
                    cookie: settings.doubaoCookie,
                    signal: controller.signal,
                    onStream,
                    onDone: resolve,
                    onError: reject
                 });
            });
        }

        // Finished
        setMessages(current => {
            const updated = [...current];
            const idx = updated.findIndex(m => m.id === aiMsgId);
            if (idx !== -1) {
                updated[idx] = { ...updated[idx], isStreaming: false };
            }
            saveMessagesToStorage(updated);
            return updated;
        });
        
        if (settings.enableTTS) speakText(accumulatedText);

    } catch (error: any) {
        if (error.message === "Generation stopped.") return;
        
        const errorMsg = error.message || "未知错误";
        setMessages(current => {
            const updated = [...current];
            const idx = updated.findIndex(m => m.id === aiMsgId);
            if (idx !== -1) {
                updated[idx] = { 
                    ...updated[idx], 
                    isStreaming: false, 
                    isError: true, 
                    content: `**错误**: ${errorMsg}` 
                };
            }
            saveMessagesToStorage(updated);
            return updated;
        });
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullScreen(true);
    } else {
        document.exitFullscreen();
        setIsFullScreen(false);
    }
  };

  if (!isInitialized) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-white/5 bg-[#020617]/60 backdrop-blur-md flex items-center justify-between px-4 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
            <Sparkles className="text-white" size={18} />
          </div>
          
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
            <button 
                onClick={() => handleTabChange('gemini')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'gemini' ? 'bg-blue-600 text-white shadow-sm ring-1 ring-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Sparkles size={12} /> Gemini
            </button>
            <button 
                onClick={() => handleTabChange('doubao')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'doubao' ? 'bg-blue-500 text-white shadow-sm ring-1 ring-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <MessageSquare size={12} /> 豆包
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={handleClearHistory} className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5" title="清空历史">
             <Trash2 size={18} />
           </button>
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5" title="设置">
             <Settings size={18} />
           </button>
           <button onClick={toggleFullScreen} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 hidden md:block" title="全屏模式">
             {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
           </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent">
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                <div className={`w-24 h-24 rounded-3xl mb-6 flex items-center justify-center border border-white/5 bg-gradient-to-br ${activeTab === 'gemini' ? 'from-blue-500/10 to-purple-500/10 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)]' : 'from-blue-400/10 to-cyan-400/10 shadow-[0_0_60px_-15px_rgba(56,189,248,0.3)]'}`}>
                    {activeTab === 'gemini' ? <Sparkles size={48} className="text-blue-400 opacity-80" /> : <MessageSquare size={48} className="text-cyan-400 opacity-80" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                    {activeTab === 'gemini' ? 'Gemini 智能助手' : '豆包对话'}
                </h1>
                <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                    {activeTab === 'gemini' 
                        ? '体验 Gemini 3.0 Pro 的强大能力。支持高级推理、代码编写、多模态分析以及实时联网搜索。'
                        : '模拟字节跳动豆包大模型接口。提供快速、流畅的中文对话体验。'}
                </p>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto px-4 py-8">
                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} textSize={settings.textSize} />
                ))}
                <div ref={scrollEndRef} className="h-4" />
            </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 py-6 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-20">
        <InputArea 
            onSend={handleSend}
            onStop={handleStop}
            isLoading={isLoading}
            enableTTS={settings.enableTTS}
            onToggleTTS={() => handleSaveSettings({...settings, enableTTS: !settings.enableTTS})}
        />
        <div className="text-center mt-3">
            <p className="text-[10px] text-gray-600 font-medium">
                AI 生成的内容可能不准确，请核实重要信息。
            </p>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;