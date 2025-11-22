import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Mic, MicOff, X, Paperclip, Globe, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { Attachment } from '../types';

interface Props {
  onSend: (text: string, attachments: Attachment[], useSearch: boolean) => void;
  onStop: () => void;
  isLoading: boolean;
  enableTTS: boolean;
  onToggleTTS: () => void;
}

const InputArea: React.FC<Props> = ({ onSend, onStop, isLoading, enableTTS, onToggleTTS }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [useSearch, setUseSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        setIsSpeechSupported(false);
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Single sentence mode for better stability
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
        setIsListening(true);
        setPermissionError(false);
    };

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Append final results to text state
        if (finalTranscript) {
            setText(prev => {
                const newText = prev + finalTranscript;
                // Fix punctuation spacing if needed
                return newText;
            });
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
            setPermissionError(true);
            alert("无法访问麦克风。请检查浏览器权限设置，确保允许网站使用麦克风。");
        } else if (event.error === 'no-speech') {
            // Silently ignore no-speech, just stop listening state
        } else {
            // alert("语音识别错误: " + event.error);
        }
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, []);

  const toggleListening = () => {
    if (!isSpeechSupported) {
        alert("您的浏览器不支持语音输入功能。建议使用 Chrome、Edge 或 Safari 浏览器。");
        return;
    }

    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        try {
            recognitionRef.current?.start();
        } catch (e) {
            console.error("Start failed:", e);
            setIsListening(false);
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
                const base64 = (ev.target.result as string).split(',')[1];
                const newAtt: Attachment = {
                    id: Date.now().toString() + Math.random().toString(),
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    mimeType: file.type || 'application/octet-stream',
                    data: base64,
                    name: file.name
                };
                setAttachments(prev => [...prev, newAtt]);
            }
          };
          reader.readAsDataURL(file);
      });
      e.target.value = ''; // reset
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSend(text, attachments, useSearch);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 w-full">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 pl-1 scrollbar-thin scrollbar-thumb-gray-700">
            {attachments.map(att => (
                <div key={att.id} className="relative group shrink-0">
                    {att.type === 'image' ? (
                        <img 
                            src={`data:${att.mimeType};base64,${att.data}`} 
                            className="h-16 w-16 object-cover rounded-xl border border-white/10 shadow-lg" 
                            alt="preview" 
                        />
                    ) : (
                        <div className="h-16 w-16 bg-[#1e293b] rounded-xl border border-white/10 shadow-lg flex flex-col items-center justify-center p-1">
                             <div className="text-xs font-bold text-gray-400 uppercase truncate max-w-full px-1">
                                {att.name?.split('.').pop() || 'FILE'}
                             </div>
                             <div className="text-[8px] text-gray-500 truncate w-full text-center px-1 mt-1">
                                {att.name}
                             </div>
                        </div>
                    )}
                    <button 
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-[#0f172a]/80 border border-white/10 backdrop-blur-xl rounded-3xl p-2 shadow-2xl ring-1 ring-white/5">
        {/* Left Actions */}
        <div className="flex pb-1.5 pl-1.5 gap-1">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="上传文件 (图片/视频/音频/PDF/压缩包等)"
            >
                <Paperclip size={20} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple
                onChange={handleFileSelect}
            />
            
             <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`p-2 rounded-full transition-all flex items-center gap-1 ${useSearch ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                title={useSearch ? "联网搜索已开启" : "开启联网搜索"}
            >
                <Globe size={20} />
                {useSearch && <span className="text-[10px] font-bold hidden sm:inline-block">Search</span>}
            </button>
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "正在聆听..." : (useSearch ? "输入问题 (联网搜索已开启)..." : "输入消息...")}
          className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 resize-none py-3 px-2 min-h-[48px] max-h-[160px] scrollbar-thin leading-relaxed"
          rows={1}
        />

        {/* Right Actions */}
        <div className="flex pb-1.5 gap-2 pr-1.5">
            {/* Voice Input Toggle */}
            <div className="relative">
                <button
                    onClick={toggleListening}
                    disabled={!isSpeechSupported}
                    className={`p-2 rounded-full transition-all ${
                        !isSpeechSupported ? 'text-gray-600 cursor-not-allowed' :
                        permissionError ? 'text-red-500 bg-red-500/10' :
                        isListening ? 'text-red-400 bg-red-500/10 animate-pulse shadow-[0_0_10px_rgba(248,113,113,0.4)]' : 
                        'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                    title={
                        !isSpeechSupported ? "当前浏览器不支持语音输入" :
                        permissionError ? "麦克风权限被拒绝" :
                        isListening ? "点击停止录音" : "点击开始语音输入"
                    }
                >
                    {isListening ? <MicOff size={20} /> : permissionError ? <AlertCircle size={20} /> : <Mic size={20} />}
                </button>
            </div>

            {/* TTS Toggle */}
            <button
                onClick={onToggleTTS}
                className={`p-2 rounded-full transition-all ${enableTTS ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                title={enableTTS ? "自动朗读已开启" : "开启自动朗读"}
            >
                {enableTTS ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            {/* Send / Stop */}
            {isLoading ? (
                <button 
                    onClick={onStop}
                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all animate-pulse shadow-lg shadow-red-900/30"
                >
                    <StopCircle size={20} />
                </button>
            ) : (
                <button 
                    onClick={handleSend}
                    disabled={!text.trim() && attachments.length === 0}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-full transition-all shadow-lg shadow-blue-900/20"
                >
                    <Send size={20} />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default InputArea;