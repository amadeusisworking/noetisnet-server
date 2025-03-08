const PORT = process.env.PORT || 5000;
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
mongoose.connect('mongodb://localhost:27017/noetisnet', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

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
    try {
        const { username } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is taken' });
        }
        const newUser = new User({ username });
        await newUser.save();
        res.json({ message: 'User registered', username });
    } catch (error) {
        console.error('Error in /register:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get messages history
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        res.json(messages);
    } catch (error) {
        console.error('Error in /messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// WebSocket for real-time messaging
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('sendMessage', async ({ username, message }) => {
        try {
            const newMessage = new Message({ username, message });
            await newMessage.save();
            io.emit('receiveMessage', newMessage);
        } catch (error) {
            console.error('Error in sendMessage:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
