export const MODELS = {
  GEMINI_PRO: 'gemini-3-pro-preview',
  GEMINI_FLASH: 'gemini-2.5-flash',
  GEMINI_FLASH_LITE: 'gemini-2.5-flash-lite-preview-02-05',
};

export const STORAGE_KEYS = {
  GEMINI_HISTORY: 'gemini_chat_history_v4',
  SETTINGS: 'app_settings_v4',
};

// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = "547392155908-4kv6u2k3Ww4f1p3c5e7r8t9u0.apps.googleusercontent.com";

export const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiCookie: '',
  accessToken: '',
  model: MODELS.GEMINI_FLASH,
  baseUrl: '',
  
  textSize: 'normal' as const,
  enableTTS: false,
  ttsSpeed: 1.2,
  customHeaders: '',
};

export const COOKIE_AUTH_PLACEHOLDER = 'COOKIE_AUTH_ENABLED';
export const OAUTH_AUTH_PLACEHOLDER = 'OAUTH_AUTH_ENABLED';