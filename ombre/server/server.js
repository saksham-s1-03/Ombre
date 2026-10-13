import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = createApp();

server.listen(PORT, HOST, () => {
  console.log(`\n  Ombré is open at  http://localhost:${PORT}`);
  console.log(`  Kitchen dashboard http://localhost:${PORT}/admin\n`);
});

function shutdown() {
  console.log('Closing the shop...');
  server.closeStreams();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
