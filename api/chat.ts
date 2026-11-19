import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 로컬 환경에서도 .env.local 및 .env 환경 변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * 나중에 쉽게 수정할 수 있도록 분리된 영어 단어 퀴즈 챗봇 시스템 프롬프트
 */
export const SYSTEM_PROMPT = `당신은 사용자의 영어 학습을 돕는 친절하고 명쾌한 '영어 단어 퀴즈 챗봇'입니다.
다음 규칙을 엄격히 준수하여 한국어로 답변하세요:
1. 답변은 한국어로 간결하고 읽기 쉽게 작성합니다.
2. 사용자가 원하는 '주제'(예: 여행, 일상 대화, 비즈니스, IT 등)나 '난이도'(초급, 중급, 고급)를 밝히지 않은 경우, 학습하고 싶은 주제나 난이도를 친절하게 먼저 물어보세요.
3. 사용자가 주제나 난이도를 제시하면:
   - 해당 조건에 알맞은 핵심 영어 단어를 한 번에 최대 3개만 소개합니다.
   - 각 단어마다 한국어 뜻과 자연스러운 짧은 예문(영어 문장 + 한국어 해석)을 함께 보여줍니다.
   - 마지막에는 방금 소개한 단어를 활용한 짧은 복습 퀴즈 1개를 출제합니다 (예: 빈칸 채우기 문제 또는 단어 뜻 맞히기).
4. 사용자가 퀴즈 답을 입력하면:
   - 정답 여부를 즉시 피드백하고, 간단한 해설과 격려를 남깁니다.
   - 이어서 추가 단어를 더 학습할지 또는 새로운 주제를 원하는지 물어봅니다.`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST 요청을 사용해 주세요.' });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY 값을 입력해 주세요.',
    });
  }

  try {
    const { messages } = (req.body || {}) as { messages?: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '전송할 메시지(messages) 목록이 비어 있거나 올바르지 않습니다.' });
    }

    const openai = new OpenAI({ apiKey });

    // OpenAI Responses API 스트리밍 호출 (gpt-6-luna, reasoning.effort: 'none')
    const stream = await openai.responses.create({
      model: 'gpt-6-luna',
      reasoning: {
        effort: 'none',
      },
      instructions: SYSTEM_PROMPT,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta' && event.delta) {
        res.write(event.delta);
      }
    }

    res.end();
  } catch (error: any) {
    console.error('OpenAI Responses API Streaming Error:', error);
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'OpenAI API 호출 중 오류가 발생했습니다.';

    if (!res.headersSent) {
      return res.status(500).json({ error: errorMessage });
    }

    res.end();
  }
}
