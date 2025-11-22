
import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Monitor, Volume2, Key, Globe, CheckCircle2, AlertTriangle, Loader2, Cookie, LogIn, FileText, Trash, Copy, Fingerprint, HelpCircle, BookOpen, ExternalLink, ChevronRight } from 'lucide-react';
import { AppSettings } from '../types';
import { checkGeminiConnectivity } from '../services/geminiService';
import { logger, LogEntry } from '../services/loggerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'config' | 'tutorial'>('config');
  const [checkingType, setCheckingType] = useState<'api' | 'token' | 'cookie' | null>(null);
  const [checkResult, setCheckResult] = useState<{type: 'api' | 'token' | 'cookie', status: 'success' | 'error'} | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (showLogs) {
        setLogs(logger.getLogs());
    }
  }, [showLogs]);

  // Reset check status when inputs change
  useEffect(() => { setCheckResult(null); }, [formData.geminiApiKey, formData.accessToken, formData.geminiCookie, formData.model]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleGoogleLogin = () => {
    if (!formData.googleClientId) {
        alert("请先在下方配置 Google Client ID");
        return;
    }
    const redirectUri = window.location.href.split('#')[0];
    const scope = "https://www.googleapis.com/auth/generativelanguage";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${formData.googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleCheckConnectivity = async (type: 'api' | 'token' | 'cookie') => {
    setCheckingType(type);
    setCheckResult(null);
    
    const apiKey = type === 'api' ? formData.geminiApiKey : '';
    const cookie = type === 'cookie' ? formData.geminiCookie : '';
    const token = type === 'token' ? formData.accessToken : '';
    
    const success = await checkGeminiConnectivity(
        apiKey, 
        formData.baseUrl, 
        cookie,
        token,
        formData.model
    );
    
    setCheckResult({ type, status: success ? 'success' : 'error' });
    setCheckingType(null);
  };

  const copyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("日志已复制");
  };

  const clearLogs = () => {
      logger.clear();
      setLogs([]);
  };

  // Log Viewer Sub-component
  if (showLogs) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1e293b]">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-green-400" />
                        <h2 className="text-sm font-bold text-white font-mono">SYSTEM LOGS</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={copyLogs} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded" title="复制日志">
                            <Copy size={16} />
                        </button>
                        <button onClick={clearLogs} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded" title="清空日志">
                            <Trash size={16} />
                        </button>
                        <button onClick={() => setShowLogs(false)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-black font-mono text-xs scrollbar-thin">
                    {logs.length === 0 ? (
                        <div className="text-gray-600 text-center mt-10">暂无日志记录</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="mb-3 border-b border-white/5 pb-2 last:border-0">
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-500 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={`font-bold px-1 rounded text-[10px] ${
                                        log.level === 'ERROR' ? 'bg-red-900/50 text-red-400' : 
                                        log.level === 'WARN' ? 'bg-yellow-900/50 text-yellow-400' : 
                                        'bg-blue-900/50 text-blue-400'
                                    }`}>
                                        {log.level}
                                    </span>
                                    <span className="text-gray-300 flex-1 break-all">{log.message}</span>
                                </div>
                                {log.details && (
                                    <pre className="mt-1 ml-20 text-gray-500 bg-[#111] p-2 rounded overflow-x-auto border border-white/5">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      );
  }

  const CheckButton = ({ type, disabled }: { type: 'api' | 'token' | 'cookie', disabled: boolean }) => {
      const isThisChecking = checkingType === type;
      const result = checkResult?.type === type ? checkResult.status : null;
      
      return (
        <button 
            onClick={() => handleCheckConnectivity(type)}
            disabled={disabled || checkingType !== null}
            className={`px-3 py-2 rounded-lg flex items-center justify-center transition-all min-w-[80px] ${
                result === 'success' ? 'bg-green-600 hover:bg-green-500 text-white' :
                result === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' :
                'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={`检查 ${type} 可用性`}
        >
            {isThisChecking ? <Loader2 size={16} className="animate-spin" /> : 
             result === 'success' ? <CheckCircle2 size={16} /> : 
             result === 'error' ? <AlertTriangle size={16} /> :
             "验证"}
        </button>
      );
  };

  // Tutorial Component
  const TutorialView = () => (
      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          {/* Method 1: OAuth */}
          <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5">
              <h3 className="text-blue-400 font-bold text-base mb-3 flex items-center gap-2">
                  <Fingerprint size={18} /> 方式一：如何获取 Google Client ID？
              </h3>
              <p className="text-gray-400 text-xs mb-3">
                  推荐！此方法可免费使用 Gemini 3.0 Pro 模型。
              </p>
              <ol className="list-decimal list-outside pl-4 space-y-2 text-gray-300">
                  <li>
                      访问 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 hover:underline inline-flex items-center">Google Cloud Console <ExternalLink size={10} className="ml-0.5" /></a> 并创建一个新项目。
                  </li>
                  <li>进入 <strong>APIs & Services</strong> {'>'} <strong>Credentials</strong>。</li>
                  <li>点击 <strong>Create Credentials</strong>，选择 <strong>OAuth client ID</strong>。</li>
                  <li>
                      应用类型选择 <strong>Web application</strong>。
                  </li>
                  <li className="bg-blue-900/20 p-2 rounded border border-blue-500/20 text-blue-200">
                      <strong>关键步骤：</strong> 在 "Authorized redirect URIs" 中添加您当前的网站地址。
                      <br />
                      <span className="text-[10px] opacity-70">例如：{window.location.href.split('#')[0]}</span>
                  </li>
                  <li>创建完成后，复制 <strong>Client ID</strong> 填入配置页即可。</li>
              </ol>
          </div>

          {/* Method 2: API Key */}
          <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5">
              <h3 className="text-emerald-400 font-bold text-base mb-3 flex items-center gap-2">
                  <Key size={18} /> 方式二：如何获取 API Key？
              </h3>
              <p className="text-gray-400 text-xs mb-2">
                  最简单，但免费版有配额限制 (Gemini Flash 推荐)。
              </p>
              <ul className="list-disc list-outside pl-4 space-y-2">
                  <li>
                      访问 <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-emerald-400 hover:underline inline-flex items-center">Google AI Studio <ExternalLink size={10} className="ml-0.5" /></a>。
                  </li>
                  <li>点击 "Create API key" 按钮。</li>
                  <li>将生成的 Key 粘贴到配置页的 "API Key" 输入框中。</li>
              </ul>
          </div>

           {/* Method 3: Cookie */}
           <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5">
              <h3 className="text-purple-400 font-bold text-base mb-3 flex items-center gap-2">
                  <Cookie size={18} /> 方式三：如何使用 Cookie？
              </h3>
              <p className="text-gray-400 text-xs mb-2">
                  适合有 Gemini 官网 (gemini.google.com) 账号的用户。
              </p>
              <ol className="list-decimal list-outside pl-4 space-y-2">
                  <li>在浏览器中登录 <a href="https://gemini.google.com" target="_blank" className="text-purple-400 hover:underline">gemini.google.com</a>。</li>
                  <li>按 <kbd className="bg-gray-700 px-1 rounded">F12</kbd> 打开开发者工具，切换到 <strong>Network</strong> (网络) 标签。</li>
                  <li>刷新页面，找到任意一个请求（如 <code>batchexecute</code>）。</li>
                  <li>在 Request Headers 中找到 <strong>Cookie</strong> 字段。</li>
                  <li>复制整个 Cookie 字符串（包含 <code>__Secure-1PSID</code> 等）。</li>
                  <li className="text-yellow-400 text-xs">
                      注意：使用 Cookie 通常需要配置反代 Base URL 来解决跨域问题。
                  </li>
              </ol>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4 md:p-0">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-white/5 flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1e293b]/50 flex-shrink-0">
          <div className="flex items-center gap-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings size={18} className="text-blue-400" />
                设置
              </h2>
              <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => setActiveTab('config')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'config' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    配置
                  </button>
                  <button 
                    onClick={() => setActiveTab('tutorial')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                        activeTab === 'tutorial' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <BookOpen size={12} />
                    教程
                  </button>
              </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1">
          
            {activeTab === 'tutorial' ? (
                <TutorialView />
            ) : (
                <>
                    {/* Model Settings */}
                    <div className="space-y-5">
                        <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">核心配置</h3>

                        {/* Model Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                                <Settings size={14} /> 模型版本
                            </label>
                            <select 
                                value={formData.model}
                                onChange={e => setFormData({...formData, model: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="gemini-3-pro-preview">Gemini 3.0 Pro (推荐/强推理)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速/稳定)</option>
                            </select>
                        </div>
                        
                        {/* --- Auth Method 1: OAuth --- */}
                        <div className="bg-gray-900/50 rounded-xl p-3 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                                    <Fingerprint size={16} /> 方式一：Google OAuth
                                </div>
                                <button onClick={() => setActiveTab('tutorial')} className="text-[10px] text-blue-400 underline opacity-80 hover:opacity-100">如何获取 ID?</button>
                            </div>
                            
                            {/* Client ID Input */}
                            <div>
                                <label className="text-[10px] text-gray-500 mb-1 block">
                                    Google Client ID (必填)
                                </label>
                                <input 
                                    type="text"
                                    value={formData.googleClientId}
                                    onChange={e => setFormData({...formData, googleClientId: e.target.value})}
                                    placeholder="例如: 12345...apps.googleusercontent.com"
                                    className="w-full bg-black/30 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Login Button */}
                            <button 
                                onClick={handleGoogleLogin}
                                disabled={!formData.googleClientId}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <LogIn size={14} />
                                {formData.accessToken ? "重新获取 Token" : "登录 Google 获取 Token"}
                            </button>

                            {/* Token Input & Verify */}
                            <div className="flex gap-2">
                                <input 
                                    type="password" 
                                    value={formData.accessToken}
                                    onChange={e => setFormData({...formData, accessToken: e.target.value})}
                                    placeholder="Access Token (ya29...)"
                                    className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-blue-500 outline-none"
                                />
                                <CheckButton type="token" disabled={!formData.accessToken} />
                            </div>
                        </div>

                        {/* --- Auth Method 2: API Key --- */}
                        <div className="bg-gray-900/50 rounded-xl p-3 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                                    <Key size={16} /> 方式二：API Key
                                </div>
                                <button onClick={() => setActiveTab('tutorial')} className="text-[10px] text-emerald-400 underline opacity-80 hover:opacity-100">获取 Key</button>
                            </div>
                             <div className="flex gap-2">
                                <input 
                                    type="password" 
                                    value={formData.geminiApiKey}
                                    onChange={e => setFormData({...formData, geminiApiKey: e.target.value})}
                                    placeholder={process.env.API_KEY ? "环境变量已配置" : "输入 AI Studio API Key"}
                                    className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-emerald-500 outline-none"
                                />
                                <CheckButton type="api" disabled={!formData.geminiApiKey} />
                            </div>
                        </div>

                        {/* --- Auth Method 3: Cookie --- */}
                        <div className="bg-gray-900/50 rounded-xl p-3 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                                    <Cookie size={16} /> 方式三：Cookie
                                </div>
                                <button onClick={() => setActiveTab('tutorial')} className="text-[10px] text-purple-400 underline opacity-80 hover:opacity-100">如何获取?</button>
                            </div>
                            <div className="flex gap-2 items-start">
                                 <textarea
                                    value={formData.geminiCookie}
                                    onChange={e => setFormData({...formData, geminiCookie: e.target.value})}
                                    placeholder="粘贴完整 Cookie 字符串..."
                                    className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-purple-500 outline-none min-h-[50px] scrollbar-thin"
                                />
                                <CheckButton type="cookie" disabled={!formData.geminiCookie} />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">高级网络配置</h3>
                         <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                                <Globe size={14} /> Base URL (代理地址)
                            </label>
                            <input 
                                type="text" 
                                value={formData.baseUrl}
                                onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                                placeholder="https://generativelanguage.googleapis.com"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                            />
                         </div>
                    </div>

                    {/* UI Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">界面体验</h3>
                         <div className="flex gap-4">
                             <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Monitor size={14} /> 字体大小
                                </label>
                                <select 
                                    value={formData.textSize}
                                    onChange={e => setFormData({...formData, textSize: e.target.value as any})}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="small">紧凑</option>
                                    <option value="normal">标准</option>
                                    <option value="large">大号</option>
                                </select>
                             </div>
                             <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                                    <Volume2 size={14} /> 朗读速度
                                </label>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="2.5" 
                                    step="0.1" 
                                    value={formData.ttsSpeed}
                                    onChange={e => setFormData({...formData, ttsSpeed: parseFloat(e.target.value)})}
                                    className="w-full h-2 mt-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                             </div>
                         </div>
                    </div>
                </>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5 flex justify-between gap-3 bg-[#1e293b]/30 flex-shrink-0">
          <button 
            onClick={() => setShowLogs(true)}
            className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-1"
            title="查看系统日志"
          >
             <FileText size={14} /> 日志
          </button>
          
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
                关闭
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
            >
                <Save size={16} /> 保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
