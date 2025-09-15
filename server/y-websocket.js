#!/usr/bin/env node
/* Minimal Yjs WebSocket server */
const http = require('http')
const WebSocket = require('ws')
const setupWSConnection = require('y-websocket/bin/utils.js').setupWSConnection

const PORT = process.env.YWS_PORT || 1234
const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('y-websocket running')
})
const wss = new WebSocket.Server({ server })
wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true })
})
server.listen(PORT, () => console.log(`y-websocket on :${PORT}`))

