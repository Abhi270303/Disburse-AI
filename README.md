# Disburse AI

A comprehensive Web3 payment and AI chat platform built on Polygon Amoy testnet, featuring stealth wallet technology, Safe multi-signature wallets, and AI-powered chat interfaces.

## 🚀 Overview

Disburse AI is a full-stack Web3 application that combines cutting-edge blockchain technology with AI capabilities. The platform enables secure, private payments using stealth addresses and multi-signature wallets while providing an intelligent chat interface for user interaction.

## 🏗️ Architecture

The project consists of five main components:

```
Disburse-AI/
├── client-app/          # Next.js wallet application
├── disburse-ui/         # AI chat interface
├── server/              # TypeScript Express backend
├── agent1/              # Payment agent with Gemini AI
└── agent2/              # Enhanced payment agent with Gemini 2.0 Flash
```

## 📁 Components

### 1. Client App (`client-app/`)
**Next.js 15.4.6 | React 19 | TypeScript | Tailwind CSS**

A modern wallet application featuring stealth address generation and Safe wallet integration.

**Key Features:**
- 🔐 **Stealth Address Generation**: Private, one-time addresses for secure payments
- 🏦 **Safe Multi-Sig Wallets**: Enterprise-grade security for fund management
- 💰 **USDC/USDT Support**: Polygon Amoy testnet token support
- 🎨 **Modern UI**: Built with Radix UI and Tailwind CSS
- 🔗 **Wallet Integration**: Privy authentication with multiple wallet support

**Tech Stack:**
- Next.js 15.4.6 with App Router
- React 19 with TypeScript
- Tailwind CSS for styling
- Radix UI components
- Viem for blockchain interactions
- Safe Protocol Kit for multi-sig wallets
- Fluidkey Stealth Account Kit

**Quick Start:**
```bash
cd client-app
npm install
npm run dev
```

### 2. Disburse UI (`disburse-ui/`)
**Next.js 14 | AI Chat Interface | RainbowKit**

An AI-powered chat interface with Web3 wallet integration and advanced UI components.

**Key Features:**
- 🤖 **AI Chat Interface**: Intelligent conversation capabilities
- 💬 **Real-time Messaging**: WebSocket-based chat system
- 🎨 **Advanced UI**: Comprehensive component library
- 🔗 **Web3 Integration**: RainbowKit wallet connection
- 📱 **Responsive Design**: Mobile-first approach

**Tech Stack:**
- Next.js 14 with App Router
- AI SDK for chat functionality
- RainbowKit for wallet connection
- Framer Motion for animations
- Recharts for data visualization
- Shiki for syntax highlighting

**Quick Start:**
```bash
cd disburse-ui
npm install
npm run dev
```

### 3. Server (`server/`)
**TypeScript | Express | Supabase | Viem**

A robust backend API server handling blockchain operations and data management.

**Key Features:**
- 🔗 **Blockchain Integration**: Viem for Ethereum/Polygon interactions
- 🗄️ **Database Management**: Supabase for data persistence
- 🔐 **Authentication**: JWT-based user authentication
- 📊 **API Endpoints**: RESTful API for frontend communication
- 🛡️ **Security**: Rate limiting and CORS protection

**Tech Stack:**
- TypeScript with Express.js
- Supabase for database
- Viem for blockchain interactions
- JWT for authentication
- CORS and rate limiting

**Quick Start:**
```bash
cd server
npm install
npm run dev
```

### 4. Agent 1 (`agent1/`)
**Node.js | Gemini AI | X402 Protocol | Stealth Wallets**

A payment processing agent with AI capabilities and stealth wallet integration.

**Key Features:**
- 🤖 **Gemini AI Integration**: Google's AI for intelligent processing
- 💳 **X402 Protocol**: Coinbase's payment protocol
- 🔐 **Stealth Wallet Support**: Private address generation
- 🔄 **Payment Processing**: Automated transaction handling
- 📡 **Webhook Support**: Real-time payment notifications

**Tech Stack:**
- Node.js with ES modules
- Google Generative AI (Gemini)
- X402 payment protocol
- Stealth Account Kit
- Safe Protocol Kit

**Quick Start:**
```bash
cd agent1
npm install
npm start
```

