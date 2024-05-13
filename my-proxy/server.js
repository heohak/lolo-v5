const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// General CORS Policy for your proxy
app.use(cors({
    origin: 'http://localhost:63342',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use('/webparser', createProxyMiddleware({
    target: 'https://uptime-mercury-api.azurewebsites.net/webparser',
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            let bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: function (proxyRes, req, res) {
        res.header('Access-Control-Allow-Origin', '*');
    }
}));


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
