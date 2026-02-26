// Quick load test: fires 10 simultaneous compile requests
const http = require('http');

const code = [
    '#include <stdio.h>',
    'int main() {',
    '    int n;',
    '    scanf("%d", &n);',
    '    printf("Result: %d\\n", n*2);',
    '    return 0;',
    '}'
].join('\n');

function sendCompile(id, stdin) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ source_code: code, stdin: stdin, target: 'native' });
        const req = http.request({
            hostname: 'localhost', port: 8080, path: '/compile',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const r = JSON.parse(body);
                    const out = (r.stdout || '').trim();
                    const err = (r.stderr || '').trim().substring(0, 80);
                    const comp = (r.compile_output || '').trim().substring(0, 80);
                    console.log(`[Req ${String(id).padStart(2)}] ${r.error ? 'ERR' : ' OK'} | stdout: "${out}" | stderr: "${err}" | compile: "${comp}"`);
                } catch (e) {
                    console.log(`[Req ${id}] Parse error: ${body.substring(0, 100)}`);
                }
                resolve();
            });
        });
        req.on('error', (e) => { console.log(`[Req ${id}] Connection error: ${e.message}`); resolve(); });
        req.write(data);
        req.end();
    });
}

async function main() {
    const N = 10;
    console.log(`Sending ${N} concurrent compile requests...`);
    const start = Date.now();

    const promises = [];
    for (let i = 0; i < N; i++) {
        promises.push(sendCompile(i + 1, String(i + 10)));
    }
    await Promise.all(promises);
    const elapsed = Date.now() - start;
    console.log(`\n✅ All ${N} requests completed in ${elapsed}ms (avg ${Math.round(elapsed / N)}ms/req)`);

    // Check health
    http.get('http://localhost:8080/health', (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
            const h = JSON.parse(body);
            console.log(`\n📊 Health: ${h.status} | Worker: ${h.worker} | Queue: running=${h.compileQueue.running} queued=${h.compileQueue.queued} max=${h.compileQueue.max}`);
        });
    });
}

main();
