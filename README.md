# PREDICTRADE - AI Crypto Analysis Platform

A professional, full-stack AI-powered cryptocurrency trading analysis platform built with Next.js, TypeScript, and Recharts.

## Features

### 📊 Dashboard
- Real-time market snapshot with top assets
- Confidence gauge visualization for top predictions
- Complete prediction table with status tracking
- At-a-glance market metrics and analysis

### 🎯 Predictions
- Detailed price charts with technical indicators
- Confidence levels and directional predictions
- Risk/reward ratio analysis
- Multiple timeframe analysis (1h, 4h, 1d, 1w)

### ⚠️ Risk Simulator
- Interactive Monte Carlo simulation
- Position sizing calculator
- Drawdown analysis with equity projections
- Risk tolerance configuration
- Expected value calculations

### 📈 Backtest
- Historical strategy performance analysis
- Equity curve visualization
- Comprehensive trade logs
- Sharpe ratio, profit factor, and other metrics
- Recovery factor and winning streak analysis

### ⚙️ Settings
- AI model preference selection (Fast, Balanced, Accurate)
- Risk tolerance configuration (Conservative, Moderate, Aggressive)
- API key management
- Notification preferences

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Project Structure

```
/vercel/share/v0-project
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home (redirects to dashboard)
│   └── (app)/
│       ├── layout.tsx             # App wrapper layout
│       ├── dashboard/
│       │   └── page.tsx
│       ├── predictions/
│       │   └── page.tsx
│       ├── risk/
│       │   └── page.tsx
│       ├── backtest/
│       │   └── page.tsx
│       └── settings/
│           └── page.tsx
├── components/
│   ├── sidebar.tsx               # Navigation sidebar
│   ├── topbar.tsx                # Top navigation bar
│   ├── mobile-nav.tsx            # Mobile menu
│   ├── dashboard/
│   │   ├── market-snapshot.tsx
│   │   ├── prediction-gauges.tsx
│   │   └── recent-predictions.tsx
│   ├── predictions/
│   │   ├── prediction-chart.tsx
│   │   └── prediction-filters.tsx
│   ├── risk/
│   │   ├── risk-simulator-form.tsx
│   │   └── risk-results.tsx
│   ├── backtest/
│   │   ├── backtest-chart.tsx
│   │   ├── backtest-metrics.tsx
│   │   └── trade-log.tsx
│   └── settings/
│       └── settings-form.tsx
├── lib/
│   ├── types.ts                  # TypeScript interfaces
│   ├── mock-data.ts              # Sample data
│   └── utils.ts                  # Utility functions
├── app/
│   └── globals.css               # Global styles
├── tailwind.config.ts            # Tailwind configuration
└── package.json
```

## Color Scheme

- **Background**: `#0B0F19` (Dark Navy)
- **Surface Primary**: `#111827` (Charcoal)
- **Surface Secondary**: `#1A202C` (Dark Gray)
- **Text Primary**: `#F5F7FA` (Off White)
- **Text Secondary**: `#B0BAC9` (Light Gray)
- **Primary Blue**: `#3B82F6`
- **Success Green**: `#10B981`
- **Warning Amber**: `#F59E0B`
- **Error Red**: `#EF4444`

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

### Features Overview

#### Dashboard
- View all active predictions at a glance
- Monitor market conditions and top movers
- Confidence level indicators for each prediction

#### Predictions Page
- Select different crypto assets
- View detailed price analysis charts
- Change analysis timeframe
- Review risk/reward metrics

#### Risk Simulator
- Adjust initial capital and risk parameters
- Run Monte Carlo simulations
- View projected equity curves
- Analyze win rate and profit factor impacts

#### Backtest
- Review historical strategy performance
- View equity growth over time
- Examine individual trade logs
- Compare strategy metrics (Sharpe ratio, max drawdown, etc.)

#### Settings
- Configure API preferences
- Set risk tolerance level
- Enable/disable notifications
- Select AI model preference

## Design System

### Responsive Design
- **Mobile**: Optimized for screens < 768px
- **Tablet**: Enhanced layout for 768px - 1024px
- **Desktop**: Full features available for screens > 1024px

### Components
- Consistent card styling with borders
- Accessible button states and focus indicators
- Smooth transitions and hover effects
- Proper contrast ratios (WCAG AA)

## Data Structure

### Crypto Asset
```typescript
interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
}
```

### Prediction
```typescript
interface Prediction {
  id: string
  asset: CryptoAsset
  confidenceLevel: number
  predictedDirection: 'up' | 'down'
  predictedPrice: number
  timeframe: '1h' | '4h' | '1d' | '1w'
  expectedValue: number
  riskReward: number
  createdAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'correct' | 'incorrect'
}
```

## Future Enhancements

- Real API integration for live crypto data
- User authentication and accounts
- Historical data persistence
- Real-time WebSocket updates
- Email and push notifications
- Advanced backtesting with multiple strategies
- Portfolio tracking
- Trade execution capabilities

## License

MIT - Created with v0

## Support

For issues or questions, please refer to the documentation or contact support.
