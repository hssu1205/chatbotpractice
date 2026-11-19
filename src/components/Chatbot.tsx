import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatMessage } from '../api/chat';
import './Chatbot.css';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    '안녕하세요! 🎓 **영어 단어 퀴즈 챗봇**입니다.\n\n원하시는 **주제**(예: 여행, 비즈니스, 일상 대화, IT)나 **난이도**(초급, 중급, 고급)를 말씀해 주세요!\n주제에 꼭 맞는 핵심 단어 3개와 복습 퀴즈를 준비해 드릴게요. 😊',
};

const QUICK_PROMPTS = [
  '공항 및 여행 영어 (초급)',
  '비즈니스 회의 영어 (중급)',
  '일상 대화 감정 표현 (초급)',
  'IT / 프로그래밍 영단어 (중급)',
  '고급 시사 / 뉴스 단어 (고급)',
];

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInputValue('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // 프런트엔드에서는 오직 /api/chat을 호출
      const reply = await sendChatMessage(newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    if (confirm('대화를 초기화하고 처음부터 다시 시작하시겠습니까?')) {
      setMessages([INITIAL_MESSAGE]);
      setErrorMessage(null);
      setInputValue('');
    }
  };

  return (
    <div className="chatbot-container">
      {/* 챗봇 헤더 */}
      <header className="chatbot-header">
        <div className="chatbot-title-group">
          <div className="chatbot-avatar">📚</div>
          <div>
            <h1 className="chatbot-title">영어 단어 퀴즈 챗봇</h1>
            <p className="chatbot-subtitle">gpt-6-luna 기반 영어 단어 학습 & 복습 퀴즈</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="chatbot-reset-btn"
          title="새 대화 시작"
        >
          새 대화
        </button>
      </header>

      {/* 대화 영역 */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
          >
            {msg.role === 'assistant' && <div className="bot-avatar">🤖</div>}
            <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              <div className="message-content">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-row bot-row">
            <div className="bot-avatar">🤖</div>
            <div className="message-bubble bot-bubble loading-bubble">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="chatbot-error-banner">
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>오류 안내:</strong> {errorMessage}
            </div>
            <button
              type="button"
              className="error-retry-btn"
              onClick={() => handleSendMessage(messages[messages.length - 1]?.content)}
            >
              다시 시도
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 퀵 프롬프트 칩 */}
      {messages.length <= 2 && (
        <div className="quick-prompts-container">
          <span className="quick-prompt-label">💡 추천 주제:</span>
          <div className="quick-prompt-chips">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-prompt-chip"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <footer className="chatbot-footer">
        <div className="input-box-wrapper">
          <textarea
            ref={textareaRef}
            className="chatbot-textarea"
            placeholder="주제(예: 여행, 비즈니스)나 퀴즈 정답을 입력하세요... (Enter로 전송)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            className="chatbot-send-btn"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputValue.trim()}
          >
            전송
          </button>
        </div>
        <p className="chatbot-info-text">
          안전한 서버리스 프록시를 통해 OpenAI API와 통신하며, API 키는 외부에 노출되지 않습니다.
        </p>
      </footer>
    </div>
  );
};
