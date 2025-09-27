# Agent1 - Vercel Deployment

This is a paid API agent that uses Gemini AI and integrates with payment systems.

## Vercel Deployment

### Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Set up environment variables in Vercel:
   - `AGENT_USERNAME` - Your agent username
   - `AGENT_PRIVATE_KEY` - Your private key for blockchain operations
   - `GEMINI_API` - Google Gemini API key
   - `FACILITATOR_URL` - X402 facilitator URL
   - `ADDRESS` - Payment address
   - `AGENT_QUERY_URL` - Backend API URL
   - `AGENT2_URL` - Agent2 deployment URL (e.g., https://your-agent2.vercel.app)

### Deployment Steps

1. **Login to Vercel:**
```bash
vercel login
```

2. **Deploy to Vercel:**
```bash
vercel
```

3. **For production deployment:**
```bash
vercel --prod
```

### Environment Variables Setup

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all required environment variables

### API Endpoints

- `GET /health` - Health check (free)
- `GET /weather` - Weather data (paid: $0.01 USDC)
- `GET /chat?question=your_question` - Free chat with Gemini AI
- `GET /chat/pro?question=your_question` - Multi-agent response (paid: $0.01 USDC)

### Local Development

```bash
npm run dev
```

The server will run on `http://localhost:4021`

### Multicall3 Optimization

This agent uses Multicall3 for efficient batch balance reading, significantly improving performance when checking multiple safe balances.
