import { Attachment, GroundingMetadata } from "../types";

interface StreamParams {
  prompt: string;
  attachments: Attachment[];
  cookie: string;
  signal?: AbortSignal;
  onStream: (text: string, metadata?: GroundingMetadata) => void;
  onDone: () => void;
  onError: (err: any) => void;
}

export const streamDoubaoResponse = async ({
  prompt,
  cookie,
  signal,
  onStream,
  onDone,
  onError
}: StreamParams) => {
  try {
    // Simulation of network delay
    await new Promise(r => setTimeout(r, 500));
    
    if (!cookie && !process.env.DOUBAO_COOKIE) {
        // Just a warning in simulation
        console.warn("Doubao cookie is missing");
    }

    // Simulating a streaming response
    const mockResponse = `[豆包模拟响应]\n收到您的消息：“${prompt}”\n\n由于我是运行在纯前端的演示环境中，没有连接到字节跳动的后端代理，因此我正在模拟回复。\n\n**Cookie 状态**: ${cookie ? "已配置 ✅" : "未配置 ❌"}\n\n要使其真正工作，您需要实现一个服务器端路由（例如 Next.js API 路由），该路由调用火山引擎（Ark）API 并将结果流式传输回此客户端。\n\n即便如此，我的界面依然支持 Markdown 渲染、代码高亮和流式打字效果。`;
    
    const chunks = mockResponse.split(/(?=[，。！\n])/); 
    let accumulated = "";

    for (const chunk of chunks) {
        if (signal?.aborted) {
            throw new Error("Generation stopped.");
        }
        
        accumulated += chunk;
        onStream(accumulated);
        // random delay to simulate typing
        await new Promise(r => setTimeout(r, 50 + Math.random() * 80));
    }

    onDone();
  } catch (error: any) {
    if (error.message === "Generation stopped.") return;
    onError(error);
  }
};