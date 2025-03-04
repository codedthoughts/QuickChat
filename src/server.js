const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
require('./config/passport');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://quickchat-m575.onrender.com' 
        : 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Store connected clients with their user info
const clients = new Map();

// Authentication Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

app.get('/api/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Chat API Routes
app.get('/api/messages/:userId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user._id }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('sender', 'displayName profilePicture')
        .populate('receiver', 'displayName profilePicture');

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// WebSocket connection handling
wss.on('connection', async (ws, req) => {
    console.log('New client connected');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'auth') {
                // Store user connection
                clients.set(ws, { userId: data.userId });
                // Update user online status
                await User.findByIdAndUpdate(data.userId, { isOnline: true });
                // Broadcast online users
                broadcastOnlineUsers();
            } else if (data.type === 'message') {
                // Save message to database
                const newMessage = await Message.create({
                    sender: data.sender,
                    receiver: data.receiver,
                    content: data.content,
                    timestamp: new Date()
                });

                // Send to both sender and receiver
                const messageToSend = {
                    type: 'message',
                    message: {
                        _id: newMessage._id,
                        content: newMessage.content,
                        sender: data.sender,
                        receiver: data.receiver,
                        timestamp: newMessage.timestamp
                    }
                };

                // Send to receiver if online
                const targetClient = Array.from(clients.entries())
                    .find(([_, userData]) => userData.userId === data.receiver);

                if (targetClient) {
                    targetClient[0].send(JSON.stringify(messageToSend));
                }

                // Send back to sender
                ws.send(JSON.stringify(messageToSend));
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', async () => {
        const userData = clients.get(ws);
        if (userData) {
            // Update user offline status
            await User.findByIdAndUpdate(userData.userId, { 
                isOnline: false,
                lastSeen: new Date()
            });
            clients.delete(ws);
            broadcastOnlineUsers();
        }
        console.log('Client disconnected');
    });
});

// Broadcast online users to all connected clients
async function broadcastOnlineUsers() {
    const onlineUsers = await User.find({ isOnline: true }, 'displayName email profilePicture');
    const message = JSON.stringify({
        type: 'onlineUsers',
        users: onlineUsers
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
