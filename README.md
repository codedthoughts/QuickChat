# QuickChat

A real-time chat application built with Node.js, Express, and WebSocket.

## Features

- Real-time messaging using WebSocket
- Google OAuth authentication
- Online user status
- MongoDB Atlas integration
- Containerization ready

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Google Cloud Console project with OAuth 2.0 credentials

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd quickchat
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
     - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
     - `SESSION_SECRET`: A random string for session encryption

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Development

- `npm run dev`: Start development server with hot-reload
- `npm start`: Start production server
- `npm test`: Run tests

## Project Structure

```
quickchat/
├── src/
│   └── server.js
├── public/
│   ├── index.html
│   └── js/
│       └── chat.js
├── package.json
├── .env
└── README.md
```
