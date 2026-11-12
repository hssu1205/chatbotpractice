import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { sendChatMessage, type Message } from '../api/chat';
import './Chatbot.css';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: `안녕하세요! 👋 영어 단어 퀴즈 챗봇입니다.

어떤 주제나 난이도로 영어 단어를 공부해 보고 싶으신가요?
원하시는 주제(예: 여행, 일상, 비즈니스 등)나 난이도(초급/중급/고급)를 편하게 말씀해 주세요!`,
};

const SUGGESTED_TOPICS = [
  '✈️ 여행 영어 (초급)',
  '💼 비즈니스 미팅 (중급)',
  '☕ 카페 및 식당 회화 (초급)',
  '📚 토익 빈출 어휘 (고급)',
];

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 프런트엔드에서는 /api/chat 만 호출 (sendChatMessage 함수 내부)
      // 백엔드 API에 전달할 때는 초기 웰컴 메시지를 제외하고 실제 대화 내역만 전송
      const payloadMessages = nextMessages.filter((m) => m !== INITIAL_MESSAGE);
      const reply = await sendChatMessage(payloadMessages);

      const botMessage: Message = { role: 'assistant', content: reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err?.message || '응답을 받아오는 도중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setErrorMessage(null);
    setInput('');
    textareaRef.current?.focus();
  };

  return (
    <div className="chat-container">
      {/* 헤더 */}
      <header className="chat-header">
        <div className="chat-header-title">
          <span className="chat-header-icon" role="img" aria-label="quiz-bot">
            📝
          </span>
          <div>
            <h1>영어 단어 퀴즈 챗봇</h1>
            <p>원하는 주제와 난이도를 말하고 퀴즈를 풀어보세요!</p>
          </div>
        </div>
        <button
          type="button"
          className="chat-reset-btn"
          onClick={handleReset}
          title="대화 내용 초기화"
        >
          새 대화 시작
        </button>
      </header>

      {/* 메시지 리스트 */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-row ${msg.role}`}>
            <div className="message-avatar" aria-hidden="true">
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="message-bubble">
              {msg.content}
              {/* 첫 번째 안내 메시지 아래에 추천 주제 버튼 제공 */}
              {idx === 0 && (
                <div className="quick-topics">
                  {SUGGESTED_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className="topic-chip"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(topic)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="message-row assistant">
            <div className="message-avatar" aria-hidden="true">
              🤖
            </div>
            <div className="message-bubble">
              <span className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            </div>
          </div>
        )}

        {/* 에러 알림 배너 */}
        {errorMessage && (
          <div className="chat-error-banner" role="alert">
            <span>⚠️ {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)}>
              닫기
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <form className="chat-input-form" onSubmit={onSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={input}
          placeholder="주제(예: 공항, 호텔), 난이도 또는 퀴즈 정답을 입력하세요... (Enter: 전송)"
          rows={1}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '생성 중...' : '전송'}
        </button>
      </form>
    </div>
  );
}

export default Chatbot;

