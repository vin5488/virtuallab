// ═══════════════════════════════════════════════════════════════════════════════
// VirtualLab — Production Backend (Express + SQLite + JWT Auth)
// Handles: Auth, Compile, Submissions, Grading, Progress, Leaderboard
// ═══════════════════════════════════════════════════════════════════════════════

const cluster = require('cluster');
const os = require('os');
require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════════════════════
// CLUSTER MASTER — fork workers & respawn on crash
// ══════════════════════════════════════════════════════
//if (cluster.isMaster || cluster.isPrimary) {
    const NUM_WORKERS = parseInt(process.env.WORKERS) || Math.min(os.cpus().length, 4);
    console.log(`[Master PID ${process.pid}] Starting ${NUM_WORKERS} workers...`);

    // DB Schema Initialization (Master Only) - Prevents SQLite 'database is locked' errors
    // when multiple workers start simultaneously and try to execute CREATE TABLE & PRAGMA.
    const fs = require('fs');
    const path = require('path');
    const Database = require('better-sqlite3');

    const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'virtuallab.db');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    try {
        const initDb = new Database(DB_PATH);
        initDb.pragma('journal_mode = WAL');
        initDb.pragma('synchronous = NORMAL');
        initDb.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'candidate',
            password TEXT, 
            otp TEXT,
            otp_expires INTEGER,
            session_state TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS whitelist (
            email TEXT PRIMARY KEY,
            role TEXT DEFAULT 'candidate'
          );

          CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            candidate_name TEXT,
            email TEXT,
            project_id TEXT,
            project_title TEXT,
            topic_id TEXT,
            topic_name TEXT,
            day INTEGER,
            code TEXT,
            test_results TEXT,
            tests_passed INTEGER DEFAULT 0,
            tests_total INTEGER DEFAULT 0,
            auto_score INTEGER DEFAULT 0,
            violation_count INTEGER DEFAULT 0,
            violation_log TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TEXT,
            grade TEXT
          );

          CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            project_id TEXT NOT NULL,
            files TEXT NOT NULL,
            solved INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(email, project_id)
          );

          CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
          CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
          CREATE INDEX IF NOT EXISTS idx_progress_email ON progress(email);
        `);
        initDb.close();
        console.log(`[Master PID ${process.pid}] SQLite Database initialized successfully.`);
    } catch (e) {
        console.error(`[Master PID ${process.pid}] Failed to initialize database:`, e);
    }

    // Add MinGW GCC to PATH on Windows
    if (os.platform() === 'win32') {
        const mingwPaths = [
            'C:\\msys64\\mingw64\\bin', 'C:\\msys64\\ucrt64\\bin',
            'C:\\MinGW\\bin', 'C:\\mingw64\\bin', 'C:\\TDM-GCC-64\\bin'
        ];
        for (const p of mingwPaths) {
            if (fs.existsSync(path.join(p, 'gcc.exe')) && !process.env.PATH.includes(p)) {
                process.env.PATH = p + ';' + process.env.PATH;
                console.log(`[Master] Added GCC path: ${p}`);
                break;
            }
        }
    }

    for (let i = 0; i < NUM_WORKERS; i++) cluster.fork();

    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Master] Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });

    const shutdown = () => {
        console.log('[Master] Graceful shutdown...');
        for (const id in cluster.workers) cluster.workers[id].process.kill('SIGTERM');
        setTimeout(() => process.exit(0), 5000);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return;
}

// ══════════════════════════════════════════════════════
// WORKER — Express App
// ══════════════════════════════════════════════════════
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const PORT = parseInt(process.env.PORT) || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'virtuallab.db');

// ── Security validation on startup ──────────────────────
const INSECURE_JWT = 'virtuallab-secret-key-2024';
const JWT_SECRET = process.env.JWT_SECRET || INSECURE_JWT;

if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === INSECURE_JWT) {
        console.error('[FATAL] JWT_SECRET is not set or is using the insecure default. Set a strong random secret in your .env file.');
        process.exit(1);
    }
    if (!process.env.ADMIN_PASS || process.env.ADMIN_PASS === 'admin123') {
        console.error('[FATAL] ADMIN_PASS is not set or is still the default "admin123". Set a strong password in your .env file.');
        process.exit(1);
    }
    if (process.env.DEBUG_AUTH === 'true') {
        console.error('[FATAL] DEBUG_AUTH=true is not allowed in production. It exposes OTP codes in API responses.');
        process.exit(1);
    }
    console.log('[Security] Production security checks passed ✓');
}

const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// SMTP Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendOTPEmail(email, otp) {
    const mailOptions = {
        from: process.env.SMTP_FROM || '"VirtualLab" <noreply@virtuallab.io>',
        to: email,
        subject: 'Your VirtualLab Access Code',
        text: `Your access code for VirtualLab is: ${otp}\n\nThis code will expire in 10 minutes.`,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>VirtualLab Access</h2>
                <p>Hello,</p>
                <p>Your 6-digit access code for the VirtualLab platform is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; padding: 10px 0;">${otp}</div>
                <p>This code will expire in 10 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">If you did not request this code, please ignore this email.</p>
               </div>`
    };
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
}

