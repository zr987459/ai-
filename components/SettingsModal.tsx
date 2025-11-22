import React, { useState } from 'react';
import { X, Save, Settings, Monitor, MessageSquare, Volume2 } from 'lucide-react';
import { AppSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'gemini' | 'doubao'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1e293b]/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            设置
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
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
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          
          {activeTab === 'general' && (
              <div className="space-y-5">
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
          )}

          {activeTab === 'gemini' && (
            <div className="space-y-5">
                <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                        API 密钥已通过系统环境变量自动配置。
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                        模型版本
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
            </div>
          )}

          {activeTab === 'doubao' && (
             <div className="space-y-5">
                 <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                        豆包配置（仅供 UI 演示或模拟用途）。
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <MessageSquare size={14} /> 会话 ID
                    </label>
                    <input 
                        type="text" 
                        value={formData.doubaoSessionId}
                        onChange={e => setFormData({...formData, doubaoSessionId: e.target.value})}
                        placeholder="输入会话 ID..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                    />
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/5 flex justify-end gap-3 bg-[#1e293b]/30">
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