### 5. Agent 2 (`agent2/`)
**Node.js | Gemini 2.0 Flash | Enhanced Features**

An enhanced payment agent with the latest Gemini 2.0 Flash model and improved capabilities.

**Key Features:**
- 🚀 **Gemini 2.0 Flash**: Latest AI model with enhanced capabilities
- ⚡ **Improved Performance**: Faster processing and response times
- 🔧 **Enhanced Features**: Advanced payment processing
- 📊 **Better Analytics**: Improved monitoring and reporting
- 🛠️ **Updated Dependencies**: Latest X402 libraries

**Tech Stack:**
- Node.js with ES modules
- Gemini 2.0 Flash AI model
- X402 v0.6.5 libraries
- Enhanced Stealth Account Kit
- Improved Safe Protocol Kit

**Quick Start:**
```bash
cd agent2
npm install
npm start
```

## 🌐 Network Configuration

**Primary Network**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology/
- **Currency**: POL
- **Explorer**: https://amoy.polygonscan.com/

**Supported Tokens**:
- **USDC**: `0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582`
- **USDT**: `0xfa86C7c30840694293a5c997f399d00A4eD3cDD8`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Abhi270303/Disburse-AI.git
cd Disburse-AI
```

2. **Install dependencies for each component:**
```bash
# Client App
cd client-app && npm install && cd ..

# Disburse UI
cd disburse-ui && npm install && cd ..

# Server
cd server && npm install && cd ..

# Agent 1
cd agent1 && npm install && cd ..

# Agent 2
cd agent2 && npm install && cd ..
```

3. **Set up environment variables:**
Create `.env` files in each component directory with the required environment variables.

### Development

**Start all services:**
```bash
# Terminal 1 - Client App
cd client-app && npm run dev

# Terminal 2 - Disburse UI
cd disburse-ui && npm run dev

# Terminal 3 - Server
cd server && npm run dev

# Terminal 4 - Agent 1
cd agent1 && npm start

# Terminal 5 - Agent 2
cd agent2 && npm start
```

## 🔧 Configuration

### Environment Variables

Each component requires specific environment variables. See individual README files in each directory for detailed configuration.

### Network Setup

1. Add Polygon Amoy testnet to your wallet:
   - Network Name: Polygon Amoy Testnet
   - RPC URL: https://rpc-amoy.polygon.technology/
   - Chain ID: 80002
   - Currency Symbol: POL
   - Block Explorer: https://amoy.polygonscan.com/

2. Get test POL tokens from the [Polygon Faucet](https://faucet.polygon.technology/)

## 🏗️ Build & Deployment

### Production Build

**Client App:**
```bash
cd client-app
npm run build
npm start
```

**Disburse UI:**
```bash
cd disburse-ui
npm run build
npm start
```

**Server:**
```bash
cd server
npm run build
npm start
```

### Deployment

The applications are designed to be deployed on:
- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Railway, Render, or any Node.js hosting
- **Agents**: Railway, Render, or any Node.js hosting

## 📚 API Documentation

### Client App API
- **Stealth Address Generation**: `/api/stealth`
- **User Authentication**: Privy integration
- **Wallet Operations**: Viem-based transactions

### Server API
- **User Management**: JWT-based authentication
- **Payment Processing**: X402 protocol integration
- **Database Operations**: Supabase integration

### Chat API
- **Session Management**: Create, read, update, delete chat sessions
- **Message Handling**: Real-time message processing
- **AI Integration**: Gemini AI responses

## 🛡️ Security Features

- **Stealth Addresses**: Private, one-time addresses for payments
- **Multi-Signature Wallets**: Safe protocol for fund security
- **JWT Authentication**: Secure user sessions
- **Rate Limiting**: API protection
- **CORS Configuration**: Cross-origin security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the individual package.json files for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the individual component README files
- Review the API documentation

## 🔄 Recent Updates

- ✅ **Production Build**: All components now build successfully
- ✅ **TypeScript**: Resolved all type errors
- ✅ **ESLint**: Fixed all linting issues
- ✅ **Polygon Amoy**: Full testnet support
- ✅ **Safe Integration**: Working multi-sig wallet support
- ✅ **Stealth Addresses**: Private payment system operational

---

**Built with ❤️ using Next.js, React, TypeScript, and Web3 technologies**
