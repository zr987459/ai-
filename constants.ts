
export const MODELS = {
  GEMINI_PRO: 'gemini-3-pro-preview',
  GEMINI_FLASH: 'gemini-2.5-flash',
  GEMINI_FLASH_LITE: 'gemini-2.5-flash-lite-preview-02-05',
};

export const STORAGE_KEYS = {
  GEMINI_HISTORY: 'gemini_chat_history_v4',
  SETTINGS: 'app_settings_v4',
};

export const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiCookie: '',
  model: MODELS.GEMINI_FLASH,
  baseUrl: '',
  
  textSize: 'normal' as const,
  enableTTS: false,
  ttsSpeed: 1.2,
  customHeaders: '',
};

export const COOKIE_AUTH_PLACEHOLDER = 'COOKIE_AUTH_ENABLED';
