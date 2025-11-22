
import { GoogleGenAI } from "@google/genai";
import { Message, MessageRole, Attachment, GroundingMetadata } from "../types";
import { COOKIE_AUTH_PLACEHOLDER } from "../constants";
import { logger } from "./loggerService";

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
  
  // Smart Proxy Logic for Cookies
  // If user provides a cookie but NO BaseURL, we assume they are on Vercel (or compatible)
  // and want to use the internal proxy to bypass CORS.
  let finalBaseUrl = baseUrl;
  if (cookie && !finalBaseUrl) {
      // Determine if we are in a browser environment
      if (typeof window !== 'undefined') {
          // Use relative path to trigger the Vercel function
          finalBaseUrl = `${window.location.origin}/api/proxy`;
          logger.info("Auto-configured internal proxy for Cookie usage", { finalBaseUrl });
      }
  }

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  if (customHeadersStr) {
    try {
      const parsed = JSON.parse(customHeadersStr);
      Object.assign(headers, parsed);
    } catch (e) {
      console.warn("Failed to parse custom headers", e);
      logger.warn("Failed to parse custom headers", e);
    }
  }

  // Logic to determine strict API Key requirement of SDK
  // If we have a cookie, we can use a placeholder key because the Headers (Cookie) will authorize the request.
  const finalApiKey = apiKey || process.env.API_KEY || (cookie ? COOKIE_AUTH_PLACEHOLDER : "");
  
  if (!finalApiKey) {
    throw new Error("未配置认证信息。请在设置中配置 API Key 或 Cookie。");
  }

  const clientOptions: any = { apiKey: finalApiKey };
  if (finalBaseUrl) clientOptions.baseUrl = finalBaseUrl;

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
    
    logger.info(`Checking connectivity for model: ${targetModel} with auth params.`);

    await client.models.generateContent({
      model: targetModel,
      contents: 'Ping',
      config: {
          responseMimeType: 'text/plain',
          maxOutputTokens: 5
      }
    }, {
        ...requestOptions,
        timeout: 15000 
    });
    logger.info("Connectivity check passed");
    return true;
  } catch (error: any) {
    console.error("Connectivity check failed:", error);
    logger.error("Connectivity check failed", error);
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
  
  logger.info(`Starting generation`, { model, useSearch, attachmentsCount: attachments.length });

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
    logger.info("Generation completed successfully");
  } catch (error: any) {
    if (signal?.aborted) {
        logger.info("Generation aborted by user");
        return;
    }

    console.error("Gemini API Error:", error);
    logger.error("Gemini API Error", error);
    
    let errorMessage = error.message || "未知错误";
    
    // Enhanced error parsing for logging and UI
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("配额已耗尽 (429)。请尝试在设置中切换模型为 Gemini 2.5 Flash，或者稍后重试。");
    }
    
    if (errorMessage.includes("401") || errorMessage.includes("UNAUTHENTICATED")) {
        throw new Error("认证失败 (401)。API Key 或 Cookie 可能已失效，请检查设置。");
    }

    try {
        const openBrace = errorMessage.indexOf('{');
        if (openBrace !== -1) {
            const jsonPart = JSON.parse(errorMessage.substring(openBrace));
            // Log detailed JSON error
            logger.error("Parsed API Error JSON", jsonPart);

            if (jsonPart.error) {
                if (jsonPart.error.code === 429 || jsonPart.error.status === "RESOURCE_EXHAUSTED") {
                    throw new Error("配额已耗尽 (429)。免费版 API 调用过于频繁，建议切换至 Gemini 2.5 Flash 模型。");
                }
                 if (jsonPart.error.code === 401) {
                    throw new Error("认证失败 (401)。请检查 API Key 或 Cookie。");
                }
                errorMessage = `${jsonPart.error.message} (${jsonPart.error.code})`;
            }
        }
    } catch (e) { 
        logger.warn("Failed to parse error message JSON", e);
    }

    throw new Error(errorMessage);
  }
};
