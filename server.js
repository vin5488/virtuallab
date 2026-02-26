// ═══════════════════════════════════════════════════════════════════════════════
// SkillLync VirtualLab — Production Server (Hardened for 200+ Concurrent Users)
// ═══════════════════════════════════════════════════════════════════════════════

const cluster = require('cluster');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ——— Configuration ———
const PORT = process.env.PORT || 8080;
const NUM_WORKERS = parseInt(process.env.WORKERS) || Math.min(os.cpus().length, 4); // Cap at 4 workers
const MAX_CONCURRENT_COMPILES = parseInt(process.env.MAX_COMPILES) || NUM_WORKERS * 3;
const COMPILE_TIMEOUT = 10000;   // 10s for GCC compilation
const RUN_TIMEOUT = 5000;        // 5s for user program execution
const MAX_OUTPUT_BUFFER = 1024 * 1024; // 1MB max output
const MAX_BODY_SIZE = 500 * 1024;      // 500KB max request body
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTER MASTER — Forks workers and monitors them
// ═══════════════════════════════════════════════════════════════════════════════
if (cluster.isMaster || cluster.isPrimary) {
    console.log(`[Master PID ${process.pid}] Starting ${NUM_WORKERS} workers...`);

    // Ensure MinGW GCC is in PATH on Windows
    if (os.platform() === 'win32') {
        const mingwPaths = [
            'C:\\msys64\\mingw64\\bin',
            'C:\\msys64\\ucrt64\\bin',
            'C:\\MinGW\\bin',
            'C:\\mingw64\\bin',
            'C:\\TDM-GCC-64\\bin'
        ];
        for (const p of mingwPaths) {
            if (fs.existsSync(path.join(p, 'gcc.exe')) && !process.env.PATH.includes(p)) {
                process.env.PATH = p + ';' + process.env.PATH;
                console.log(`[Master] Added ${p} to PATH`);
                break;
            }
        }
    }

    // Fork workers
    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    // Respawn crashed workers
    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Master] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
        cluster.fork();
    });

    // Graceful shutdown
    const shutdown = () => {
        console.log('[Master] Shutting down gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].process.kill('SIGTERM');
        }
        setTimeout(() => process.exit(0), 5000);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return; // Master does nothing else
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER — Handles HTTP requests
// ═══════════════════════════════════════════════════════════════════════════════
const WORKER_ID = cluster.worker ? cluster.worker.id : 0;
console.log(`[Worker ${WORKER_ID}, PID ${process.pid}] Started`);

// ——— Compile Queue ———
// Limits concurrent GCC processes to avoid overwhelming the OS
class CompileQueue {
    constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    enqueue(fn) {
        return new Promise((resolve, reject) => {
            const run = () => {
                this.running++;
                fn().then(resolve).catch(reject).finally(() => {
                    this.running--;
                    if (this.queue.length > 0) {
                        const next = this.queue.shift();
                        next();
                    }
                });
            };

            if (this.running < this.maxConcurrent) {
                run();
            } else {
                this.queue.push(run);
            }
        });
    }

    get stats() {
        return { running: this.running, queued: this.queue.length, max: this.maxConcurrent };
    }
}

const compileQueue = new CompileQueue(MAX_CONCURRENT_COMPILES);

// ——— Async Submissions Storage with Write Lock ———
let submissionLock = Promise.resolve();

async function loadSubmissions() {
    try {
        if (fs.existsSync(SUBMISSIONS_FILE)) {
            const data = await fs.promises.readFile(SUBMISSIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) { console.log('[Storage] Error loading submissions:', e.message); }
    return [];
}

function saveSubmissions(data) {
    // Chain writes to prevent race conditions
    submissionLock = submissionLock.then(() =>
        fs.promises.writeFile(SUBMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf8')
    ).catch(e => console.log('[Storage] Write error:', e.message));
    return submissionLock;
}

// ——— Static File Cache ———
const staticCache = {};

function serveStatic(filePath, res) {
    const absPath = path.resolve(filePath);
    const extname = String(path.extname(absPath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.woff': 'font/woff'
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Serve from cache if available
    if (staticCache[absPath]) {
        const cached = staticCache[absPath];
        const etag = cached.etag;
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': cached.data.length,
            'Cache-Control': 'public, max-age=300', // 5 min browser cache
            'ETag': etag
        });
        res.end(cached.data);
        return;
    }

    fs.readFile(absPath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            // Cache in memory (only files < 1MB)
            if (content.length < 1024 * 1024) {
                const etag = `"${Date.now().toString(36)}"`;
                staticCache[absPath] = { data: content, etag };
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': content.length,
                'Cache-Control': 'public, max-age=300'
            });
            res.end(content, 'utf-8');
        }
    });
}

// ——— CORS Helper ———
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// ——— Rate Limiter (per-IP, sliding window) ———
const ipRateMap = {};
const RATE_WINDOW = 60000; // 60 seconds
const RATE_MAX = 30;       // max 30 compile requests per minute per IP

function checkRateLimit(ip) {
    const now = Date.now();
    if (!ipRateMap[ip]) ipRateMap[ip] = [];

    // Remove entries older than the window
    ipRateMap[ip] = ipRateMap[ip].filter(t => now - t < RATE_WINDOW);

    if (ipRateMap[ip].length >= RATE_MAX) {
        return false; // Rate limited
    }
    ipRateMap[ip].push(now);
    return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const ip in ipRateMap) {
        ipRateMap[ip] = ipRateMap[ip].filter(t => now - t < RATE_WINDOW);
        if (ipRateMap[ip].length === 0) delete ipRateMap[ip];
    }
}, 300000);

