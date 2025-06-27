import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // ⚡ localhost yerine 127.0.0.1 (daha güvenilir)
        changeOrigin: true,
        secure: false,
        timeout: 60000, // ⚡ 60 saniye timeout (uzatıldı)
        proxyTimeout: 60000, // ⚡ Proxy timeout eklendi
        rewrite: (path) => path, // ✅ Path rewrite eklendi
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 [PROXY] Error:', err.code, err.message);
            console.log('🚨 [PROXY] Failed URL:', req.url);
            console.log('🚨 [PROXY] Target:', 'http://127.0.0.1:8000' + req.url);

            // Fallback response - sadece header gönderilmemişse
            if (!res.headersSent) {
              try {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*', // ⚡ Wildcard için daha uyumlu
                  'Access-Control-Allow-Credentials': 'true',
                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
                });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Backend sunucusuna bağlanılamıyor - Proxy hatası',
                  details: err.message,
                  code: err.code || 'PROXY_ERROR',
                  timestamp: new Date().toISOString()
                }));
              } catch (writeError) {
                console.log('🚨 [PROXY] Error response yazılamadı:', writeError.message);
              }
            }
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 [PROXY] Request:', req.method, req.url);
            console.log('📤 [PROXY] Forwarding to:', 'http://127.0.0.1:8000' + req.url);

            // Timeout ayarları - REQUEST LEVEL
            proxyReq.setTimeout(60000); // ⚡ 60 saniye request timeout

            // CORS ve Auth headers ekle
            proxyReq.setHeader('Origin', 'http://localhost:3000');
            proxyReq.setHeader('Host', '127.0.0.1:8000');

            // Auth headers korunur
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }

            // Content-Type korunur
            if (req.headers['content-type']) {
              proxyReq.setHeader('Content-Type', req.headers['content-type']);
            }

            // Additional headers for better compatibility
            proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
            proxyReq.setHeader('Accept', 'application/json');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 [PROXY] Response:', proxyRes.statusCode, req.url);

            // CORS headers backend'den gelmezse ekle - HER ZAMAN EKLE
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-credentials'] = 'true';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
            proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
            proxyRes.headers['access-control-expose-headers'] = 'Content-Length, Content-Type';

            // Cache control
            if (req.url.includes('/health')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
            }
          });

          // ⚡ YENİ: Proxy request error handling
          proxy.on('proxyReqError', (err, req, res) => {
            console.log('🚨 [PROXY] Request Error:', err.message, 'for', req.url);
            if (!res.headersSent) {
              try {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Proxy request error',
                  details: err.message
                }));
              } catch (writeError) {
                console.log('🚨 [PROXY] ProxyReqError response yazılamadı');
              }
            }
          });

          // ⚡ YENİ: Proxy response error handling
          proxy.on('proxyResError', (err, req, res) => {
            console.log('🚨 [PROXY] Response Error:', err.message, 'for', req.url);
            if (!res.headersSent) {
              try {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Proxy response error',
                  details: err.message
                }));
              } catch (writeError) {
                console.log('🚨 [PROXY] ProxyResError response yazılamadı');
              }
            }
          });
        },
      },
      '/health': {
        target: 'http://127.0.0.1:8000', // ⚡ localhost yerine 127.0.0.1
        changeOrigin: true,
        secure: false,
        timeout: 30000, // ⚡ 30 saniye timeout (uzatıldı)
        proxyTimeout: 30000, // ⚡ Proxy timeout eklendi
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 [PROXY] Health check error:', err.message);
            console.log('🚨 [PROXY] Health target check: http://127.0.0.1:8000/health');

            if (!res.headersSent) {
              try {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*', // ⚡ Wildcard için daha uyumlu
                  'Access-Control-Allow-Credentials': 'true'
                });
                res.end(JSON.stringify({
                  status: 'error',
                  error: 'Backend sunucusuna bağlanılamıyor',
                  service: 'Health Check Proxy',
                  details: err.message,
                  timestamp: new Date().toISOString()
                }));
              } catch (writeError) {
                console.log('🚨 [PROXY] Health error response yazılamadı:', writeError.message);
              }
            }
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🏥 [PROXY] Health check request to backend');
            // Timeout ayarları
            proxyReq.setTimeout(30000); // ⚡ 30 saniye
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('User-Agent', 'Vite-Proxy-Health-Check');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('🏥 [PROXY] Health check response:', proxyRes.statusCode);
            // Health check için CORS headers
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-credentials'] = 'true';
            proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
          });

          // Health check error handling
          proxy.on('proxyReqError', (err, req, res) => {
            console.log('🚨 [PROXY] Health check request error:', err.message);
          });

          proxy.on('proxyResError', (err, req, res) => {
            console.log('🚨 [PROXY] Health check response error:', err.message);
          });
        }
      }
    },
    // Vite server CORS ayarları (proxy ile beraber çalışır) - GELİŞTİRİLMİŞ
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8000',  // Backend port
        'http://127.0.0.1:8000',  // Backend port
        'http://localhost:5173',  // Vite default port
        'http://127.0.0.1:5173'   // Vite default port
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ],
      credentials: true,
      optionsSuccessStatus: 200 // ⚡ IE11 support
    },
    // ⚡ YENİ: Ek server ayarları
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['axios'] // ⚡ axios'u ayrı chunk'a taşı
        }
      }
    },
    // ⚡ YENİ: Build optimizasyonları
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000
  },
  define: {
    __DEV__: JSON.stringify(true), // ✅ Syntax düzeltildi
    __VITE_DEV_MODE__: JSON.stringify(process.env.VITE_DEV_MODE === 'true'),
    // ⚡ YENİ: Global tanımlamalar
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast', // ⚡ Eklendi
      'axios' // ⚡ Eklendi
    ],
    // ⚡ YENİ: Force optimization
    force: false
  },
  // ⚡ YENİ: Preview ayarları (production test için)
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  // ⚡ YENİ: CSS ayarları
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  }
})