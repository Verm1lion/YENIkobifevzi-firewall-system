const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/security-rules', require('./routes/securityRules'));
app.use('/api/rule-groups', require('./routes/ruleGroups'));
app.use('/api/interfaces', require('./routes/interfaces'));
app.use('/api/nat', require('./routes/nat'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/dns', require('./routes/dns'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/system', require('./routes/system'));
app.use('/api/security', require('./routes/security'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/updates', require('./routes/updates'));

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});