# PREDICTRADE - AI-Powered Spot Crypto Trading & Prediction Market Platform

A professional, full-stack AI-powered cryptocurrency spot trading platform with integrated prediction market support (Polymarket), multi-agent AI system (CrewAI), and comprehensive risk management. Optimized for spot trading with real-time market analysis and AI-driven trading signals.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel/Next.js)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  Dashboard  │ │ Predictions │ │    Risk     │ │  Backtest  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                         │ WebSocket/REST API                     │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                   Backend (Railway/FastAPI)                      │
│  ┌──────────────────────┴──────────────────────┐                │
│  │              API Gateway (FastAPI)           │                │
│  └──────────────────────┬──────────────────────┘                │
│                         │                                        │
│  ┌──────────────────────┼──────────────────────┐                │
│  │         AI & Risk Management Core            │                │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────┐ │                │
│  │  │    Data     │ │  Strategy   │ │  Risk  │ │                │
│  │  │ Aggregator  │ │   Agent     │ │ Agent  │ │                │
│  │  └─────────────┘ └─────────────┘ └────────┘ │                │
│  └──────────────────────┬──────────────────────┘                │
│                         │                                        │
│  ┌──────────────────────┼──────────────────────┐                │
│  │            Execution Layer                   │                │
│  │  ┌─────────────────┐ ┌─────────────────────┐│                │
│  │  │  CEX Connector  │ │ Polymarket Connector││                │
│  │  │  (CCXT/Binance) │ │    (@polybased/sdk) ││                │
│  │  └─────────────────┘ └─────────────────────┘│                │
│  └─────────────────────────────────────────────┘                │
│                         │                                        │
│  ┌──────────────────────┼──────────────────────┐                │
│  │              Data Layer                      │                │
│  │  ┌─────────────────┐ ┌─────────────────────┐│                │
│  │  │   PostgreSQL    │ │       Redis         ││                │
│  │  │  (History/Logs) │ │   (Cache/Queues)    ││                │
│  │  └─────────────────┘ └─────────────────────┘│                │
│  └─────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## ✨ Features

### 🤖 AI Multi-Agent System (CrewAI)
- **Data Aggregator Agent**: Collects market data, sentiment, and technical indicators
- **Strategy Agent**: Generates trading signals using LLM and technical analysis
- **Risk Management Agent**: Validates signals and enforces risk rules

### 📊 Spot Trading & Execution
- **CEX Integration**: Binance, Bybit via CCXT library (Spot Markets)
- **Polymarket Integration**: Prediction market trading for event-based opportunities
- **Order Management**: Unified spot order execution with real-time validation
- **Portfolio Tracking**: Comprehensive spot holdings and performance monitoring

### 🛡️ Risk Management (Spot Trading Optimized)
- **Daily Loss Limits**: Automatic protection at configurable thresholds
- **Position Sizing**: Kelly Criterion and volatility-based sizing for spot positions
- **VaR/CVaR**: Value at Risk calculations for spot portfolio monitoring
- **Circuit Breakers**: System-level protection against failures
- **Dynamic Stop-Loss**: ATR-based stop-loss placement for spot trades
- **Portfolio Rebalancing**: AI-driven spot portfolio optimization

### 📈 Frontend Dashboard (Spot Trading Focused)
- Real-time spot market data via WebSocket
- AI-powered spot trading signals and recommendations
- Spot position and order management
- Portfolio performance tracking and analytics
- Risk metrics visualization for spot trading
- Prediction market integration display
- Live price alerts and notifications

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Recharts |
| **Backend** | FastAPI (Python 3.11+), AsyncIO |
| **Database** | PostgreSQL, SQLAlchemy |
| **Cache** | Redis |
| **AI** | CrewAI, LangChain, OpenRouter/OpenAI |
| **Trading** | CCXT, Polymarket SDK |
| **Deployment** | Docker, Railway, Vercel |

## 📁 Project Structure

```
AI-Crypto-Predictrade/
├── frontend/                    # Next.js dashboard
│   ├── app/                     # App router pages
│   ├── components/              # React components
│   ├── lib/                     # Utilities & API client
│   └── package.json
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── api/routes/          # API endpoints
│   │   ├── core/                # Config & security
│   │   ├── models/              # Database models
│   │   └── services/
│   │       ├── ai/              # CrewAI agents
│   │       ├── execution/       # CEX & Polymarket connectors
│   │       └── risk/            # Risk management
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml           # Local development
├── railway.toml                 # Railway deployment
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- pnpm (for frontend)

### Quick Start with Docker

```bash
# Clone repository
git clone https://github.com/your-username/AI-Crypto-Predictrade.git
cd AI-Crypto-Predictrade

# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# Edit with your backend URL

# Start development server
pnpm dev
```

## 🔒 Security Configuration

### API Key Management
1. **Never hardcode API keys** - Use environment variables
2. **IP Whitelisting** - Configure static IPs in Railway for exchange API access
3. **Minimal Permissions** - Create API keys with only required scopes (no withdrawal)
4. **Key Rotation** - Rotate keys every 3-6 months

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXCHANGE_BINANCE_API_KEY` | Binance API Key |
| `EXCHANGE_BINANCE_API_SECRET` | Binance Secret |
| `EXCHANGE_BINANCE_TESTNET` | Use testnet (true/false) |
| `AI_OPENROUTER_API_KEY` | OpenRouter API Key for LLM |
| `RISK_MAX_POSITION_SIZE_PCT` | Max position size (default: 2%) |
| `RISK_DAILY_LOSS_LIMIT_PCT` | Daily loss limit (default: 5%) |
| `RISK_MAX_DRAWDOWN_PCT` | Max drawdown (default: 15%) |

## 📚 API Documentation

Once the backend is running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/bot/status` | Get bot status |
| `POST /api/v1/bot/start` | Start trading bot |
| `POST /api/v1/bot/stop` | Stop trading bot |
| `GET /api/v1/market/price/{symbol}` | Get market price |
| `GET /api/v1/risk/metrics` | Get risk metrics |
| `POST /api/v1/risk/kill-switch` | Control kill switch |
| `WS /api/v1/ws/market` | Real-time market data |
| `WS /api/v1/ws/bot` | Bot status updates |

## 🚢 Deployment

### Railway (Backend)
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy using `railway.toml` configuration

### Vercel (Frontend)
1. Connect your GitHub repository
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy automatically

## 📄 License

MIT License - See LICENSE file for details.