async function sendLoginNotification(email, name) {
    const mailOptions = {
        from: process.env.SMTP_FROM || '"VirtualLab" <noreply@virtuallab.io>',
        to: email,
        subject: 'New Login Alert - VirtualLab',
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Login Successful</h2>
                <p>Hello ${name},</p>
                <p>This is a notification that a new login was detected for your VirtualLab account at <b>${new Date().toLocaleString()}</b>.</p>
                <p>If this was you, you can safely ignore this email. If not, please contact your administrator immediately.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 11px; color: #999;">Security Notification | SkillLync VirtualLab</p>
               </div>`
    };
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Login notification send failed:', error);
        return false;
    }
}
const MAX_CONCURRENT_COMPILES = parseInt(process.env.MAX_COMPILES) || 12;
const COMPILE_TIMEOUT = 10000;
const RUN_TIMEOUT = 5000;
const MAX_OUTPUT_BUFFER = 1024 * 1024;
const WORKER_ID = cluster.worker ? cluster.worker.id : 0;

console.log(`[Worker ${WORKER_ID}, PID ${process.pid}] Starting...`);

// ══════════════════════════════════════════════════════
// DATABASE SETUP
// ══════════════════════════════════════════════════════
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH, { timeout: 10000 });
// Wrap PRAGMA in try-catch because if multiple workers execute it simultaneously it may throw 'database is locked', 
// even though WAL mode is already persistently set by the master process.
try { db.pragma('journal_mode = WAL'); } catch (e) { /* ignore */ }
try { db.pragma('synchronous = NORMAL'); } catch (e) { /* ignore */ }

// Database schema initialized in the cluster master process

console.log(`[Worker ${WORKER_ID}] SQLite DB ready at: ${DB_PATH}`);

// ══════════════════════════════════════════════════════
// COMPILE QUEUE (limits concurrent GCC processes)
// ══════════════════════════════════════════════════════
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
                    if (this.queue.length > 0) this.queue.shift()();
                });
            };
            if (this.running < this.maxConcurrent) run();
            else this.queue.push(run);
        });
    }

    get stats() {
        return { running: this.running, queued: this.queue.length, max: this.maxConcurrent };
    }
}

const compileQueue = new CompileQueue(MAX_CONCURRENT_COMPILES);

function queuedExec(cmd, opts = {}) {
    return compileQueue.enqueue(() => new Promise((resolve) => {
        exec(cmd, {
            timeout: opts.timeout || COMPILE_TIMEOUT,
            maxBuffer: MAX_OUTPUT_BUFFER,
            ...opts
        }, (err, stdout, stderr) => resolve({ err, stdout, stderr }));
    }));
}

// ══════════════════════════════════════════════════════
// EXPRESS APP
// ══════════════════════════════════════════════════════
const app = express();

// CORS — in production, lock to your domain via CORS_ORIGIN env var
const corsOrigins = (process.env.CORS_ORIGIN || '*')
    .split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = {
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*'
        ? '*'
        : (origin, cb) => {
            if (!origin || corsOrigins.includes(origin)) return cb(null, true);
            cb(new Error('Not allowed by CORS'));
        },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
};

app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow CDN scripts in index.html
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: false }));

// Global compile rate limit: 30 compile calls/min per IP
const compileRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: true, compile_output: 'Rate limit: 30 compiles/min. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth rate limit: 10 auth attempts/min per IP
const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts. Try again in 1 minute.' }
});

// Submission rate limit: 60 submissions/min per IP
const submitRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many submissions. Please slow down.' }
});

// ══════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════
function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
    try {
        const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        next();
    });
}

// ══════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        worker: WORKER_ID,
        compileQueue: compileQueue.stats,
        uptime: process.uptime(),
        db: 'sqlite'
    });
});

// ══════════════════════════════════════════════════════
// PUBLIC CONFIG — Topic filter & branding for white-label instances
// ══════════════════════════════════════════════════════
app.get('/api/config', (req, res) => {
    // TOPIC_FILTER: comma-separated topic IDs to show, e.g. "C_INT,C_ADV,CPP_INT,CPP_ADV"
    // Leave unset (or empty) to show ALL topics (default behaviour)
    const raw = (process.env.TOPIC_FILTER || '').trim();
    const allowedTopics = raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : [];

    res.json({
        topicFilter: allowedTopics,           // empty array = no filter (show all)
        platformTitle: process.env.PLATFORM_TITLE || 'SkillLyncVirtualLab',
        platformSubtitle: process.env.PLATFORM_SUBTITLE || 'Industrial Grade Embedded & ECU Project Platform'
    });
});

// Helper to check if email is business (non-public)
const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'mail.com'];
function isBusinessEmail(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return !PUBLIC_DOMAINS.includes(domain);
}

// ══════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════

// Register endpoint: Validate email & send OTP
app.post('/api/auth/register', authRateLimit, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and Email required.' });

    // Validate Business Email
    if (!isBusinessEmail(email)) {
        return res.status(400).json({ error: 'Please use your official/business email ID (e.g., @skill-lync.com). Public mail providers like Gmail/Yahoo are not allowed.' });
    }

    // Check Whitelist if enabled
    if (process.env.ENABLE_WHITELIST === 'true') {
        const allowed = db.prepare("SELECT email FROM whitelist WHERE email = ?").get(email);
        if (!allowed) {
            // Also allow if it's one of the listed admin emails (initial setup)
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
            if (!adminEmails.includes(email.toLowerCase())) {
                return res.status(403).json({ error: 'This email is not authorized to access the platform.' });
            }
        }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 600000; // 10 mins

    try {
        db.prepare(`
            INSERT INTO users (name, email, otp, otp_expires) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name=?, otp=?, otp_expires=?
        `).run(name, email, otp, expires, name, otp, expires);

        const emailSent = await sendOTPEmail(email, otp);

        const response = { message: 'OTP sent to your email.' };
        if (process.env.DEBUG_AUTH === 'true' || !emailSent) {
            response.otp = otp; // Fallback to display in UI for testing
            if (!emailSent) response.note = "Email delivery failed. Using debug mode.";
        }

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: 'Database error ' + e.message });
    }
});

// POST /api/auth/verify — Verify OTP and issue JWT
app.post('/api/auth/verify', authRateLimit, (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'User not found. Please register first.' });
    if (user.otp !== String(otp)) return res.status(401).json({ error: 'Invalid access code.' });
    if (Date.now() > user.otp_expires) return res.status(401).json({ error: 'Code expired. Please register again.' });

    // Clear OTP after use
    db.prepare('UPDATE users SET otp = NULL, otp_expires = NULL WHERE email = ?').run(email);

    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: 'candidate' },
        JWT_SECRET,
        { expiresIn: '12h' }
    );

    let parsedSession = null;
    if (user.session_state) {
        try { parsedSession = JSON.parse(user.session_state); } catch (e) { }
    }

    // Send login notification email in background
    sendLoginNotification(user.email, user.name).catch(e => console.error('BG Login notification error:', e));

    res.json({ success: true, token, user: { name: user.name, email: user.email, role: 'candidate' }, session: parsedSession });
});

// Admin Login: Email based for multiple admins
app.post('/api/auth/admin-login', authRateLimit, async (req, res) => {
    const { email, pass } = req.body;
    const configAdminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const configAdminPass = process.env.ADMIN_PASS || 'admin123';

    if (!email || !pass) return res.status(400).json({ error: 'Email and password required.' });

    if (configAdminEmails.includes(email.toLowerCase()) && pass === configAdminPass) {
        const token = jwt.sign({
            name: 'Administrator',
            email: email.toLowerCase(),
            role: 'admin'
        }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials.' });
    }
});

// GET /api/auth/me — Return current user info from JWT
app.get('/api/auth/me', requireAuth, (req, res) => {
    let parsedSession = null;
    if (req.user.role === 'candidate') {
        const user = db.prepare('SELECT session_state FROM users WHERE email = ?').get(req.user.email);
        if (user && user.session_state) {
            try { parsedSession = JSON.parse(user.session_state); } catch (e) { }
        }
    }
    res.json({ user: req.user, session: parsedSession });
});

// POST /api/auth/session — Save UI session state
app.post('/api/auth/session', requireAuth, (req, res) => {
    if (req.user.role !== 'candidate') return res.json({ success: true });
    try {
        db.prepare('UPDATE users SET session_state = ? WHERE email = ?')
            .run(JSON.stringify(req.body.session || {}), req.user.email);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// ══════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ══════════════════════════════════════════════════════

// GET /api/users — List all registered candidates
app.get('/api/users', requireAdmin, (req, res) => {
    const users = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               COUNT(DISTINCT s.id) as submission_count,
               COUNT(DISTINCT CASE WHEN p.solved = 1 THEN p.project_id END) as solved_count
        FROM users u
        LEFT JOIN submissions s ON s.email = u.email
        LEFT JOIN progress p ON p.email = u.email
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `).all();
    res.json(users);
});

