const fs = require('fs');
const path = require('path');

const topicsFile = path.join(__dirname, 'topics.json');

function loadTopics() {
    try {
        const data = fs.readFileSync(topicsFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading topics.json:', err.message);
        process.exit(1);
    }
}

function saveTopics(topics) {
    try {
        fs.writeFileSync(topicsFile, JSON.stringify(topics, null, 4), 'utf8');
    } catch (err) {
        console.error('Error writing topics.json:', err.message);
        process.exit(1);
    }
}

function listTopics(topics) {
    console.log('\nCurrent Topics Configuration:');
    console.log('------------------------------');
    Object.entries(topics).forEach(([topic, enabled]) => {
        const status = enabled ? '\x1b[32m[ENABLED]\x1b[0m' : '\x1b[31m[DISABLED]\x1b[0m';
        console.log(`${status} ${topic}`);
    });
    console.log('');
}

const args = process.argv.slice(2);
const command = args[0];
const targetTopic = args[1];

const topics = loadTopics();

if (!command || command === 'list') {
    listTopics(topics);
    process.exit(0);
}

if (command === 'enable' || command === 'disable') {
    if (!targetTopic) {
        console.error('Error: Please specify a topic name. Example: node manage-topic.js enable "Intermediate C"');
        process.exit(1);
    }

    if (topics[targetTopic] === undefined) {
        console.error(`Error: Topic "${targetTopic}" not found in topics.json.`);
        console.log('Use "node manage-topic.js list" to see available topics.');
        process.exit(1);
    }

    const newState = (command === 'enable');
    topics[targetTopic] = newState;
    saveTopics(topics);

    console.log(`\x1b[32mSuccess:\x1b[0m Topic "${targetTopic}" has been ${newState ? 'ENABLED' : 'DISABLED'}.`);
    process.exit(0);
}

console.log('Usage:');
console.log('  node manage-topic.js list');
console.log('  node manage-topic.js enable "Topic Name"');
console.log('  node manage-topic.js disable "Topic Name"');
