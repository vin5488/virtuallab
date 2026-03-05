const express = require('express');
const app = express();
app.use(express.static('.'));
app.use(express.json());

app.get('/api/config', (req, res) => {
    const filter = req.query.filter ? req.query.filter.split(',') : [];
    res.json({
        topicFilter: filter,
        platformTitle: 'SkillLync Virtual Lab',
        platformSubtitle: 'Industrial Grade Embedded & ECU Project Platform'
    });
});

app.post('/api/auth/register', (req, res) => {
    res.json({ message: 'OTP sent', otp: '123456' });
});

app.post('/api/auth/verify', (req, res) => {
    res.json({
        token: 'fake-token',
        user: { name: 'Test User', email: req.body.email, role: 'candidate' },
        session: null
    });
});

app.get('/api/progress', (req, res) => res.json({ solvedProjectIds: [] }));

app.listen(8094, () => console.log('Mock server on 8094'));
