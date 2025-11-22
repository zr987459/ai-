import { GoogleGenAI } from "@google/genai";
import { Message, MessageRole, Attachment, GroundingMetadata } from "../types";

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

const createClient = (apiKey?: string, baseUrl?: string, cookie?: string, customHeadersStr?: string) => {
  const headers: Record<string, string> = {};
  
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  if (customHeadersStr) {
    try {
      const parsed = JSON.parse(customHeadersStr);
      Object.assign(headers, parsed);
    } catch (e) {
      console.warn("Failed to parse custom headers", e);
    }
  }

  // Use provided key or fallback to env
  const finalApiKey = apiKey || process.env.API_KEY;
  
  if (!finalApiKey) {
    throw new Error("未配置 API Key。请在设置中配置或检查环境变量。");
  }

  // Note: The @google/genai SDK constructor options might vary by version. 
  // Assuming standard options object: { apiKey, baseUrl }
  // If baseUrl is not directly supported by your version's constructor, it might need a custom transport or different config.
  // For this implementation, we assume standard object support.
  const options: any = { apiKey: finalApiKey };
  if (baseUrl) options.baseUrl = baseUrl;

  const client = new GoogleGenAI(options);
  
  // If headers need to be injected, usually it's done via request interception or fetch options.
  // The SDK doesn't always expose a global headers setter.
  // However, we can try to pass it if the SDK supports it, or relying on browser proxy handling for cookies.
  // For this specific codebase, we will proceed with standard instantiation.
  
  return client;
};

export const checkGeminiConnectivity = async (apiKey: string, baseUrl?: string): Promise<boolean> => {
  try {
    const ai = createClient(apiKey, baseUrl);
    // Simple generation to test connectivity
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping',
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
  
  const ai = createClient(apiKey, baseUrl, cookie, customHeaders);

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

  const result = await ai.models.generateContentStream({
    model: model,
    contents: contents,
    config: {
      tools: useSearch ? [{ googleSearch: {} }] : undefined,
    }
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
};