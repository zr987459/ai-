import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageRole } from '../types';
import { Copy, Check, User, Sparkles, Search, Image as ImageIcon, Maximize, Minimize, Play, X, Terminal, LayoutTemplate, Code2, ChevronDown, ChevronUp, FileText, FileAudio, FileVideo, FileArchive, File } from 'lucide-react';

interface Props {
  message: Message;
  textSize: 'small' | 'normal' | 'large';
}

// --- CodeBlock Component ---
const CodeBlock = ({ language, code }: { language: string, code: string }) => {
  const [copied, setCopied] = useState(false);
  // Default to showing preview if it's HTML/JS, otherwise show code
  const lang = (language || '').toLowerCase();
  const isHtml = lang === 'html' || lang === 'xml' || lang === 'html5';
  const isJs = lang === 'javascript' || lang === 'js' || lang === 'jsx';
  const canPreview = isHtml || isJs;

  const [showPreview, setShowPreview] = useState(canPreview);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Controls fixed height vs auto height
  
  const codeContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect for the code block (only when not expanded and not in full screen)
  useEffect(() => {
    if (codeContentRef.current && !isExpanded && !isFullScreen && !showPreview) {
      const { scrollHeight, clientHeight } = codeContentRef.current;
      // Only auto-scroll if we are relatively close to bottom or it's a new generation
      codeContentRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [code, isExpanded, isFullScreen, showPreview]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullScreen = () => {
    const newFullScreenState = !isFullScreen;
    setIsFullScreen(newFullScreenState);
    // Auto-open preview in full screen if supported and was not already open
    if (newFullScreenState && canPreview) {
        setShowPreview(true);
    }
  };

  // Construct robust preview HTML
  const getPreviewContent = () => {
    const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
    const baseStyle = `
      <style>
        body { background-color: #ffffff; color: #1e293b; font-family: sans-serif; padding: 16px; }
        /* Custom Scrollbar for iframe */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      </style>
    `;

    if (isHtml) {
      // Inject Tailwind if not present
      const hasHead = code.includes('<head');
      const hasBody = code.includes('<body');
      const hasTailwind = code.includes('tailwindcss');

      let content = code;
      if (!hasTailwind) {
         // Try to inject tailwind
         if (hasHead) {
             content = content.replace('<head>', `<head>${tailwindScript}${baseStyle}`);
         } else {
             content = `${tailwindScript}${baseStyle}${content}`;
         }
      }
      return content;
    }

    if (isJs) {
      return `
        <!DOCTYPE html>
        <html>
          <head>${tailwindScript}${baseStyle}</head>
          <body>
            <div id="app"></div>
            <div id="console-output" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-family: monospace; font-size: 12px; color: #64748b;">
              <div style="color: #94a3b8; margin-bottom: 4px;">// Console Output & Result:</div>
            </div>
            <script>
              // Capture console.log
              const consoleDiv = document.getElementById('console-output');
              const originalLog = console.log;
              console.log = function(...args) {
                args.forEach(arg => {
                  const div = document.createElement('div');
                  div.textContent = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                  consoleDiv.appendChild(div);
                });
                originalLog.apply(console, args);
              };
              
              window.onerror = function(msg, url, line) {
                 const div = document.createElement('div');
                 div.style.color = 'red';
                 div.textContent = 'Error: ' + msg;
                 consoleDiv.appendChild(div);
              };

              try {
                ${code}
              } catch (e) {
                console.error(e);
              }
            </script>
          </body>
        </html>
      `;
    }
    return '';
  };

  const PreviewFrame = () => (
    <div className="w-full h-full bg-white rounded-b-lg overflow-hidden relative min-h-[300px]">
        <iframe 
            srcDoc={getPreviewContent()}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin" 
            title="Code Preview"
        />
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-100/80 backdrop-blur text-[10px] text-gray-500 rounded border border-gray-200 pointer-events-none">
            Preview Mode
        </div>
    </div>
  );

  const renderCodeContent = (fullScreen: boolean) => (
    <div className={`relative group bg-[#020617] ${fullScreen ? 'h-full flex flex-col' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border-b border-white/10 select-none shrink-0">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <Code2 size={14} className="text-blue-400" />
                    <span className="text-xs font-mono text-gray-300 font-medium">{lang || 'plaintext'}</span>
                </div>
                {canPreview && (
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                            showPreview 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200'
                        }`}
                    >
                        {showPreview ? <LayoutTemplate size={12} /> : <Play size={12} />}
                        {showPreview ? '返回代码' : '运行预览'}
                    </button>
                )}
            </div>
            <div className="flex items-center gap-1">
                <button 
                    onClick={handleCopy} 
                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
                    title="复制"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <button 
                    onClick={toggleFullScreen} 
                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
                    title={fullScreen ? "退出全屏" : "全屏"}
                >
                    {fullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
                </button>
            </div>
        </div>

        {/* Body */}
        <div className={`${fullScreen ? 'flex-1 overflow-hidden flex relative' : 'relative'}`}>
            
            {/* Code View */}
            <div className={`
                custom-scrollbar bg-[#020617] transition-all duration-300
                ${fullScreen 
                    ? (showPreview && canPreview ? 'w-1/2 border-r border-white/10 h-full overflow-auto' : 'w-full h-full overflow-auto') 
                    : (showPreview ? 'hidden' : `block w-full ${isExpanded ? 'h-auto' : 'h-64'} overflow-y-auto`)
                }
            `}
            ref={codeContentRef}
            >
                <div className="p-4">
                    <code className="font-mono text-[13px] leading-relaxed text-gray-300 whitespace-pre block">
                        {code}
                    </code>
                </div>
            </div>

            {/* Preview View */}
            {(showPreview || (fullScreen && canPreview && showPreview)) && (
                <div className={`
                    bg-gray-900 transition-all duration-300
                    ${fullScreen 
                        ? 'w-1/2 h-full' 
                        : 'w-full h-[320px] border-t border-white/10'
                    }
                `}>
                     <PreviewFrame />
                </div>
            )}
            
            {/* Collapse/Expand Button (Only in normal mode and Code view) */}
            {!fullScreen && !showPreview && (
                <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#020617] to-transparent flex items-end justify-center pb-2 pointer-events-none ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                </div>
            )}
            {!fullScreen && !showPreview && (
                 <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-[10px] text-gray-300 border border-white/5 transition-all shadow-lg"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp size={12} />
                            收起代码
                        </>
                    ) : (
                        <>
                            <ChevronDown size={12} />
                            展开代码
                        </>
                    )}
                </button>
            )}
        </div>
    </div>
  );

  if (isFullScreen) {
    return createPortal(
        <div className="fixed inset-0 z-[100] bg-[#020617] animate-fade-in flex flex-col">
             {/* Full Screen Toolbar */}
             <div className="h-12 border-b border-white/10 bg-[#0f172a] flex items-center justify-between px-4 shrink-0 shadow-md">
                 <div className="flex items-center gap-3 text-sm font-medium text-white">
                     <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <Terminal size={18} />
                     </div>
                     <div className="flex flex-col">
                        <span>代码查看器</span>
                        <span className="text-[10px] text-gray-400 font-mono">{lang}</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-3">
                     {canPreview && (
                         <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                             <button 
                                onClick={() => setShowPreview(false)}
                                className={`px-3 py-1 text-xs rounded transition-all ${!showPreview ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                             >
                                 代码
                             </button>
                             <button 
                                onClick={() => setShowPreview(true)}
                                className={`px-3 py-1 text-xs rounded transition-all flex items-center gap-1 ${showPreview ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                             >
                                 <Play size={10} /> 预览
                             </button>
                         </div>
                     )}
                     <div className="h-6 w-px bg-white/10 mx-1"></div>
                     <button 
                        onClick={toggleFullScreen}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                     >
                         <X size={18} />
                     </button>
                 </div>
             </div>
             <div className="flex-1 overflow-hidden relative">
                 {renderCodeContent(true)}
             </div>
        </div>,
        document.body
    );
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-white/10 shadow-lg bg-[#020617] ring-1 ring-black/50 transition-all duration-300">
        {renderCodeContent(false)}
    </div>
  );
};

// --- Main MessageBubble ---

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

  // Helper to render file icon based on mime type
  const renderFileIcon = (mime: string) => {
      if (mime.startsWith('audio/')) return <FileAudio size={24} />;
      if (mime.startsWith('video/')) return <FileVideo size={24} />;
      if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) return <FileArchive size={24} />;
      if (mime.includes('pdf') || mime.includes('text/')) return <FileText size={24} />;
      return <File size={24} />;
  };

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

      <div className={`flex flex-col max-w-[90%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Name & Time */}
        <div className="flex items-center gap-2 mb-1 px-1 opacity-50 text-xs select-none">
            <span>{isUser ? '你' : 'Gemini'}</span>
            <span>{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>

        {/* Bubble */}
        <div className={`relative px-4 py-3 rounded-2xl shadow-xl backdrop-blur-sm border overflow-hidden w-full ${
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
                        <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 group/att bg-[#0f172a]">
                             {att.type === 'image' ? (
                                 <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-24 w-auto object-cover transition-transform group-hover/att:scale-105" />
                             ) : (
                                 <div className="h-16 min-w-[120px] px-3 bg-white/5 flex items-center gap-3 hover:bg-white/10 transition-colors">
                                     <div className="text-blue-400">
                                         {renderFileIcon(att.mimeType)}
                                     </div>
                                     <div className="flex flex-col overflow-hidden">
                                         <span className="text-xs font-medium truncate max-w-[100px]">{att.name}</span>
                                         <span className="text-[9px] text-gray-500 uppercase">{att.name?.split('.').pop()}</span>
                                     </div>
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
                            code(props) {
                                const {children, className, node, ...rest} = props
                                const match = /language-(\w+)/.exec(className || '')
                                const content = String(children).replace(/\n$/, '')
                                
                                // Use CodeBlock for blocks (has language or is multiline), simple code for inline
                                const isBlock = match || content.includes('\n');

                                return isBlock ? (
                                    <CodeBlock language={match ? match[1] : ''} code={content} />
                                ) : (
                                    <code {...rest} className="px-1.5 py-0.5 rounded bg-white/10 text-sm font-mono mx-0.5 text-blue-200 border border-white/5 break-words align-middle">
                                        {children}
                                    </code>
                                )
                            },
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all font-medium cursor-pointer" />,
                            ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside my-2 space-y-1" />,
                            ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside my-2 space-y-1" />,
                            blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-blue-500/50 pl-4 italic my-3 text-white/60 bg-white/5 py-2 rounded-r" />,
                            p: ({node, ...props}) => <p {...props} className="my-1.5 leading-relaxed break-words" />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10 shadow-sm"><table {...props} className="min-w-full divide-y divide-white/10 bg-[#020617]/50" /></div>,
                            th: ({node, ...props}) => <th {...props} className="px-4 py-3 bg-white/5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" />,
                            td: ({node, ...props}) => <td {...props} className="px-4 py-3 text-sm whitespace-nowrap border-t border-white/5" />,
                            img: ({node, ...props}) => <img {...props} className="rounded-lg my-3 max-w-full border border-white/10 shadow-md" />,
                            hr: ({node, ...props}) => <hr {...props} className="my-6 border-white/10" />,
                            h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-white/10 text-white" />,
                            h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mt-5 mb-3 text-white" />,
                            h3: ({node, ...props}) => <h3 {...props} className="text-lg font-semibold mt-4 mb-2 text-gray-200" />,
                        }}
                     >
                        {message.content}
                    </ReactMarkdown>
                ) : (
                    message.isStreaming && <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-1 align-middle opacity-70"></span>
                )}
                
                {message.isStreaming && message.content && (
                   <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(96,165,250,0.8)] rounded-full"></span>
                )}
            </div>

            {/* Grounding / Search Results */}
            {hasSearchResults && (
                <div className="mt-4 pt-3 border-t border-white/10 text-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                        <Search size={12} />
                        <span>参考来源</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {webSources.map((source: any, idx: number) => (
                            <a 
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-blue-300 hover:bg-white/10 hover:border-blue-500/30 transition-all max-w-full shadow-sm group/link"
                            >
                                <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover/link:text-blue-300">
                                    <span className="text-[9px] font-bold">{idx + 1}</span>
                                </div>
                                <span className="truncate max-w-[200px]">{source.title}</span>
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