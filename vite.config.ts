import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';

// 로컬 환경 변수 로드 (.env.local 우선)
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * 로컬 Vite 개발 서버(npm run dev)에서 Vercel Serverless Function(/api/chat)을
 * 동일하게 에뮬레이션할 수 있도록 지원하는 Vite 플러그인
 */
function vercelDevServerPlugin(): Plugin {
  return {
    name: 'vercel-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/chat') {
          try {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }

            let parsedBody = {};
            if (bodyStr) {
              try {
                parsedBody = JSON.parse(bodyStr);
              } catch {
                parsedBody = {};
              }
            }

            // Vercel Serverless Function(req, res) 규격에 맞게 헬퍼 메서드 주입
            const vercelReq = Object.assign(req, {
              body: parsedBody,
              query: {},
              cookies: {},
            });

            const vercelRes = Object.assign(res, {
              status: (code: number) => {
                res.statusCode = code;
                return vercelRes;
              },
              json: (data: unknown) => {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(data));
                return vercelRes;
              },
              send: (data: unknown) => {
                res.end(typeof data === 'string' ? data : JSON.stringify(data));
                return vercelRes;
              },
            });

            // Vite의 ssrLoadModule을 통해 프로젝트 루트의 api/chat.ts 실행
            const chatModule = await server.ssrLoadModule('/api/chat.ts');
            if (typeof chatModule.default === 'function') {
              await chatModule.default(vercelReq, vercelRes);
            } else {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'api/chat.ts의 기본 핸들러를 찾을 수 없습니다.' }));
            }
          } catch (err: unknown) {
            console.error('로컬 /api/chat 처리 중 오류:', err);
            const msg = err instanceof Error ? err.message : '서버 오류';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: msg }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelDevServerPlugin()],
});