// DELETE /api/users/:email — Remove a candidate
app.delete('/api/users/:email', requireAdmin, (req, res) => {
    const email = decodeURIComponent(req.params.email);
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    res.json({ success: true });
});

// ══════════════════════════════════════════════════════
// CODE PROGRESS (per user, server-side)
// ══════════════════════════════════════════════════════

// POST /api/progress/save — Save user's code for a project
app.post('/api/progress/save', requireAuth, (req, res) => {
    const { projectId, files, solved } = req.body;
    const email = req.user.email;
    if (!projectId || !files) return res.status(400).json({ error: 'projectId and files are required.' });

    db.prepare(`
        INSERT INTO progress (email, project_id, files, solved, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email, project_id) DO UPDATE SET
          files = excluded.files,
          solved = excluded.solved,
          updated_at = excluded.updated_at
    `).run(email, projectId, JSON.stringify(files), solved ? 1 : 0);

    res.json({ success: true });
});

// GET /api/progress/:projectId — Load saved code for a project
app.get('/api/progress/:projectId', requireAuth, (req, res) => {
    const email = req.user.email;
    const projectId = req.params.projectId;
    const row = db.prepare('SELECT files, solved FROM progress WHERE email = ? AND project_id = ?').get(email, projectId);
    if (!row) return res.json({ found: false });
    try {
        res.json({ found: true, files: JSON.parse(row.files), solved: row.solved === 1 });
    } catch {
        res.json({ found: false });
    }
});

