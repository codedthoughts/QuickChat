let ws;
let currentUser = null;
let selectedUser = null;

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const loginBtn = document.getElementById('loginBtn');
const chatInterface = document.getElementById('chatInterface');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const usersList = document.getElementById('usersList');
const currentUserProfile = document.getElementById('currentUserProfile');
const noChatSelected = document.getElementById('noChatSelected');
const activeChat = document.getElementById('activeChat');
const selectedUserInfo = document.getElementById('selectedUserInfo');

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        const user = await response.json();
        
        if (user) {
            currentUser = user;
            loginContainer.style.display = 'none';
            chatInterface.style.display = 'block';
            updateCurrentUserProfile();
            initializeWebSocket();
        } else {
            loginContainer.style.display = 'block';
            chatInterface.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Update current user profile display
function updateCurrentUserProfile() {
    currentUserProfile.innerHTML = `
        <img src="${currentUser.profilePicture}" alt="${currentUser.displayName}">
        <div class="user-info">
            <div class="user-name">${currentUser.displayName}</div>
            <div class="online-status">Online</div>
        </div>
        <button onclick="logout()" style="margin-left: auto;">Logout</button>
    `;
}

// Logout function
function logout() {
    window.location.href = '/api/logout';
}

// Initialize WebSocket connection
function initializeWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    ws = new WebSocket(`${wsProtocol}//${wsHost}`);

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        if (currentUser) {
            // Send authentication
            ws.send(JSON.stringify({
                type: 'auth',
                userId: currentUser._id
            }));
        }
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'onlineUsers') {
            updateOnlineUsers(data.users);
        } else if (data.type === 'message') {
            const msg = data.message;
            if (msg.sender === currentUser._id || msg.sender === selectedUser?._id ||
                msg.receiver === currentUser._id || msg.receiver === selectedUser?._id) {
                displayMessage(msg);
            }
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        // Attempt to reconnect after 3 seconds
        setTimeout(initializeWebSocket, 3000);
    };
}

// Update online users list
function updateOnlineUsers(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        if (user._id !== currentUser._id) {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            if (selectedUser && user._id === selectedUser._id) {
                userElement.classList.add('selected');
            }
            
            userElement.innerHTML = `
                <img src="${user.profilePicture}" alt="${user.displayName}">
                <div class="user-info">
                    <div class="user-name">${user.displayName}</div>
                    <div class="online-status">Online</div>
                </div>
            `;
            
            userElement.onclick = () => selectUser(user);
            usersList.appendChild(userElement);
        }
    });
}

// Select user to chat with
function selectUser(user) {
    selectedUser = user;
    document.querySelectorAll('.user-item').forEach(el => {
        el.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Update selected user info
    selectedUserInfo.innerHTML = `
        <img src="${user.profilePicture}" alt="${user.displayName}">
        <div class="user-info">
            <div class="user-name">${user.displayName}</div>
            <div class="online-status">Online</div>
        </div>
    `;
    
    noChatSelected.style.display = 'none';
    activeChat.style.display = 'flex';
    activeChat.style.flexDirection = 'column';
    
    loadChatHistory();
}

// Load chat history with selected user
async function loadChatHistory() {
    if (!selectedUser) return;
    
    try {
        const response = await fetch(`/api/messages/${selectedUser._id}`);
        const messages = await response.json();
        
        chatMessages.innerHTML = '';
        messages.forEach(displayMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

// Send message
function sendMessage() {
    if (!messageInput.value.trim() || !currentUser || !selectedUser) return;

    const message = {
        type: 'message',
        content: messageInput.value,
        sender: currentUser._id,
        receiver: selectedUser._id
    };

    ws.send(JSON.stringify(message));
    
    // Clear input after sending
    messageInput.value = '';
}

// Display message in chat
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSentByMe = message.sender === currentUser._id;
    
    messageElement.className = `message ${isSentByMe ? 'sent' : 'received'}`;
    
    const timestamp = new Date(message.timestamp);
    const time = timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });

    messageElement.innerHTML = `
        ${message.content}
        <div class="message-time">
            ${time}
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    window.location.href = '/auth/google';
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Check authentication status when page loads
checkAuth();
