const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/noetisnet');

const UserSchema = new mongoose.Schema({
    username: String
});
const MessageSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// Check if username exists
app.post('/register', async (req, res) => {
    const { username } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'Username is taken' });
    }
    const newUser = new User({ username });
    await newUser.save();
    res.json({ message: 'User registered', username });
});

// Get messages history
app.get('/messages', async (req, res) => {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
    res.json(messages);
});

// WebSocket for real-time messaging
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('sendMessage', async ({ username, message }) => {
        const newMessage = new Message({ username, message });
        await newMessage.save();
        io.emit('receiveMessage', newMessage);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start Server
server.listen(5000, () => {
    console.log('Server running on port 5000');
});