// GET /api/progress — Get all solved projects for current user
app.get('/api/progress', requireAuth, (req, res) => {
    const email = req.user.email;
    const rows = db.prepare('SELECT project_id, solved FROM progress WHERE email = ?').all(email);
    const solvedIds = rows.filter(r => r.solved === 1).map(r => r.project_id);
    res.json({ solvedProjectIds: solvedIds });
});

// ══════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════
app.get('/api/leaderboard', (req, res) => {
    const leaders = db.prepare(`
        SELECT u.name, u.email,
               COUNT(DISTINCT CASE WHEN p.solved = 1 THEN p.project_id END) as solved_count,
               COUNT(DISTINCT s.id) as submission_count
        FROM users u
        LEFT JOIN progress p ON p.email = u.email
        LEFT JOIN submissions s ON s.email = u.email
        WHERE u.role = 'candidate'
        GROUP BY u.email
        ORDER BY solved_count DESC, submission_count DESC
        LIMIT 50
    `).all();
    res.json(leaders);
});

// ══════════════════════════════════════════════════════
// SUBMISSION ROUTES
// ══════════════════════════════════════════════════════

// POST /api/submit — Submit assignment (requires auth)
app.post('/api/submit', submitRateLimit, requireAuth, (req, res) => {
    const data = req.body;
    const submissionId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    try {
        db.prepare(`
            INSERT INTO submissions (
                id, candidate_name, email, project_id, project_title,
                topic_id, topic_name, day, code, test_results,
                tests_passed, tests_total, auto_score, violation_count, violation_log,
                status, submitted_at, grade
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), NULL)
        `).run(
            submissionId,
            data.candidateName || req.user.name,
            data.email || req.user.email,
            data.projectId || '',
            data.projectTitle || '',
            data.topicId || '',
            data.topicName || '',
            data.day || 1,
            JSON.stringify(data.code || []),
            JSON.stringify(data.testResults || []),
            data.testsPassed || 0,
            data.testsTotal || 0,
            data.autoScore || 0,
            data.violationCount || 0,
            JSON.stringify(data.violationLog || [])
        );
        res.json({ success: true, submissionId });
    } catch (e) {
        console.error('[Submit]', e.message);
        res.status(400).json({ error: e.message });
    }
});

