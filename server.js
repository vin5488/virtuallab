const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

// ——— Submissions Storage ———
function loadSubmissions() {
    try {
        if (fs.existsSync(SUBMISSIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
        }
    } catch (e) { console.log('Error loading submissions:', e.message); }
    return [];
}

function saveSubmissions(data) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper to handle CORS
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const ipCache = {}; // Simple in-memory cache for rate limiting

// Helper to read JSON body
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ——————————————————————————————————————————————
    // ASSIGNMENT SUBMISSION & GRADING APIs
    // ——————————————————————————————————————————————

    // POST /api/submit — Candidate submits an assignment
    if (req.url === '/api/submit' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = loadSubmissions();
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
                autoScore: data.autoScore || 0,  // 0-100 based on test pass rate
                status: 'pending',          // pending | graded
                submittedAt: new Date().toISOString(),
                // Grading fields (filled by trainer)
                grade: null
            };
            submissions.push(submission);
            saveSubmissions(submissions);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, submissionId: submission.id }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/submissions — Trainer fetches all submissions (optionally filtered)
    if (req.url.startsWith('/api/submissions') && req.method === 'GET') {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const dayFilter = url.searchParams.get('day');
            const statusFilter = url.searchParams.get('status');
            let submissions = loadSubmissions();
            if (dayFilter) submissions = submissions.filter(s => String(s.day) === dayFilter);
            if (statusFilter && statusFilter !== 'all') submissions = submissions.filter(s => s.status === statusFilter);
            // Don't send full code in the list view for performance; only send on grade detail
            const summary = submissions.map(s => ({
                id: s.id,
                candidateName: s.candidateName,
                email: s.email,
                projectId: s.projectId,
                projectTitle: s.projectTitle,
                topicId: s.topicId,
                topicName: s.topicName,
                day: s.day,
                testsPassed: s.testsPassed,
                testsTotal: s.testsTotal,
                autoScore: s.autoScore,
                status: s.status,
                submittedAt: s.submittedAt,
                grade: s.grade
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(summary));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // GET /api/submission/:id — Get full submission detail (including code)
    if (req.url.startsWith('/api/submission/') && req.method === 'GET') {
        try {
            const subId = req.url.replace('/api/submission/', '');
            const submissions = loadSubmissions();
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

    // POST /api/grade — Trainer grades a submission
    if (req.url === '/api/grade' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = loadSubmissions();
            const idx = submissions.findIndex(s => s.id === data.submissionId);
            if (idx < 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Submission not found' }));
            }
            // Manual score = average of 4 rubric criteria (each 0-10, scaled to 0-100)
            const scores = data.scores || {};
            const correctness = Math.min(10, Math.max(0, scores.correctness || 0));
            const codeQuality = Math.min(10, Math.max(0, scores.codeQuality || 0));
            const logic = Math.min(10, Math.max(0, scores.logic || 0));
            const style = Math.min(10, Math.max(0, scores.style || 0));
            const manualScore = ((correctness + codeQuality + logic + style) / 4) * 10; // 0-100
            const autoScore = submissions[idx].autoScore || 0;
            // Composite: 20% auto + 80% manual
            const compositeScore = Math.round(autoScore * 0.20 + manualScore * 0.80);

            submissions[idx].status = 'graded';
            submissions[idx].grade = {
                scores: { correctness, codeQuality, logic, style },
                manualScore: Math.round(manualScore),
                autoScore: autoScore,
                compositeScore: compositeScore,
                comments: data.comments || '',
                trainerName: data.trainerName || 'Trainer',
                gradedAt: new Date().toISOString()
            };
            saveSubmissions(submissions);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, grade: submissions[idx].grade }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // POST /api/my-submissions — Candidate fetches their own submissions
    if (req.url === '/api/my-submissions' && req.method === 'POST') {
        try {
            const data = await readBody(req);
            const submissions = loadSubmissions();
            const mine = submissions
                .filter(s => s.email === data.email)
                .map(s => ({
                    id: s.id,
                    projectId: s.projectId,
                    projectTitle: s.projectTitle,
                    topicName: s.topicName,
                    day: s.day,
                    testsPassed: s.testsPassed,
                    testsTotal: s.testsTotal,
                    autoScore: s.autoScore,
                    status: s.status,
                    submittedAt: s.submittedAt,
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
    // COMPILE ENDPOINT (existing)
    // ——————————————————————————————————————————————
    if (req.url === '/compile' && req.method === 'POST') {
        // Simple rate limiting by IP
        const ip = req.socket.remoteAddress;
        const now = Date.now();
        if (ipCache[ip] && (now - ipCache[ip] < 10000)) {
            const timeLeft = Math.ceil((10000 - (now - ipCache[ip])) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: true,
                compile_output: `Rate limit exceeded. Please wait ${timeLeft}s before trying again.`,
                stdout: '',
                stderr: ''
            }));
            return;
        }
        ipCache[ip] = now;

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sourceCode = data.source_code;
                const stdin = data.stdin || '';
                const target = data.target || 'native'; // 'native' or 'rp2040'

                if (target === 'rp2040') {
                    const tmpDir = os.tmpdir();
                    const timestamp = Date.now();
                    const srcPath = path.join(tmpDir, `rp2040_${timestamp}.c`);
                    const elfPath = path.join(tmpDir, `rp2040_${timestamp}.elf`);
                    const hexPath = path.join(tmpDir, `rp2040_${timestamp}.hex`);

                    fs.writeFileSync(srcPath, sourceCode);

                    // Compile for ARM Cortex-M0+ and generate HEX. 
                    // Use -nostartfiles and -Ttext=0x10000000 to match rp2040js plain flashing to flash memory
                    const compileCmd = `arm-none-eabi-gcc -O2 -mcpu=cortex-m0plus -mthumb -ffreestanding -nostartfiles -Wl,-Ttext=0x10000000 "${srcPath}" -o "${elfPath}" && arm-none-eabi-objcopy -O ihex "${elfPath}" "${hexPath}"`;

                    exec(compileCmd, (compileErr, stdout, stderr) => {
                        if (compileErr) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: true, compile_output: stderr || stdout || compileErr.message, stdout: '', stderr: '' }));
                        }
                        try {
                            const hexData = fs.readFileSync(hexPath, 'utf8');
                            try { fs.unlinkSync(srcPath); fs.unlinkSync(elfPath); fs.unlinkSync(hexPath); } catch (e) { }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({
                                error: false,
                                hex: hexData,
                                stdout: 'Successfully compiled for RP2040.',
                                stderr: '',
                                compile_output: ''
                            }));
                        } catch (e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: true, compile_output: 'Failed to read hex file.', stdout: '', stderr: '' }));
                        }
                    });
                    return;
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
                    const srcPath = path.join(os.tmpdir(), `temp_prog_${Date.now()}.py`);
                    fs.writeFileSync(srcPath, sourceCode);
                    console.log(`Running as Python 3 script`);
                    const child = exec(`python3 "${srcPath}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
                        try { fs.unlinkSync(srcPath); } catch (e) { }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: !!runErr,
                            stdout: runStdout || '',
                            stderr: runStderr || (runErr && runErr.killed ? 'Program timed out (5s limit)' : ''),
                            compile_output: ''
                        }));
                    });
                    child.stdin.write(stdin);
                    child.stdin.end();
                    return;
                }

                // Create temp file with unique name to avoid conflicts
                const tmpDir = os.tmpdir();
                const timestamp = Date.now();
                const srcPath = path.join(tmpDir, `temp_prog_${timestamp}${ext}`);
                const exePath = path.join(tmpDir, `temp_prog_${timestamp}.exe`);

                fs.writeFileSync(srcPath, sourceCode);

                // Clean up old files before compiling
                try {
                    if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
                    if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
                    fs.writeFileSync(srcPath, sourceCode); // Rewrite after cleanup
                } catch (cleanupErr) {
                    console.log('Cleanup warning:', cleanupErr.message);
                }

                // Compile with auto-detected compiler and proper flags/libraries
                const cFlags = '-std=c11 -Wall -lm';
                const cppFlags = '-std=c++17 -Wall -lm -lstdc++';
                const flags = isCpp ? cppFlags : cFlags;
                console.log(`Compiling as ${isCpp ? 'C++' : 'C'} with ${compiler} (${flags})`);
                exec(`${compiler} "${srcPath}" -o "${exePath}" ${flags}`, (compileErr, stdout, stderr) => {
                    if (compileErr) {
                        console.log('Compilation error:', compileErr);
                        console.log('stderr:', stderr);
                        console.log('stdout:', stdout);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: true,
                            compile_output: stderr || stdout || compileErr.message || 'Unknown compilation error',
                            stdout: '',
                            stderr: ''
                        }));
                        return;
                    }

                    // Run the compiled program
                    const child = exec(`"${exePath}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
                        // Cleanup
                        try { fs.unlinkSync(srcPath); fs.unlinkSync(exePath); } catch (e) { }

                        if (runErr) {
                            console.log('Runtime error:', runErr);
                            console.log('Runtime stdout:', runStdout);
                            console.log('Runtime stderr:', runStderr);
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: false,
                            stdout: runStdout || '',
                            stderr: runStderr || (runErr && runErr.killed ? 'Program timed out (5s limit)' : ''),
                            compile_output: ''
                        }));
                    });

                    // Always write stdin and close the pipe — prevents programs from hanging
                    child.stdin.write(stdin);
                    child.stdin.end();
                });

            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: true, stderr: 'Server Error: ' + e.message }));
            }
        });
    } else if (!req.url.startsWith('/api/')) {
        // Serve static files (optional, for index.html)
        // Simple file server logic
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`GCC Server running at http://localhost:${PORT}`);
    console.log(`Also accessible via your LAN IP: http://<your-ip>:${PORT}`);
    console.log('Ensure GCC is installed and in your PATH.');
    console.log('Assignment Submission API ready.');
});
