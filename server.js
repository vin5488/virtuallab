const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;

// Helper to handle CORS
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const ipCache = {}; // Simple in-memory cache for rate limiting

const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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
    } else {
        // Serve static files (optional, for index.html)
        // Simple file server logic
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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
});