// GET /api/submissions — All submissions (admin only) with optional filters
app.get('/api/submissions', requireAdmin, (req, res) => {
    let query = `SELECT id, candidate_name, email, project_id, project_title,
                        topic_id, topic_name, day, tests_passed, tests_total,
                        auto_score, status, submitted_at, violation_count, grade
                 FROM submissions WHERE 1=1`;
    const params = [];

    if (req.query.day) { query += ' AND day = ?'; params.push(req.query.day); }
    if (req.query.status && req.query.status !== 'all') { query += ' AND status = ?'; params.push(req.query.status); }
    if (req.query.email) { query += ' AND email = ?'; params.push(req.query.email); }

    query += ' ORDER BY submitted_at DESC';

    const rows = db.prepare(query).all(...params);
    const result = rows.map(r => ({
        ...r,
        grade: r.grade ? JSON.parse(r.grade) : null
    }));
    res.json(result);
});

// GET /api/submission/:id — Full detail of one submission (admin only)
app.get('/api/submission/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({
        ...row,
        code: JSON.parse(row.code || '[]'),
        test_results: JSON.parse(row.test_results || '[]'),
        violation_log: JSON.parse(row.violation_log || '[]'),
        grade: row.grade ? JSON.parse(row.grade) : null
    });
});

// POST /api/my-submissions — Get submissions for the logged-in candidate
app.post('/api/my-submissions', requireAuth, (req, res) => {
    const email = req.user.email;
    const rows = db.prepare(`
        SELECT id, project_id, project_title, topic_name, day,
               tests_passed, tests_total, auto_score, status, submitted_at, grade
        FROM submissions WHERE email = ? ORDER BY submitted_at DESC
    `).all(email);
    const result = rows.map(r => ({
        ...r,
        grade: r.grade ? JSON.parse(r.grade) : null
    }));
    res.json(result);
});

// POST /api/grade — Grade a submission (admin only)
app.post('/api/grade', requireAdmin, (req, res) => {
    const { submissionId, scores, comments, trainerName } = req.body;
    const row = db.prepare('SELECT auto_score FROM submissions WHERE id = ?').get(submissionId);
    if (!row) return res.status(404).json({ error: 'Submission not found.' });

    const s = scores || {};
    const clamp = (v) => Math.min(10, Math.max(0, v || 0));
    const correctness = clamp(s.correctness);
    const codeQuality = clamp(s.codeQuality);
    const logic = clamp(s.logic);
    const style = clamp(s.style);
    const manualScore = Math.round(((correctness + codeQuality + logic + style) / 4) * 10);
    const autoScore = row.auto_score || 0;
    const compositeScore = Math.round(autoScore * 0.20 + manualScore * 0.80);

    const grade = {
        scores: { correctness, codeQuality, logic, style },
        manualScore,
        autoScore,
        compositeScore,
        comments: comments || '',
        trainerName: trainerName || req.user.name || 'Trainer',
        gradedAt: new Date().toISOString()
    };

    db.prepare("UPDATE submissions SET status = 'graded', grade = ? WHERE id = ?")
        .run(JSON.stringify(grade), submissionId);

    res.json({ success: true, grade });
});

