const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOSTNAME = '0.0.0.0'; // Listen on all network interfaces

// SSL options
const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

const server = https.createServer(options, (req, res) => {
    // Set the Permissions-Policy header
    res.setHeader('Permissions-Policy', 'screen-wake-lock=(self)');

    // Serve the pomodoro.html file
    const filePath = path.join(__dirname, 'pomodoro.html');

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading pomodoro.html');
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at https://${HOSTNAME}:${PORT}/`);
    console.log('Permissions-Policy header set: screen-wake-lock=(self)');
});
