const clients = new Set();
const MAX_CLIENTS = 5000;
let nextId = 1;
let version = Date.now();
let pending = null;
let pendingScopes = new Set();
function send(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    // compression middleware buffers output; flush so the message leaves immediately.
    res.flush?.();
}
/** GET /api/live — the event stream. */
export function liveStream(req, res) {
    if (clients.size >= MAX_CLIENTS) {
        res.status(503).json({ error: 'busy' });
        return;
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // tell nginx/LiteSpeed proxies not to buffer
    res.flushHeaders?.();
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
    res.write('retry: 3000\n\n');
    const client = { res, id: nextId++ };
    clients.add(client);
    send(res, 'hello', { v: version });
    const ping = setInterval(() => {
        res.write(`: ping ${Date.now()}\n\n`);
        res.flush?.();
    }, 20000);
    const close = () => {
        clearInterval(ping);
        clients.delete(client);
    };
    req.on('close', close);
    res.on('error', close);
}
/** GET /api/live/version — fallback for browsers/networks that block event streams. */
export function liveVersion(_req, res) {
    res.set('Cache-Control', 'no-store');
    res.json({ v: version });
}
/** Tell every open shop tab that data changed. Bursts (e.g. saving a product with many variants) are merged. */
export function broadcastChange(scope = 'all') {
    version = Date.now();
    pendingScopes.add(scope);
    if (pending)
        return;
    pending = setTimeout(() => {
        const scopes = [...pendingScopes];
        pendingScopes = new Set();
        pending = null;
        for (const c of clients) {
            try {
                send(c.res, 'change', { v: version, scopes });
            }
            catch {
                clients.delete(c);
            }
        }
    }, 60);
}
export function liveClientCount() {
    return clients.size;
}
