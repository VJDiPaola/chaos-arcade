import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve(process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const allowed = new Set(['index.html','styles.css','config.js','record.html','recorder.js','src/app.js','src/engine.js','src/oauth.js','src/twitch.js']);
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = resolve(root,relative);
    if (!target.startsWith(root + sep) || !allowed.has(relative)) { res.writeHead(404);res.end('Not found');return; }
    const content = await readFile(target);
    res.writeHead(200, {'Content-Type':types[extname(target)] || 'text/plain', 'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'});
    res.end(content);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log('Chaos Arcade: http://localhost:' + port + '/'));
