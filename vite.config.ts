import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// 로컬 개발 환경에서 /api/chat 요청을 루트의 api/chat.ts로 라우팅하는 플러그인
function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/chat')) {
          return next();
        }

        try {
          // POST body 파싱
          let rawBody = '';
          for await (const chunk of req) {
            rawBody += chunk;
          }

          let parsedBody: any = {};
          if (rawBody.trim()) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }

          (req as any).body = parsedBody;

          // Vercel Response 헬퍼 메서드 주입 (res.status, res.json)
          const mockRes = res as any;
          if (!mockRes.status) {
            mockRes.status = function (code: number) {
              mockRes.statusCode = code;
              return mockRes;
            };
          }
          if (!mockRes.json) {
            mockRes.json = function (data: any) {
              if (!mockRes.headersSent) {
                mockRes.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              mockRes.end(JSON.stringify(data));
              return mockRes;
            };
          }

          // Vite의 ssrLoadModule을 통해 TS 컴파일 및 HMR이 적용된 핸들러 로드
          const mod = await server.ssrLoadModule('/api/chat.ts');
          const handler = mod.default;

          if (typeof handler === 'function') {
            await handler(req, mockRes);
          } else {
            mockRes.status(500).json({ error: 'Handler not found in api/chat.ts' });
          }
        } catch (err: any) {
          console.error('[dev-api] Error handling /api/chat:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env, .env.local 등의 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '');

  // process.env에 OPENAI_API_KEY 전달 (서버리스 함수 및 미들웨어에서 참조)
  if (env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  return {
    plugins: [react(), vercelApiDevPlugin()],
  };
});
