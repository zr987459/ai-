import React, { useState } from 'react';
import { X, Save, Settings, Monitor, Volume2, Key, Globe, CheckCircle2, AlertTriangle, Loader2, Cookie } from 'lucide-react';
import { AppSettings } from '../types';
import { checkGeminiConnectivity } from '../services/geminiService';

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

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleCheckConnectivity = async () => {
    if (!formData.geminiApiKey && !formData.geminiCookie) {
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
        formData.model
    );
    
    setCheckStatus(success ? 'success' : 'error');
    setIsChecking(false);
  };

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
                <h3 className="text-sm font-bold text-gray-300 border-b border-white/5 pb-2">模型配置</h3>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Settings size={14} /> 模型版本
                    </label>
                    <select 
                        value={formData.model}
                        onChange={e => {
                            setFormData({...formData, model: e.target.value});
                            setCheckStatus('idle'); // Reset check when model changes
                        }}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="gemini-3-pro-preview">Gemini 3.0 Pro (强推理/需权限)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速/稳定)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Key size={14} /> API Key
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={formData.geminiApiKey}
                            onChange={e => {
                                setFormData({...formData, geminiApiKey: e.target.value});
                                setCheckStatus('idle');
                            }}
                            placeholder={process.env.API_KEY ? "已通过环境变量配置" : "输入 Gemini API Key (或仅使用 Cookie)"}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                        />
                        <button 
                            onClick={handleCheckConnectivity}
                            disabled={isChecking || (!formData.geminiApiKey && !formData.geminiCookie)}
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
                    {checkStatus === 'error' && <p className="text-red-400 text-xs mt-1">连接失败，请检查 API Key、Cookie 或配额</p>}
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
                    <p className="text-[10px] text-gray-500 mt-1">若使用 Cookie，通常需配置反向代理地址以避免 CORS 错误。</p>
                 </div>
                 <div>
                     <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Cookie size={14} /> Google AI Studio Cookie
                    </label>
                    <textarea
                        value={formData.geminiCookie}
                        onChange={e => {
                            setFormData({...formData, geminiCookie: e.target.value});
                            setCheckStatus('idle');
                        }}
                        placeholder="粘贴完整的 Cookie 字符串 (用于特定环境或 Gemini 3.0 验证)..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 min-h-[80px] font-mono text-xs"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">可用于绕过 API Key 限制或使用特定账号权限。请确保您的 Base URL 支持转发 Cookie。</p>
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
        <div className="p-6 pt-4 border-t border-white/5 flex justify-end gap-3 bg-[#1e293b]/30 flex-shrink-0">
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
  );
};

export default SettingsModal;