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

    // Determine which file to serve
    let filePath;
    let contentType;

    if (req.url === '/' || req.url === '/pomodoro.html') {
        filePath = path.join(__dirname, 'pomodoro.html');
        contentType = 'text/html';
    } else if (req.url === '/shimmer.mp3') {
        filePath = path.join(__dirname, 'shimmer.mp3');
        contentType = 'audio/mpeg';
    } else if (req.url === '/manifest.json') {
        filePath = path.join(__dirname, 'manifest.json');
        contentType = 'application/json';
    } else if (req.url === '/sw.js') {
        filePath = path.join(__dirname, 'sw.js');
        contentType = 'application/javascript';
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading file');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at https://${HOSTNAME}:${PORT}/`);
    console.log('Permissions-Policy header set: screen-wake-lock=(self)');
});
