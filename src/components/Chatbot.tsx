import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessageStream, type ChatMessage } from '../api/chat';
import './Chatbot.css';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    '안녕하세요! 🎓 **영어 단어 퀴즈 챗봇**입니다.\n\n원하시는 **주제**와 **난이도**를 아래 버튼에서 선택하시거나, 직접 입력창에 말씀해 주세요!\n조건에 꼭 맞는 핵심 단어 3개와 복습 퀴즈를 준비해 드릴게요. 😊',
};

const TOPICS = [
  '일상 회화',
  '비즈니스 영어',
  '공항/여행 영어',
  '토익/수능 필수 단어',
];

const LEVELS = ['초급', '중급', '고급'];

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedTopic]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || isLoading || isStreaming) return;

    // 메시지 전송 시 선택 단계 초기화
    setSelectedTopic(null);

    const userMessage: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInputValue('');
    setErrorMessage(null);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      let isFirstChunk = true;

      // 스트리밍 방식으로 청크를 받아 실시간 렌더링
      await sendChatMessageStream(newMessages, (chunk) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          setIsLoading(false); // 첫 청크 수신 시 로딩 애니메이션 해제
          setMessages((prev) => [...prev, { role: 'assistant', content: chunk }]);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk,
              };
            }
            return updated;
          });
        }
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // 1단계: 주제 선택 시
  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
  };

  // 2단계: 난이도 선택 시 -> 지정된 포맷으로 /api/chat 전송
  const handleSelectLevel = (level: string) => {
    if (!selectedTopic) return;
    const formattedMessage = `주제: ${selectedTopic}\n난이도: ${level}\n위 조건에 맞는 영어 단어 퀴즈를 시작해줘.`;
    handleSendMessage(formattedMessage);
  };

  // 주제 선택 취소 (다시 1단계로)
  const handleCancelTopic = () => {
    setSelectedTopic(null);
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
      setSelectedTopic(null);
    }
  };

  const isBusy = isLoading || isStreaming;

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
          disabled={isBusy}
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

      {/* 단계별 추천 선택 영역 (1단계: 주제 선택 -> 2단계: 난이도 선택) */}
      {messages.length <= 2 && (
        <div className="quick-prompts-container">
          {selectedTopic === null ? (
            <>
              <span className="quick-prompt-label">💡 1단계 주제 선택:</span>
              <div className="quick-prompt-chips">
                {TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-prompt-chip"
                    onClick={() => handleSelectTopic(topic)}
                    disabled={isBusy}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="selected-topic-bar">
                <span className="quick-prompt-label">🎯 2단계 난이도 선택:</span>
                <span className="selected-topic-tag">
                  주제: <strong>{selectedTopic}</strong>
                </span>
                <button
                  type="button"
                  className="quick-prompt-back-btn"
                  onClick={handleCancelTopic}
                  disabled={isBusy}
                  title="다른 주제 선택하기"
                >
                  ← 주제 변경
                </button>
              </div>
              <div className="quick-prompt-chips">
                {LEVELS.map((level, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-prompt-chip quick-prompt-level-chip"
                    onClick={() => handleSelectLevel(level)}
                    disabled={isBusy}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 입력 영역 (직접 입력 기능 유지) */}
      <footer className="chatbot-footer">
        <div className="input-box-wrapper">
          <textarea
            ref={textareaRef}
            className="chatbot-textarea"
            placeholder="주제(예: 여행, 비즈니스)를 직접 입력하거나 퀴즈 정답을 입력하세요... (Enter로 전송)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isBusy}
          />
          <button
            type="button"
            className="chatbot-send-btn"
            onClick={() => handleSendMessage()}
            disabled={isBusy || !inputValue.trim()}
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
