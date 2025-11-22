import { GoogleGenAI } from "@google/genai";
import { Message, MessageRole, Attachment, GroundingMetadata } from "../types";

interface StreamParams {
  model: string;
  history: Message[];
  newMessage: string;
  attachments: Attachment[];
  useSearch: boolean;
  signal?: AbortSignal;
  onStream: (text: string, metadata?: GroundingMetadata) => void;
}

export const streamGeminiResponse = async ({
  model,
  history,
  newMessage,
  attachments,
  useSearch,
  signal,
  onStream
}: StreamParams) => {
  
  // API Key must be obtained exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY
  });

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