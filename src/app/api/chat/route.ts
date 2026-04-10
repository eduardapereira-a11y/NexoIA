import { getGeminiModel } from "@/lib/gemini";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, config, memories } = await req.json();
    const selectedModel = config?.model || "gemini";
    const responseLength = config?.length || "media";

    const lengthMap: Record<string, string> = {
      "extremamente-curta": "Responda de forma EXTREMAMENTE CURTA, no máximo 3 linhas.",
      "curta": "Responda de forma curta, no máximo 10 linhas.",
      "media": "Responda de forma média, no máximo 30 linhas.",
      "grande": "Responda de forma grande e detalhada, no máximo 70 linhas.",
      "enorme": "Responda de forma ENORME e extremamente detalhada, no máximo 150 linhas.",
    };

    const lengthInstruction = lengthMap[responseLength] || "";
    
    // Inject memories into system instruction
    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = `\n\nFatos importantes que você deve lembrar sobre o usuário:\n${memories.map((m: string) => `- ${m}`).join('\n')}`;
    }

    const systemInstruction = `${process.env.BOT_PERSONALITY}${memoryContext}\n\n${lengthInstruction}`;

    try {
      if (selectedModel === "chatgpt") {
        return await handleOpenRouter(messages, systemInstruction);
      }
      return await handleGemini(messages, systemInstruction);
    } catch (modelError) {
      console.warn(`⚠️ ERRO no modelo ${selectedModel}, tentando fallback...`, modelError);
      // Fallback automático se o selecionado falhar
      if (selectedModel === "gemini") {
        return await handleOpenRouter(messages, systemInstruction);
      } else {
        return await handleGemini(messages, systemInstruction);
      }
    }
  } catch (openRouterError: any) {
    console.error("OpenRouter Error:", openRouterError);
    return new Response(JSON.stringify({ error: "Não foi possível processar sua solicitação no momento.", msg: openRouterError?.message || String(openRouterError) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleGemini(messages: any[], systemInstruction: string) {
  const lastMessage = messages[messages.length - 1].content;
  const history = messages.slice(0, -1).map((m: any) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const model = getGeminiModel(systemInstruction);
  const chatSession = model.startChat({
    history: history,
  });

  const result = await chatSession.sendMessageStream(lastMessage);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(encoder.encode(chunkText));
        }
        controller.close();
      } catch (err) {
        console.error("Gemini Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function handleOpenRouter(messages: any[], systemInstruction: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nexoia.app",
      "X-Title": "NexoIA",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b:free",
      messages: [
        { role: "system", content: systemInstruction },
        ...messages.map((m: any) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("OpenRouter body is empty");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

            const data = trimmedLine.replace("data: ", "");
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {
              // Ignorar erros de parse para chunks parciais
            }
          }
        }
        controller.close();
      } catch (err) {
        console.error("OpenRouter Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
