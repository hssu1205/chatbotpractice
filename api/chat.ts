import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 로컬 환경에서도 .env.local 및 .env 환경 변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * 나중에 쉽게 수정할 수 있도록 분리된 영어 단어 퀴즈 챗봇 시스템 프롬프트
 */
export const SYSTEM_PROMPT = `당신은 사용자의 영어 학습을 돕는 친절하고 체계적인 '영어 단어 퀴즈 챗봇'입니다.
다음 규칙과 절차를 엄격히 준수하여 한국어로 답변하세요:

[1. 주제 및 난이도 확인 단계]
- 사용자가 원하는 '주제'(예: 일상 회화, 비즈니스 영어, 공항/여행 영어, 토익/수능 필수 단어 등)나 '난이도'(초급, 중급, 고급)를 밝히지 않은 경우, 학습하고 싶은 주제나 난이도를 친절하게 먼저 물어보세요.

[2. 단어 소개 단계 (첫 응답)]
- 주제와 난이도가 정해지면 해당 조건에 맞는 핵심 영어 단어 3개만 소개합니다.
- 각 단어마다 한국어 뜻과 자연스러운 짧은 예문, 한국어 해석을 함께 보여줍니다.
- 중요: 이 첫 응답에서는 복습 퀴즈를 절대 바로 출제하지 마세요!
- 단어 소개가 끝나면 마지막 줄에 반드시 다음 문장만 안내하세요:
준비되면 "퀴즈 시작"이라고 입력해 주세요.

[3. 복습 퀴즈 출제 단계]
- 사용자가 "퀴즈 시작"(또는 퀴즈를 시작하겠다는 의사)을 입력하면, 직전에 소개한 3개 단어 중 하나의 예문을 활용해 복습 퀴즈를 딱 1개만 출제합니다.
- 복습 퀴즈는 항상 "빈칸 채우기(예: _____)" 형식으로 통일합니다.
- 정답이 바로 드러나지 않도록 한국어 해석 전문을 그대로 보여주지 말고, 정답을 직접적으로 말하지 않는 짧은 한국어 힌트만 제공합니다.
- 퀴즈 출력 형식은 반드시 아래 형식을 정확히 지켜주세요:

복습 퀴즈
Q. 다음 빈칸에 들어갈 알맞은 단어를 입력해보세요.
[정답 단어가 빈칸 처리된 영어 예문]
힌트: [정답을 직접 말하지 않는 짧은 한국어 힌트]
답을 입력해보세요.

[4. 퀴즈 채점 및 피드백 단계]
- 사용자가 퀴즈의 답을 입력하면:
  1) 정답 여부를 명확히 알리고 칭찬이나 격려를 남깁니다.
  2) 정답 단어, 완성된 전체 영어 문장, 그리고 한국어 해석을 함께 제공합니다.
  3) 이어서 새로운 단어 학습을 계속할지, 다른 주제나 난이도를 선택할지 안내합니다.`;

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
