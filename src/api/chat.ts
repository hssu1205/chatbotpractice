export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatErrorResponse {
  error: string;
}

/**
 * 백엔드 서버 함수(/api/chat)로 대화 메시지들을 전송하고 챗봇 응답을 받아옵니다.
 */
export async function sendChatMessage(messages: Message[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = (data as ChatErrorResponse)?.error || `서버 오류가 발생했습니다 (${response.status})`;
    throw new Error(errorMsg);
  }

  return (data as ChatResponse).reply;
}

