const Database = require('better-sqlite3');
const dbPath = require('path').join(__dirname, 'data', 'virtuallab.db');
const db = new Database(dbPath);
const insert = db.prepare('INSERT OR IGNORE INTO whitelist (email) VALUES (?)');
insert.run('cdemo@skill-lync.com');
insert.run('vdemo@skill-lync.com');
insert.run('regdemo@skill-lync.com');
db.close();
console.log("Test users added to whitelist DB.");
