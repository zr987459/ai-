
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Settings, Monitor, Volume2, Key, Globe, CheckCircle2, AlertTriangle, Loader2, Cookie, LogIn, FileText, Trash, Copy } from 'lucide-react';
import { AppSettings } from '../types';
import { checkGeminiConnectivity } from '../services/geminiService';
import { logger, LogEntry } from '../services/loggerService';
import { GOOGLE_CLIENT_ID } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (showLogs) {
        setLogs(logger.getLogs());
    }
  }, [showLogs]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleGoogleLogin = () => {
    const redirectUri = window.location.href.split('#')[0];
    const scope = "https://www.googleapis.com/auth/generativelanguage";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleCheckConnectivity = async () => {
    if (!formData.geminiApiKey && !formData.geminiCookie && !formData.accessToken) {
        setCheckStatus('error');
        return;
    }
    
    setIsChecking(true);
    setCheckStatus('idle');
    
    // Check using the currently selected model to verify specific model availability (e.g. Gemini 3.0)
    const success = await checkGeminiConnectivity(
        formData.geminiApiKey, 
        formData.baseUrl, 
        formData.geminiCookie,
        formData.accessToken,
        formData.model
    );
    
    setCheckStatus(success ? 'success' : 'error');
    setIsChecking(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-white/5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1e293b]/50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            设置
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1">
          
            {/* Model Settings */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">认证配置</h3>
                
                {/* Google Login Block */}
                <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">Gemini 3.0 Pro 免配置授权</span>
                        {formData.accessToken ? (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                <CheckCircle2 size={12} /> 已授权
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500">未授权</span>
                        )}
                    </div>
                    <button 
                        onClick={handleGoogleLogin}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-all shadow-sm"
                    >
                        <LogIn size={16} />
                        {formData.accessToken ? "重新登录 Google 授权" : "一键登录 Google (推荐)"}
                    </button>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        点击登录将跳转至 Google 进行授权。获取的 Token 可直接用于调用 Gemini 3.0 Pro 模型 (200万上下文)，无需配置 API Key。
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Key size={14} /> Access Token (OAuth)
                    </label>
                    <input 
                        type="password" 
                        value={formData.accessToken}
                        onChange={e => {
                            setFormData({...formData, accessToken: e.target.value});
                            setCheckStatus('idle');
                        }}
                        placeholder="登录后自动填充，也可手动粘贴"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Key size={14} /> API Key (备用)
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={formData.geminiApiKey}
                            onChange={e => {
                                setFormData({...formData, geminiApiKey: e.target.value});
                                setCheckStatus('idle');
                            }}
                            placeholder={process.env.API_KEY ? "已通过环境变量配置" : "输入 Gemini API Key"}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                        />
                        <button 
                            onClick={handleCheckConnectivity}
                            disabled={isChecking || (!formData.geminiApiKey && !formData.geminiCookie && !formData.accessToken)}
                            className={`px-3 py-2 rounded-lg flex items-center justify-center transition-all min-w-[80px] ${
                                checkStatus === 'success' ? 'bg-green-600 hover:bg-green-500 text-white' :
                                checkStatus === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' :
                                'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                            }`}
                            title={`检查当前配置对 ${formData.model} 的可用性`}
                        >
                            {isChecking ? <Loader2 size={18} className="animate-spin" /> : 
                             checkStatus === 'success' ? <CheckCircle2 size={18} /> : 
                             checkStatus === 'error' ? <AlertTriangle size={18} /> :
                             "检查"}
                        </button>
                    </div>
                    {checkStatus === 'success' && <p className="text-green-400 text-xs mt-1">连接成功 ({formData.model})</p>}
                    {checkStatus === 'error' && <p className="text-red-400 text-xs mt-1">连接失败，请检查 Token 或网络</p>}
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Settings size={14} /> 模型版本
                    </label>
                    <select 
                        value={formData.model}
                        onChange={e => {
                            setFormData({...formData, model: e.target.value});
                            setCheckStatus('idle'); 
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="gemini-3-pro-preview">Gemini 3.0 Pro (推荐/强推理)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速/稳定)</option>
                    </select>
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
                 <div>
                     <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Cookie size={14} /> Cookie (可选)
                    </label>
                    <textarea
                        value={formData.geminiCookie}
                        onChange={e => {
                            setFormData({...formData, geminiCookie: e.target.value});
                            setCheckStatus('idle');
                        }}
                        placeholder="特定环境使用..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 min-h-[60px] font-mono text-xs"
                    />
                </div>
            </div>

            {/* UI Settings */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">界面体验</h3>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Monitor size={14} /> 字体大小
                    </label>
                    <select 
                        value={formData.textSize}
                        onChange={e => setFormData({...formData, textSize: e.target.value as any})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="small">紧凑 (Small)</option>
                        <option value="normal">标准 (Normal)</option>
                        <option value="large">大号 (Large)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Volume2 size={14} /> 朗读速度 ({formData.ttsSpeed}x)
                    </label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="2.5" 
                        step="0.1" 
                        value={formData.ttsSpeed}
                        onChange={e => setFormData({...formData, ttsSpeed: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                 </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5 flex justify-between gap-3 bg-[#1e293b]/30 flex-shrink-0">
          <button 
            onClick={() => setShowLogs(true)}
            className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-1"
            title="查看系统日志"
          >
             <FileText size={14} /> 系统日志
          </button>
          
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
                取消
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
