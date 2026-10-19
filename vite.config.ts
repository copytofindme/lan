import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';

function videoApiPlugin(): Plugin {
  return {
    name: 'video-api',
    configureServer(server) {
      server.middlewares.use('/api/check-video', (req, res) => {
        const filePath = path.resolve(__dirname, 'public/video.mp4');
        const exists = fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ exists }));
      });

      server.middlewares.use('/api/upload', (req, res) => {
        if (req.method === 'POST') {
          const publicDir = path.resolve(__dirname, 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          const filePath = path.join(publicDir, 'video.mp4');
          const writeStream = fs.createWriteStream(filePath);
          req.pipe(writeStream);

          writeStream.on('finish', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });

          writeStream.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          });
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), videoApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
