export enum MessageRole {
  User = 'user',
  Model = 'model',
  System = 'system'
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface GroundingMetadata {
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  isStreaming?: boolean;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface AppSettings {
  // Gemini & General
  geminiApiKey: string;
  geminiCookie: string; // Google AI Studio Cookie / Headers
  model: string;
  baseUrl: string;
  
  // UI Prefs
  textSize: 'small' | 'normal' | 'large';
  enableTTS: boolean;
  ttsSpeed: number;
  customHeaders: string;
}
