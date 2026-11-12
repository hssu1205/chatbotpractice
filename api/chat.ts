import OpenAI from 'openai';

// 시스템 프롬프트: 영어 단어 퀴즈 챗봇 지침 (수정하기 쉽도록 별도 상수로 분리)
export const SYSTEM_PROMPT = `당신은 친절하고 효과적인 '영어 단어 퀴즈 챗봇'입니다.
사용자가 영어 단어를 쉽고 재미있게 외울 수 있도록 돕는 역할을 합니다.

[답변 원칙]
1. 답변은 한국어로 친절하고 간결하게 작성하세요.
2. 사용자가 관심 있는 '주제'나 '난이도'를 명시하지 않은 채 대화를 시작하면, 어떤 주제(예: 여행, 비즈니스, 일상 대화, 토익 등)나 난이도(초급, 중급, 고급)를 공부하고 싶은지 먼저 물어보세요.
3. 사용자가 주제나 난이도를 제시하면, 관련된 영어 단어를 한 번에 최대 3개까지만 선정하여 알려주세요.
4. 각 단어마다 아래 구성을 빠짐없이 포함하세요:
   - 영어 단어
   - 한국어 뜻
   - 실생활에서 쓰이는 짧은 영어 예문 및 한글 해석
5. 단어 3개를 안내한 후, 마지막에는 방금 알려준 단어 중 하나를 복습할 수 있는 짧은 퀴즈를 딱 1개만 출제하세요. (예: 빈칸 채우기, 한국어 뜻 보고 단어 맞히기 등)
6. 사용자가 퀴즈에 답을 입력하면, 정답 여부를 피드백해 주고 다음 단어 학습을 이어서 제안하세요.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages?: ChatMessage[];
}

export default async function handler(req: any, res?: any) {
  // Web Standard Request vs Node.js IncomingMessage 지원
  const isWebStandard = typeof Request !== 'undefined' && req instanceof Request;
  const method = isWebStandard ? req.method : req.method;

  if (method !== 'POST') {
    if (isWebStandard) {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 환경 변수에서 OpenAI API Key 읽기
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg =
      'OpenAI API Key가 설정되지 않았습니다. 루트의 .env.local 파일 또는 Vercel 환경 변수에 OPENAI_API_KEY를 입력해 주세요.';
    if (isWebStandard) {
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(401).json({ error: errorMsg });
  }

  try {
    let body: RequestBody;
    if (isWebStandard) {
      body = (await req.json()) as RequestBody;
    } else {
      body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    }

    const { messages = [] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      const errorMsg = '메시지 목록(messages)이 비어 있습니다.';
      if (isWebStandard) {
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return res.status(400).json({ error: errorMsg });
    }

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({ apiKey });

    // Responses API 입력 포맷 변환 (user, assistant)
    const formattedInput = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // OpenAI Responses API 호출 (gpt-6-luna 모델, reasoning.effort = none)
    const response = await openai.responses.create({
      model: 'gpt-6-luna',
      instructions: SYSTEM_PROMPT,
      input: formattedInput,
      reasoning: {
        effort: 'none',
      },
    });

    // 응답 텍스트 추출 (output_text 우선, 없을 시 output 구조 탐색)
    let reply = response.output_text || '';
    if (!reply && response.output) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const part of item.content) {
            if (part.type === 'output_text') {
              reply += part.text;
            }
          }
        }
      }
    }

    if (isWebStandard) {
      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('OpenAI API 호출 에러:', error);
    const errorMessage =
      error?.message || 'OpenAI API 호출 중 오류가 발생했습니다.';

    if (isWebStandard) {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return res.status(500).json({ error: errorMessage });
  }
}
