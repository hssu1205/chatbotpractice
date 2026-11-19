export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatApiResponse {
  reply?: string;
  error?: string;
}

/**
 * 프런트엔드에서 서버리스 엔드포인트 /api/chat을 스트리밍 방식으로 호출하는 함수
 * 청크 단위로 텍스트가 수신될 때마다 onChunk 콜백을 호출하여 실시간 타이핑 효과를 구현합니다.
 */
export async function sendChatMessageStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<string> {
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

  if (!response.body) {
    throw new Error('응답 스트림을 읽을 수 없습니다.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);
  }

  return fullText;
}