// ══════════════════════════════════════════════════════
// COMPILE ENDPOINT
// ══════════════════════════════════════════════════════
app.post('/compile', compileRateLimit, async (req, res) => {
    const { source_code: sourceCode, stdin = '', target = 'native' } = req.body;

    if (!sourceCode || sourceCode.length > 100000) {
        return res.status(400).json({
            error: true, compile_output: 'Source code missing or too large (100KB max).', stdout: '', stderr: ''
        });
    }

    const uid = `${Date.now()}_${process.pid}_${Math.random().toString(36).substr(2, 6)}`;
    const tmpDir = os.tmpdir();

    // RP2040 ARM cross-compile
    if (target === 'rp2040') {
        const srcPath = path.join(tmpDir, `rp2040_${uid}.c`);
        const elfPath = path.join(tmpDir, `rp2040_${uid}.elf`);
        const hexPath = path.join(tmpDir, `rp2040_${uid}.hex`);
        await fs.promises.writeFile(srcPath, sourceCode);

        const compileCmd = `arm-none-eabi-gcc -O2 -mcpu=cortex-m0plus -mthumb -ffreestanding -nostartfiles -Wl,-Ttext=0x10000000 "${srcPath}" -o "${elfPath}" && arm-none-eabi-objcopy -O ihex "${elfPath}" "${hexPath}"`;
        try {
            const { err, stdout, stderr } = await queuedExec(compileCmd);
            if (err) {
                return res.json({ error: true, compile_output: stderr || stdout || err.message, stdout: '', stderr: '' });
            }
            const hexData = await fs.promises.readFile(hexPath, 'utf8');
            await Promise.all([srcPath, elfPath, hexPath].map(p => fs.promises.unlink(p).catch(() => { })));
            return res.json({ error: false, hex: hexData, stdout: 'Compiled for RP2040.', stderr: '', compile_output: '' });
        } catch (e) {
            return res.json({ error: true, compile_output: 'Compilation failed: ' + e.message, stdout: '', stderr: '' });
        }
    }

    // ── STM32 Register-Direct (QEMU Cortex-M3 semihosting) ──────────
    if (target === 'stm32') {
        const PLATFORM = '/app/platform';
        const srcPath = path.join(tmpDir, `stm32_${uid}.c`);
        const elfPath = path.join(tmpDir, `stm32_${uid}.elf`);
        await fs.promises.writeFile(srcPath, sourceCode);
        const compileCmd = [
            'arm-none-eabi-gcc',
            '-mcpu=cortex-m3 -mthumb -O0 -g0',
            '-Wall -Wno-unused-function',
            `-I${PLATFORM}`,
            `"${PLATFORM}/startup_cm3.c"`,
            `"${srcPath}"`,
            `-T "${PLATFORM}/link_cm3.ld"`,
            '--specs=rdimon.specs -lrdimon -lm',
            `-o "${elfPath}"`
        ].join(' ');
        try {
            const { err: ce, stderr: cs } = await queuedExec(compileCmd, { timeout: COMPILE_TIMEOUT });
            if (ce) {
                await fs.promises.unlink(srcPath).catch(() => { });
                return res.json({ error: true, compile_output: cs || ce.message, stdout: '', stderr: '' });
            }
            // Run under QEMU with semihosting
            const runResult = await compileQueue.enqueue(() => new Promise(resolve => {
                const qemuCmd = [
                    'qemu-system-arm',
                    '-machine lm3s6965evb',
                    `-kernel "${elfPath}"`,
                    '-nographic',
                    '-semihosting-config enable=on,target=native',
                    '-monitor none',
                    '-serial none'
                ].join(' ');
                const child = exec(qemuCmd, { timeout: 6000, maxBuffer: MAX_OUTPUT_BUFFER },
                    (err, stdout, stderr) => {
                        Promise.all([srcPath, elfPath].map(p => fs.promises.unlink(p).catch(() => { })));
                        resolve({
                            error: false,
                            stdout: stdout || '',
                            stderr: err && err.killed ? 'Program timed out (6s limit).' : (stderr || ''),
                            compile_output: ''
                        });
                    });
            }));
            return res.json(runResult);
        } catch (e) {
            await Promise.all([srcPath, elfPath].map(p => fs.promises.unlink(p).catch(() => { })));
            return res.status(500).json({ error: true, stderr: 'STM32 compile error: ' + e.message });
        }
    }

    // ── STM32 HAL Stub (native gcc + HAL stubs) ─────────────────────
    if (target === 'stm32_hal') {
        const PLATFORM = '/app/platform';
        const srcPath = path.join(tmpDir, `hal_${uid}.c`);
        const exePath = path.join(tmpDir, `hal_${uid}`);
        await fs.promises.writeFile(srcPath, sourceCode);
        const compileCmd = [
            'gcc -O0 -Wall -Wno-unused-function',
            `-I${PLATFORM}`,
            `"${srcPath}"`,
            `"${PLATFORM}/stm32_hal_stub.c"`,
            '-lm',
            `-o "${exePath}"`
        ].join(' ');
        try {
            const { err: ce, stderr: cs } = await queuedExec(compileCmd, { timeout: COMPILE_TIMEOUT });
            if (ce) {
                await fs.promises.unlink(srcPath).catch(() => { });
                return res.json({ error: true, compile_output: cs || ce.message, stdout: '', stderr: '' });
            }
            const runResult = await compileQueue.enqueue(() => new Promise(resolve => {
                const child = exec(`"${exePath}"`, { timeout: RUN_TIMEOUT, maxBuffer: MAX_OUTPUT_BUFFER },
                    (err, stdout, stderr) => {
                        Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
                        resolve({
                            error: false,
                            stdout: stdout || '',
                            stderr: err && err.killed ? 'Program timed out (5s).' : (stderr || ''),
                            compile_output: ''
                        });
                    });
                if (child.stdin) { child.stdin.write(String(stdin)); child.stdin.end(); }
            }));
            return res.json(runResult);
        } catch (e) {
            await Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
            return res.status(500).json({ error: true, stderr: 'HAL compile error: ' + e.message });
        }
    }

    // ── FreeRTOS POSIX (native gcc + FreeRTOS-Kernel POSIX port) ────
    if (target === 'freertos') {
        const PLATFORM = '/app/platform';
        const FRTOS = '/opt/freertos-kernel';
        const srcPath = path.join(tmpDir, `rtos_${uid}.c`);
        const exePath = path.join(tmpDir, `rtos_${uid}`);
        await fs.promises.writeFile(srcPath, sourceCode);
        const frtosSources = [
            `${FRTOS}/tasks.c`,
            `${FRTOS}/queue.c`,
            `${FRTOS}/list.c`,
            `${FRTOS}/timers.c`,
            `${FRTOS}/event_groups.c`,
            `${FRTOS}/stream_buffer.c`,
            `${FRTOS}/portable/GCC/POSIX/port.c`,
            `${FRTOS}/portable/MemMang/heap_3.c`
        ].map(p => `"${p}"`).join(' ');
        const compileCmd = [
            'gcc -O0 -Wall -Wno-unused-function -Wno-format',
            `-I${FRTOS}/include`,
            `-I${FRTOS}/portable/GCC/POSIX`,
            `-I${PLATFORM}`,
            `"${srcPath}"`,
            frtosSources,
            '-lpthread -lm',
            `-o "${exePath}"`
        ].join(' ');
        try {
            const { err: ce, stderr: cs } = await queuedExec(compileCmd, { timeout: COMPILE_TIMEOUT });
            if (ce) {
                await fs.promises.unlink(srcPath).catch(() => { });
                return res.json({ error: true, compile_output: cs || ce.message, stdout: '', stderr: '' });
            }
            const runResult = await compileQueue.enqueue(() => new Promise(resolve => {
                const child = exec(`"${exePath}"`, { timeout: 8000, maxBuffer: MAX_OUTPUT_BUFFER },
                    (err, stdout, stderr) => {
                        Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
                        resolve({
                            error: false,
                            stdout: stdout || '',
                            stderr: err && err.killed ? 'FreeRTOS program timed out (8s).' : (stderr || ''),
                            compile_output: ''
                        });
                    });
                if (child.stdin) { child.stdin.write(String(stdin)); child.stdin.end(); }
            }));
            return res.json(runResult);
        } catch (e) {
            await Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
            return res.status(500).json({ error: true, stderr: 'FreeRTOS compile error: ' + e.message });
        }
    }


    // Detect C++ vs C
    const isCpp = /^\s*#include\s*<(iostream|fstream|sstream|vector|string|map|set|list|queue|stack|deque|algorithm|functional|numeric|memory|utility|tuple|array|bitset|regex|chrono|thread|mutex|cmath|cstdlib|cstring|cstdio|climits|cfloat|cassert|cctype|ctime)>/m.test(sourceCode)
        || /\b(cout|cin|cerr|endl|std::|(using\s+namespace\s+std))\b/.test(sourceCode)
        || /\b(class\s+\w+|template\s*<|nullptr|auto\s+\w+\s*=|new\s+\w+|delete\s+|virtual\s+|override|public:|private:|protected:)\b/.test(sourceCode);

    const ext = isCpp ? '.cpp' : '.c';
    const compiler = isCpp ? 'g++' : 'gcc';

    // Detect POSIX / Linux System Programming headers → add -lpthread -lrt
    const isPosix = /<(pthread|semaphore|sys\/shm|sys\/wait|sys\/ipc|sys\/mman|sys\/msg|mqueue|signal|unistd)\.h>/.test(sourceCode);
    const posixFlags = isPosix ? '-lpthread -lrt' : '';
    const flags = isCpp
        ? `-std=c++17 -Wall -lm -lstdc++ ${posixFlags}`
        : `-std=c11 -Wall -lm ${posixFlags}`;

    const srcPath = path.join(tmpDir, `prog_${uid}${ext}`);
    const exeName = os.platform() === 'win32' ? `prog_${uid}.exe` : `prog_${uid}`;
    const exePath = path.join(tmpDir, exeName);

    await fs.promises.writeFile(srcPath, sourceCode);

    try {
        // Step 1: Compile
        const { err: compileErr, stderr: compErr, stdout: compOut } = await queuedExec(
            `${compiler} "${srcPath}" -o "${exePath}" ${flags}`,
            { timeout: COMPILE_TIMEOUT }
        );

        if (compileErr) {
            await Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
            return res.json({
                error: true,
                compile_output: compErr || compOut || compileErr.message || 'Unknown compilation error',
                stdout: '', stderr: ''
            });
        }

        // Step 2: Run
        const runResult = await compileQueue.enqueue(() => new Promise((resolve) => {
            const child = exec(`"${exePath}"`, {
                timeout: RUN_TIMEOUT,
                maxBuffer: MAX_OUTPUT_BUFFER
            }, (runErr, runStdout, runStderr) => {
                fs.promises.unlink(srcPath).catch(() => { });
                fs.promises.unlink(exePath).catch(() => { });
                resolve({
                    error: false,
                    stdout: runStdout || '',
                    stderr: runStderr || (runErr && runErr.killed ? 'Program timed out (5s limit).' : ''),
                    compile_output: ''
                });
            });
            if (child.stdin) { child.stdin.write(String(stdin)); child.stdin.end(); }
        }));

        return res.json(runResult);

    } catch (e) {
        await Promise.all([srcPath, exePath].map(p => fs.promises.unlink(p).catch(() => { })));
        return res.status(500).json({ error: true, stderr: 'Server Error: ' + e.message });
    }
});

