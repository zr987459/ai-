export const MODELS = {
  GEMINI_PRO: 'gemini-3-pro-preview',
  GEMINI_FLASH: 'gemini-2.5-flash',
  GEMINI_FLASH_LITE: 'gemini-2.5-flash-lite-preview-02-05',
};

export const STORAGE_KEYS = {
  GEMINI_HISTORY: 'gemini_chat_history_v2',
  DOUBAO_HISTORY: 'doubao_chat_history_v2',
  SETTINGS: 'app_settings_v2_1', // Incremented version
  ACTIVE_TAB: 'app_active_tab',
};

export const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiCookie: '',
  model: MODELS.GEMINI_PRO,
  baseUrl: '',
  
  doubaoCookie: '',
  
  textSize: 'normal' as const,
  enableTTS: false,
  ttsSpeed: 1.2,
  customHeaders: '',
};