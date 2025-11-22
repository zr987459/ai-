import React, { useState } from 'react';
import { X, Save, Settings, Monitor, MessageSquare, Volume2, Key, Globe, CheckCircle2, AlertTriangle, Loader2, Cookie } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'gemini' | 'doubao'>('general');
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleCheckConnectivity = async () => {
    if (!formData.geminiApiKey) {
        setCheckStatus('error');
        return;
    }
    setIsChecking(true);
    setCheckStatus('idle');
    const success = await checkGeminiConnectivity(formData.geminiApiKey, formData.baseUrl);
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

        {/* Tabs */}
        <div className="flex border-b border-white/5 flex-shrink-0">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
                通用
            </button>
            <button 
                onClick={() => setActiveTab('gemini')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'gemini' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
                Gemini
            </button>
            <button 
                onClick={() => setActiveTab('doubao')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'doubao' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:text-gray-200'}`}
            >
                豆包
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-thin flex-1">
          
          {activeTab === 'general' && (
              <div className="space-y-5 animate-fade-in">
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
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Globe size={14} /> Base URL (可选)
                    </label>
                    <input 
                        type="text" 
                        value={formData.baseUrl}
                        onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                        placeholder="https://..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">仅在需要代理时配置，留空则使用默认地址。</p>
                 </div>
              </div>
          )}

          {activeTab === 'gemini' && (
            <div className="space-y-5 animate-fade-in">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Settings size={14} /> 模型版本
                    </label>
                    <select 
                        value={formData.model}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
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
                            placeholder={process.env.API_KEY ? "已通过环境变量配置 (可覆盖)" : "输入 Gemini API Key"}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                        />
                        <button 
                            onClick={handleCheckConnectivity}
                            disabled={isChecking || !formData.geminiApiKey}
                            className={`px-3 py-2 rounded-lg flex items-center justify-center transition-all ${
                                checkStatus === 'success' ? 'bg-green-600 hover:bg-green-500 text-white' :
                                checkStatus === 'error' ? 'bg-red-600 hover:bg-red-500 text-white' :
                                'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                            }`}
                            title="检查连通性"
                        >
                            {isChecking ? <Loader2 size={18} className="animate-spin" /> : 
                             checkStatus === 'success' ? <CheckCircle2 size={18} /> : 
                             checkStatus === 'error' ? <AlertTriangle size={18} /> :
                             "检查"}
                        </button>
                    </div>
                    {checkStatus === 'success' && <p className="text-green-400 text-xs mt-1">连接成功</p>}
                    {checkStatus === 'error' && <p className="text-red-400 text-xs mt-1">连接失败，请检查 Key 或网络</p>}
                </div>

                <div>
                     <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Cookie size={14} /> Cookie (可选)
                    </label>
                    <textarea
                        value={formData.geminiCookie}
                        onChange={e => setFormData({...formData, geminiCookie: e.target.value})}
                        placeholder="如果使用代理需要 Cookie 验证，请在此粘贴..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 min-h-[80px]"
                    />
                </div>
            </div>
          )}

          {activeTab === 'doubao' && (
             <div className="space-y-5 animate-fade-in">
                <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex gap-2 items-start">
                    <MessageSquare size={16} className="text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-300">
                        <p className="mb-1">豆包模型仅需要 Cookie 即可使用。</p>
                        <p className="opacity-70">请在网页版登录豆包后，通过开发者工具获取 Cookie。</p>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <Cookie size={14} /> Cookie
                    </label>
                    <textarea
                        value={formData.doubaoCookie}
                        onChange={e => setFormData({...formData, doubaoCookie: e.target.value})}
                        placeholder="粘贴豆包 Cookie..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 min-h-[100px]"
                    />
                </div>
             </div>
          )}

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