// ══════════════════════════════════════════════════════
// STATIC FILE SERVER (cached in memory)
// ══════════════════════════════════════════════════════
const staticCache = {};

app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/compile' || req.path === '/health') {
        return next();
    }

    let filePath = path.join(__dirname, req.path === '/' ? 'index.html' : req.path);

    if (staticCache[filePath]) {
        const { data, contentType } = staticCache[filePath];
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.send(data);
    }

    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.woff': 'font/woff'
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (req.path !== '/') {
                return res.status(404).send('Not found');
            }
            const indexPath = path.join(__dirname, 'index.html');
            return fs.readFile(indexPath, (e2, d2) => {
                if (e2) return res.status(404).send('Not found');
                if (d2.length < 5 * 1024 * 1024) staticCache[indexPath] = { data: d2, contentType: 'text/html' };
                res.setHeader('Content-Type', 'text/html');
                res.send(d2);
            });
        }
        if (extname === '.html' && data.length < 5 * 1024 * 1024) staticCache[filePath] = { data, contentType };
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(data);
    });
});

// ══════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Worker ${WORKER_ID}] Server running on port ${PORT}`);
    console.log(`[Worker ${WORKER_ID}] Compile queue max: ${MAX_CONCURRENT_COMPILES}`);
    console.log(`[Worker ${WORKER_ID}] DB: ${DB_PATH}`);
});

server.maxConnections = 500;
server.timeout = 30000;
server.keepAliveTimeout = 10000;
server.headersTimeout = 15000;

process.on('SIGTERM', () => {
    console.log(`[Worker ${WORKER_ID}] Shutting down...`);
    db.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
});
