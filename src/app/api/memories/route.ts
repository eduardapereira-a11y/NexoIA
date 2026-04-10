import { getGeminiModel } from "@/lib/gemini";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    
    // Pegar as últimas mensagens para extrair fatos
    const context = messages.slice(-4).map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const systemInstruction = `Você é um extrator de memórias. Sua tarefa é extrair fatos pessoais, preferências ou informações importantes sobre o usuário a partir da conversa fornecida.
Regras:
1. Retorne APENAS uma lista JSON de strings no formato: ["fato 1", "fato 2"].
2. Resuma cada fato em uma frase curta e direta em português (ex: "O usuário gosta de bolo de chocolate").
3. Se não houver novos fatos relevantes para lembrar, retorne uma lista vazia [].
4. Se o usuário der um comando explícito como "salva na lembrança", "lembre-se que...", "anote que...", VOCÊ DEVE OBRIGATORIAMENTE extrair e salvar a informação solicitada.
5. Em mensagens normais, ignore saudações ou papo furado e foque passivamente em preferências, nomes, locais ou desgostos.
6. RETORNE APENAS O JSON, NADA MAIS.`;

    const model = getGeminiModel(systemInstruction);
    const result = await model.generateContent(`Extraia fatos desta conversa:\n\n${context}`);
    const responseText = result.response.text();

    try {
      // Tentar limpar a resposta caso o modelo coloque markdown
      const jsonStr = responseText.replace(/```json|```/g, "").trim();
      const memories = JSON.parse(jsonStr);
      return new Response(JSON.stringify({ memories }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Failed to parse memory JSON:", responseText);
      return new Response(JSON.stringify({ memories: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Memory Extraction Error:", error);
    return new Response(JSON.stringify({ memories: [], error: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
