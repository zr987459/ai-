import { GoogleGenAI } from "@google/genai";
import { Message, MessageRole, Attachment, GroundingMetadata } from "../types";
import { COOKIE_AUTH_PLACEHOLDER } from "../constants";

interface StreamParams {
  model: string;
  history: Message[];
  newMessage: string;
  attachments: Attachment[];
  useSearch: boolean;
  apiKey?: string;
  baseUrl?: string;
  cookie?: string;
  customHeaders?: string;
  signal?: AbortSignal;
  onStream: (text: string, metadata?: GroundingMetadata) => void;
}

// Helper to construct headers and client options
const getClientConfig = (apiKey?: string, baseUrl?: string, cookie?: string, customHeadersStr?: string) => {
  const headers: Record<string, string> = {};
  
  if (cookie) {
    headers['Cookie'] = cookie;
    // Often required when using cookies directly against certain endpoints or proxies
    // headers['x-goog-api-client'] = 'genai-js/0.1.0'; 
  }

  if (customHeadersStr) {
    try {
      const parsed = JSON.parse(customHeadersStr);
      Object.assign(headers, parsed);
    } catch (e) {
      console.warn("Failed to parse custom headers", e);
    }
  }

  // Use provided key, fallback to env, or use placeholder if cookie exists
  // The SDK requires *some* apiKey string to initialize, even if the backend relies on the Cookie.
  const finalApiKey = apiKey || process.env.API_KEY || (cookie ? COOKIE_AUTH_PLACEHOLDER : "");
  
  if (!finalApiKey) {
    throw new Error("未配置 API Key 或 Cookie。请在设置中配置。");
  }

  const clientOptions: any = { apiKey: finalApiKey };
  if (baseUrl) clientOptions.baseUrl = baseUrl;

  // The SDK uses `requestOptions` in method calls to pass headers
  const requestOptions = {
    customHeaders: headers,
    timeout: 60000,
  };

  return { client: new GoogleGenAI(clientOptions), requestOptions };
};

export const checkGeminiConnectivity = async (apiKey: string, baseUrl?: string, cookie?: string, model?: string): Promise<boolean> => {
  try {
    const { client, requestOptions } = getClientConfig(apiKey, baseUrl, cookie);
    // Use the selected model for checking, default to flash if not specified
    const targetModel = model || 'gemini-2.5-flash';
    
    await client.models.generateContent({
      model: targetModel,
      contents: 'Ping',
      config: {
          responseMimeType: 'text/plain'
      }
    }, {
        ...requestOptions,
        timeout: 15000 // Slightly longer timeout for Pro models
    });
    return true;
  } catch (error) {
    console.error("Connectivity check failed:", error);
    return false;
  }
};

export const streamGeminiResponse = async ({
  model,
  history,
  newMessage,
  attachments,
  useSearch,
  apiKey,
  baseUrl,
  cookie,
  customHeaders,
  signal,
  onStream
}: StreamParams) => {
  
  try {
    const { client, requestOptions } = getClientConfig(apiKey, baseUrl, cookie, customHeaders);

    const historyParts = history
      .filter(msg => !msg.isError && msg.role !== MessageRole.System) 
      .map(msg => ({
        role: msg.role === MessageRole.User ? 'user' : 'model',
        parts: msg.attachments && msg.attachments.length > 0 
          ? [
              ...msg.attachments.map(a => ({
                inlineData: { mimeType: a.mimeType, data: a.data }
              })),
              { text: msg.content }
            ]
          : [{ text: msg.content }]
      }));

    const contents = [
      ...historyParts,
      {
        role: 'user',
        parts: [
          ...attachments.map(a => ({
              inlineData: { mimeType: a.mimeType, data: a.data }
          })),
          { text: newMessage }
        ]
      }
    ];

    const systemInstruction = "You are a helpful AI assistant. When asked to create web interfaces, games, or visualizations, ALWAYS provide a SINGLE, SELF-CONTAINED HTML file. Include all CSS (inside <style>) and JavaScript (inside <script>) within that same HTML file. Do not separate them into different code blocks. This ensures the user can preview it immediately.";

    const result = await client.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        systemInstruction: systemInstruction,
      }
    }, {
        ...requestOptions,
        signal: signal as any
    });

    let fullText = "";
    let groundingMetadata: GroundingMetadata | undefined = undefined;

    for await (const chunk of result) {
      if (signal?.aborted) {
        throw new Error("Generation stopped.");
      }

      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
      }
      
      if (chunk.candidates?.[0]?.groundingMetadata) {
         groundingMetadata = chunk.candidates[0].groundingMetadata as GroundingMetadata;
      }

      onStream(fullText, groundingMetadata);
    }
  } catch (error: any) {
    if (signal?.aborted) return;

    console.error("Gemini API Error:", error);
    
    let errorMessage = error.message || "未知错误";
    
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("配额已耗尽 (429)。请尝试在设置中切换模型为 Gemini 2.5 Flash，或者稍后重试。");
    }

    try {
        const openBrace = errorMessage.indexOf('{');
        if (openBrace !== -1) {
            const jsonPart = JSON.parse(errorMessage.substring(openBrace));
            if (jsonPart.error) {
                if (jsonPart.error.code === 429 || jsonPart.error.status === "RESOURCE_EXHAUSTED") {
                    throw new Error("配额已耗尽 (429)。免费版 API 调用过于频繁，建议切换至 Gemini 2.5 Flash 模型。");
                }
                errorMessage = `${jsonPart.error.message} (${jsonPart.error.code})`;
            }
        }
    } catch (e) { }

    throw new Error(errorMessage);
  }
};