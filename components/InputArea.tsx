import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, Paperclip, Mic, X, Image as ImageIcon } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            const base64 = (ev.target.result as string).split(',')[1];
            const newAtt: Attachment = {
                id: Date.now().toString(),
                type: file.type.startsWith('image/') ? 'image' : 'file',
                mimeType: file.type,
                data: base64,
                name: file.name
            };
            setAttachments(prev => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // reset
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSend(text, attachments, useSearch);
    setText('');
    setAttachments([]);
    setUseSearch(false); // reset search toggle? optional
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 w-full">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 pl-1">
            {attachments.map(att => (
                <div key={att.id} className="relative group shrink-0">
                    <img 
                        src={`data:${att.mimeType};base64,${att.data}`} 
                        className="h-16 w-16 object-cover rounded-xl border border-white/10 shadow-lg" 
                        alt="preview" 
                    />
                    <button 
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
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
                title="上传图片"
            >
                <ImageIcon size={20} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
            />
            
             <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`p-2 rounded-full transition-all flex items-center justify-center ${useSearch ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                title={useSearch ? "联网搜索已开启" : "开启联网搜索"}
            >
                <div className={`font-bold text-xs border-[1.5px] rounded px-1 ${useSearch ? 'border-blue-400' : 'border-current'}`}>G</div>
            </button>
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 resize-none py-3 px-2 min-h-[48px] max-h-[160px] scrollbar-thin leading-relaxed"
          rows={1}
        />

        {/* Right Actions */}
        <div className="flex pb-1.5 gap-2 pr-1.5">
            <button
                onClick={onToggleTTS}
                className={`p-2 rounded-full transition-all ${enableTTS ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                title={enableTTS ? "自动朗读已开启" : "开启自动朗读"}
            >
                <Mic size={20} />
            </button>

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