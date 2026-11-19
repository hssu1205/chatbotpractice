export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatApiResponse {
  reply?: string;
  error?: string;
}

/**
 * 프런트엔드에서 서버리스 엔드포인트 /api/chat을 호출하는 함수
 * 실제 API Key는 서버 환경 변수에서 안전하게 처리됩니다.
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let errorDetail = '서버 응답 오류가 발생했습니다.';
    try {
      const data: ChatApiResponse = await response.json();
      if (data.error) {
        errorDetail = data.error;
      }
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  const data: ChatApiResponse = await response.json();
  return data.reply ?? '';
}
