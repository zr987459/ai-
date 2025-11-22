import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageRole } from '../types';
import { Copy, Check, User, Sparkles, Search, Image as ImageIcon } from 'lucide-react';

interface Props {
  message: Message;
  textSize: 'small' | 'normal' | 'large';
}

const MessageBubble: React.FC<Props> = ({ message, textSize }) => {
  const isUser = message.role === MessageRole.User;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const textSizeClass = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg'
  }[textSize];

  // Handle grounding metadata (search results)
  const searchChunks = message.groundingMetadata?.groundingChunks || [];
  const hasSearchResults = searchChunks.length > 0;
  const webSources = searchChunks.map(c => c.web).filter(Boolean);

  return (
    <div className={`group flex gap-4 mb-6 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
        isUser 
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
          : message.isError 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-gradient-to-br from-blue-600 to-cyan-500'
      }`}>
        {isUser ? <User size={18} className="text-white" /> : <Sparkles size={18} className="text-white" />}
      </div>

      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Name & Time */}
        <div className="flex items-center gap-2 mb-1 px-1 opacity-50 text-xs">
            <span>{isUser ? '你' : 'Gemini'}</span>
            <span>{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>

        {/* Bubble */}
        <div className={`relative px-4 py-3 rounded-2xl shadow-xl backdrop-blur-sm border overflow-hidden ${
          isUser 
            ? 'bg-blue-600 text-white border-blue-500/30 rounded-tr-sm' 
            : message.isError
                ? 'bg-red-900/20 border-red-500/30 text-red-100 rounded-tl-sm'
                : 'bg-[#1e293b]/70 border-white/10 text-slate-100 rounded-tl-sm ring-1 ring-white/5'
        } ${textSizeClass}`}>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {message.attachments.map((att, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 group/att">
                             {att.type === 'image' ? (
                                 <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-24 w-auto object-cover transition-transform group-hover/att:scale-105" />
                             ) : (
                                 <div className="h-16 w-16 bg-white/10 flex items-center justify-center">
                                     <ImageIcon size={24} />
                                 </div>
                             )}
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className={`markdown-body ${isUser ? 'text-white' : 'text-slate-200'}`}>
                {message.content ? (
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Style code blocks
                            code(props) {
                                const {children, className, node, ...rest} = props
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                    <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0f172a] shadow-md">
                                        <div className="px-3 py-1.5 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
                                        </div>
                                        <div className="p-3 overflow-x-auto">
                                            <code {...rest} className={`${className} text-sm font-mono text-blue-200`}>
                                                {children}
                                            </code>
                                        </div>
                                    </div>
                                ) : (
                                    <code {...rest} className="px-1.5 py-0.5 rounded bg-white/10 text-sm font-mono mx-0.5 text-blue-200 border border-white/5">
                                        {children}
                                    </code>
                                )
                            },
                            // Style links
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all font-medium" />,
                            // Style lists
                            ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside my-2 space-y-1" />,
                            ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside my-2 space-y-1" />,
                            blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-blue-500/50 pl-3 italic my-2 text-white/60 bg-white/5 py-1 rounded-r" />,
                            p: ({node, ...props}) => <p {...props} className="my-1 leading-relaxed" />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-3 rounded border border-white/10"><table {...props} className="min-w-full divide-y divide-white/10" /></div>,
                            th: ({node, ...props}) => <th {...props} className="px-3 py-2 bg-white/5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" />,
                            td: ({node, ...props}) => <td {...props} className="px-3 py-2 text-sm whitespace-nowrap border-t border-white/5" />,
                        }}
                     >
                        {message.content}
                    </ReactMarkdown>
                ) : (
                    // Loading indicator for empty streaming message
                    message.isStreaming && <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-1 align-middle opacity-70"></span>
                )}
                
                {message.isStreaming && message.content && (
                   <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(96,165,250,0.8)] rounded-full"></span>
                )}
            </div>

            {/* Grounding / Search Results */}
            {hasSearchResults && (
                <div className="mt-3 pt-3 border-t border-white/10 text-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Search size={12} />
                        <span className="font-medium">参考来源</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {webSources.map((source: any, idx: number) => (
                            <a 
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-blue-300 hover:bg-white/10 hover:border-blue-500/30 transition-all max-w-full shadow-sm"
                            >
                                <span className="truncate max-w-[180px]">{source.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        {/* Actions */}
        {!isUser && !message.isStreaming && !message.isError && (
            <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                    onClick={handleCopy} 
                    className="p-1.5 text-gray-500 hover:text-white transition-colors rounded hover:bg-white/10"
                    title="复制"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