// ——— Read body with size limit ———
function readBody(req, maxSize = MAX_BODY_SIZE) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxSize) {
                req.destroy();
                reject(new Error('Request body too large'));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

// ——— Queued exec wrapper ———
function queuedExec(cmd, opts = {}) {
    return compileQueue.enqueue(() => new Promise((resolve, reject) => {
        exec(cmd, {
            timeout: opts.timeout || COMPILE_TIMEOUT,
            maxBuffer: MAX_OUTPUT_BUFFER,
            ...opts
        }, (err, stdout, stderr) => {
            resolve({ err, stdout, stderr });
        });
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════════════════════════
const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ————— Health Check —————
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            worker: WORKER_ID,
            compileQueue: compileQueue.stats,
            uptime: process.uptime()
        }));
        return;
    }

    // ——————————————————————————————————————————————
    // ASSIGNMENT SUBMISSION & GRADING APIs
    // ——————————————————————————————————————————————

    // POST /api/submit
    if (req.url === '/api/submit' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = await loadSubmissions();
            const submission = {
                id: 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                candidateName: data.candidateName || 'Unknown',
                email: data.email || '',
                projectId: data.projectId || '',
                projectTitle: data.projectTitle || '',
                topicId: data.topicId || '',
                topicName: data.topicName || '',
                day: data.day || 1,
                code: data.code || [],
                testResults: data.testResults || [],
                testsPassed: data.testsPassed || 0,
                testsTotal: data.testsTotal || 0,
                autoScore: data.autoScore || 0,
                violationCount: data.violationCount || 0,
                violationLog: data.violationLog || [],
                status: 'pending',
                submittedAt: new Date().toISOString(),
                grade: null
            };
            submissions.push(submission);
            await saveSubmissions(submissions);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, submissionId: submission.id }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/submissions
    if (req.url.startsWith('/api/submissions') && req.method === 'GET') {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const dayFilter = url.searchParams.get('day');
            const statusFilter = url.searchParams.get('status');
            let submissions = await loadSubmissions();
            if (dayFilter) submissions = submissions.filter(s => String(s.day) === dayFilter);
            if (statusFilter && statusFilter !== 'all') submissions = submissions.filter(s => s.status === statusFilter);
            const summary = submissions.map(s => ({
                id: s.id, candidateName: s.candidateName, email: s.email,
                projectId: s.projectId, projectTitle: s.projectTitle,
                topicId: s.topicId, topicName: s.topicName, day: s.day,
                testsPassed: s.testsPassed, testsTotal: s.testsTotal,
                autoScore: s.autoScore, status: s.status, submittedAt: s.submittedAt,
                violationCount: s.violationCount || 0,
                grade: s.grade
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(summary));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/submission/:id
    if (req.url.startsWith('/api/submission/') && req.method === 'GET') {
        try {
            const subId = req.url.replace('/api/submission/', '');
            const submissions = await loadSubmissions();
            const sub = submissions.find(s => s.id === subId);
            if (!sub) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not found' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(sub));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/grade
    if (req.url === '/api/grade' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = await loadSubmissions();
            const idx = submissions.findIndex(s => s.id === data.submissionId);
            if (idx < 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Submission not found' }));
            }
            const scores = data.scores || {};
            const correctness = Math.min(10, Math.max(0, scores.correctness || 0));
            const codeQuality = Math.min(10, Math.max(0, scores.codeQuality || 0));
            const logic = Math.min(10, Math.max(0, scores.logic || 0));
            const style = Math.min(10, Math.max(0, scores.style || 0));
            const manualScore = ((correctness + codeQuality + logic + style) / 4) * 10;
            const autoScore = submissions[idx].autoScore || 0;
            const compositeScore = Math.round(autoScore * 0.20 + manualScore * 0.80);

            submissions[idx].status = 'graded';
            submissions[idx].grade = {
                scores: { correctness, codeQuality, logic, style },
                manualScore: Math.round(manualScore),
                autoScore, compositeScore,
                comments: data.comments || '',
                trainerName: data.trainerName || 'Trainer',
                gradedAt: new Date().toISOString()
            };
            await saveSubmissions(submissions);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, grade: submissions[idx].grade }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/my-submissions
    if (req.url === '/api/my-submissions' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = await loadSubmissions();
            const mine = submissions
                .filter(s => s.email === data.email)
                .map(s => ({
                    id: s.id, projectId: s.projectId, projectTitle: s.projectTitle,
                    topicName: s.topicName, day: s.day,
                    testsPassed: s.testsPassed, testsTotal: s.testsTotal,
                    autoScore: s.autoScore, status: s.status, submittedAt: s.submittedAt,
                    grade: s.grade
                }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(mine));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // ——————————————————————————————————————————————
    // COMPILE ENDPOINT (production-hardened)
    // ——————————————————————————————————————————————
    if (req.url === '/compile' && req.method === 'POST') {
        const ip = req.socket.remoteAddress;

        // Sliding window rate limit: 30 requests/min per IP
        if (!checkRateLimit(ip)) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: true,
                compile_output: 'Rate limit exceeded (30 requests/min). Please slow down.',
                stdout: '', stderr: ''
            }));
            return;
        }

        let body = '';
        let bodySize = 0;
        req.on('data', chunk => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY_SIZE) {
                req.destroy();
                return;
            }
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const sourceCode = data.source_code;
                const stdin = data.stdin || '';
                const target = data.target || 'native';

                if (!sourceCode || sourceCode.length > 100000) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: true, compile_output: 'Source code missing or too large (100KB max).', stdout: '', stderr: '' }));
                    return;
                }

                // Use random suffix for uniqueness across workers
                const uid = `${Date.now()}_${process.pid}_${Math.random().toString(36).substr(2, 6)}`;
                const tmpDir = os.tmpdir();

                if (target === 'rp2040') {
                    const srcPath = path.join(tmpDir, `rp2040_${uid}.c`);
                    const elfPath = path.join(tmpDir, `rp2040_${uid}.elf`);
                    const hexPath = path.join(tmpDir, `rp2040_${uid}.hex`);

                    await fs.promises.writeFile(srcPath, sourceCode);

                    const compileCmd = `arm-none-eabi-gcc -O2 -mcpu=cortex-m0plus -mthumb -ffreestanding -nostartfiles -Wl,-Ttext=0x10000000 "${srcPath}" -o "${elfPath}" && arm-none-eabi-objcopy -O ihex "${elfPath}" "${hexPath}"`;

                    try {
                        const { err: compileErr, stdout, stderr } = await queuedExec(compileCmd);
                        if (compileErr) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: true, compile_output: stderr || stdout || compileErr.message, stdout: '', stderr: '' }));
                        }
                        const hexData = await fs.promises.readFile(hexPath, 'utf8');
                        // Cleanup
                        fs.promises.unlink(srcPath).catch(() => { });
                        fs.promises.unlink(elfPath).catch(() => { });
                        fs.promises.unlink(hexPath).catch(() => { });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: false, hex: hexData, stdout: 'Successfully compiled for RP2040.', stderr: '', compile_output: '' }));
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: true, compile_output: 'Compilation failed: ' + e.message, stdout: '', stderr: '' }));
                    }
                }

                // Auto-detect C++ vs C
                const isCpp = /^\s*#include\s*<(iostream|fstream|sstream|vector|string|map|set|list|queue|stack|deque|algorithm|functional|numeric|memory|utility|tuple|array|bitset|regex|chrono|thread|mutex|cmath|cstdlib|cstring|cstdio|climits|cfloat|cassert|cctype|ctime)>/m.test(sourceCode)
                    || /\b(cout|cin|cerr|endl|std::|(using\s+namespace\s+std))\b/.test(sourceCode)
                    || /\b(class\s+\w+|template\s*<|nullptr|auto\s+\w+\s*=|new\s+\w+|delete\s+|virtual\s+|override|public:|private:|protected:)\b/.test(sourceCode);

                const ext = isCpp ? '.cpp' : '.c';
                const compiler = isCpp ? 'g++' : 'gcc';

                // Check for Python
                const isPython = /\.py$/.test(data.filename || '') || /import\s+\w+|from\s+\w+\s+import/.test(sourceCode);

                if (isPython) {
                    const srcPath = path.join(tmpDir, `py_${uid}.py`);
                    await fs.promises.writeFile(srcPath, sourceCode);

                    try {
                        const result = await compileQueue.enqueue(() => new Promise((resolve) => {
                            const child = exec(`python3 "${srcPath}"`, {
                                timeout: RUN_TIMEOUT,
                                maxBuffer: MAX_OUTPUT_BUFFER
                            }, (runErr, runStdout, runStderr) => {
                                fs.promises.unlink(srcPath).catch(() => { });
                                resolve({
                                    error: !!runErr,
                                    stdout: runStdout || '',
                                    stderr: runStderr || (runErr && runErr.killed ? 'Program timed out (5s limit)' : ''),
                                    compile_output: ''
                                });
                            });
                            child.stdin.write(stdin);
                            child.stdin.end();
                        }));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify(result));
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: true, compile_output: e.message, stdout: '', stderr: '' }));
                    }
                }

                // ——— C/C++ Compile & Run (queued) ———
                const srcPath = path.join(tmpDir, `prog_${uid}${ext}`);
                const exeName = os.platform() === 'win32' ? `prog_${uid}.exe` : `prog_${uid}`;
                const exePath = path.join(tmpDir, exeName);

                await fs.promises.writeFile(srcPath, sourceCode);

                const cFlags = '-std=c11 -Wall -lm';
                const cppFlags = '-std=c++17 -Wall -lm -lstdc++';
                const flags = isCpp ? cppFlags : cFlags;

                try {
                    // Step 1: Compile (queued)
                    const { err: compileErr, stdout: compOut, stderr: compErr } = await queuedExec(
                        `${compiler} "${srcPath}" -o "${exePath}" ${flags}`,
                        { timeout: COMPILE_TIMEOUT }
                    );

                    if (compileErr) {
                        // Cleanup
                        fs.promises.unlink(srcPath).catch(() => { });
                        fs.promises.unlink(exePath).catch(() => { });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({
                            error: true,
                            compile_output: compErr || compOut || compileErr.message || 'Unknown compilation error',
                            stdout: '', stderr: ''
                        }));
                    }

                    // Step 2: Run (queued, with resource limits)
                    const runResult = await compileQueue.enqueue(() => new Promise((resolve) => {
                        const child = exec(`"${exePath}"`, {
                            timeout: RUN_TIMEOUT,
                            maxBuffer: MAX_OUTPUT_BUFFER
                        }, (runErr, runStdout, runStderr) => {
                            // Cleanup
                            fs.promises.unlink(srcPath).catch(() => { });
                            fs.promises.unlink(exePath).catch(() => { });

                            resolve({
                                error: false,
                                stdout: runStdout || '',
                                stderr: runStderr || (runErr && runErr.killed ? 'Program timed out (5s limit)' : ''),
                                compile_output: ''
                            });
                        });
                        child.stdin.write(stdin);
                        child.stdin.end();
                    }));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(runResult));

                } catch (e) {
                    fs.promises.unlink(srcPath).catch(() => { });
                    fs.promises.unlink(exePath).catch(() => { });
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: true, stderr: 'Server Error: ' + e.message }));
                }

            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: true, stderr: 'Server Error: ' + e.message }));
            }
        });
    } else if (!req.url.startsWith('/api/')) {
        // ——— Static File Server (cached) ———
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';
        serveStatic(filePath, res);
    }
});

// ——— Server Limits ———
server.maxConnections = 500;
server.timeout = 30000;       // 30s max total request time
server.keepAliveTimeout = 10000;
server.headersTimeout = 15000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Worker ${WORKER_ID}] Server running on port ${PORT}`);
    console.log(`[Worker ${WORKER_ID}] Compile queue max: ${MAX_CONCURRENT_COMPILES}`);
});

// ——— Graceful Shutdown ———
process.on('SIGTERM', () => {
    console.log(`[Worker ${WORKER_ID}] Shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
});
