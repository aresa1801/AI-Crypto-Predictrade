'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SpotOrderFormProps {
  symbol?: string
  currentPrice?: number
  onOrderPlaced?: (order: any) => void
}

export function SpotOrderForm({ 
  symbol = 'BTC/USDT', 
  currentPrice = 45200,
  onOrderPlaced 
}: SpotOrderFormProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState(currentPrice.toString())
  const [total, setTotal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<'success' | 'error' | null>(null)

  // Calculate total when amount or price changes
  const handleAmountChange = (value: string) => {
    setAmount(value)
    if (value && price) {
      const calculatedTotal = (parseFloat(value) * parseFloat(price)).toFixed(2)
      setTotal(calculatedTotal)
    } else {
      setTotal('')
    }
  }

  const handlePriceChange = (value: string) => {
    setPrice(value)
    if (value && amount) {
      const calculatedTotal = (parseFloat(amount) * parseFloat(value)).toFixed(2)
      setTotal(calculatedTotal)
    } else {
      setTotal('')
    }
  }

  const handleTotalChange = (value: string) => {
    setTotal(value)
    if (value && price && parseFloat(price) > 0) {
      const calculatedAmount = (parseFloat(value) / parseFloat(price)).toFixed(8)
      setAmount(calculatedAmount)
    } else {
      setAmount('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const order = {
      symbol,
      side,
      orderType,
      amount: parseFloat(amount),
      price: orderType === 'limit' ? parseFloat(price) : currentPrice,
      total: parseFloat(total)
    }

    // Mock success
    setOrderResult('success')
    onOrderPlaced?.(order)
    
    // Reset form after 2 seconds
    setTimeout(() => {
      setOrderResult(null)
      setAmount('')
      setTotal('')
      setIsSubmitting(false)
    }, 2000)
  }

  const isFormValid = amount && parseFloat(amount) > 0 && total && parseFloat(total) > 0

  return (
    <div className="card-gradient">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-color/50">
        <div>
          <h3 className="text-lg font-semibold gradient-text-blue">Spot Order Entry</h3>
          <p className="text-xs text-text-secondary mt-1">
            {symbol} @ ${currentPrice.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSide('buy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              side === 'buy'
                ? 'bg-accent-emerald text-white shadow-lg shadow-accent-emerald/30'
                : 'bg-surface-secondary/50 text-text-secondary hover:text-text-primary'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              side === 'sell'
                ? 'bg-accent-red text-white shadow-lg shadow-accent-red/30'
                : 'bg-surface-secondary/50 text-text-secondary hover:text-text-primary'
            }`}
          >
            SELL
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Selector */}
        <div>
          <label className="text-sm text-text-secondary mb-2 block">Order Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderType('limit')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                orderType === 'limit'
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'bg-surface-secondary/50 text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              Limit Order
            </button>
            <button
              type="button"
              onClick={() => setOrderType('market')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                orderType === 'market'
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'bg-surface-secondary/50 text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              Market Order
            </button>
          </div>
        </div>

        {/* Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Price (USDT)</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                step="0.01"
                className="w-full px-4 py-3 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:outline-none transition-colors"
                placeholder="Enter price"
              />
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="text-sm text-text-secondary mb-2 block">
            Amount ({symbol.split('/')[0]})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            step="0.00000001"
            className="w-full px-4 py-3 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:outline-none transition-colors"
            placeholder="Enter amount"
          />
          {/* Quick amount buttons */}
          <div className="flex gap-2 mt-2">
            {['25%', '50%', '75%', '100%'].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => {
                  // Mock available balance calculation
                  const mockBalance = 10000
                  const maxAmount = (mockBalance * parseFloat(percent) / 100) / (orderType === 'limit' ? parseFloat(price) : currentPrice)
                  handleAmountChange(maxAmount.toFixed(8))
                }}
                className="flex-1 px-2 py-1.5 text-xs rounded bg-surface-secondary/50 text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                {percent}
              </button>
            ))}
          </div>
        </div>

        {/* Total Input */}
        <div>
          <label className="text-sm text-text-secondary mb-2 block">Total (USDT)</label>
          <div className="relative">
            <input
              type="number"
              value={total}
              onChange={(e) => handleTotalChange(e.target.value)}
              step="0.01"
              className="w-full px-4 py-3 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-text-primary focus:border-accent-blue/50 focus:outline-none transition-colors"
              placeholder="Total value"
            />
            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          </div>
        </div>

        {/* Order Summary */}
        {isFormValid && (
          <div className="p-3 rounded-lg bg-surface-secondary/50 border border-border-color/30">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-text-secondary">Order Summary</span>
              <span className={`font-medium ${side === 'buy' ? 'text-accent-emerald' : 'text-accent-red'}`}>
                {side.toUpperCase()} {orderType.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Amount:</span>
                <span className="text-text-primary font-medium">{amount} {symbol.split('/')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Price:</span>
                <span className="text-text-primary font-medium">
                  ${orderType === 'limit' ? price : currentPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total:</span>
                <span className="text-text-primary font-medium">${parseFloat(total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border-color/30">
                <span className="text-text-secondary">Est. Fee (0.1%):</span>
                <span className="text-text-primary font-medium">${(parseFloat(total) * 0.001).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`w-full py-3.5 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            side === 'buy'
              ? 'bg-gradient-to-r from-accent-emerald to-accent-teal hover:shadow-lg hover:shadow-accent-emerald/30 disabled:from-accent-emerald/50 disabled:to-accent-teal/50'
              : 'bg-gradient-to-r from-accent-red to-accent-orange hover:shadow-lg hover:shadow-accent-red/30 disabled:from-accent-red/50 disabled:to-accent-orange/50'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {side === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {side === 'buy' ? 'Buy' : 'Sell'} {symbol.split('/')[0]}
            </>
          )}
        </button>

        {/* Order Result */}
        {orderResult === 'success' && (
          <div className="p-3 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-accent-emerald" />
            <span className="text-sm text-accent-emerald font-medium">Order placed successfully!</span>
          </div>
        )}
        {orderResult === 'error' && (
          <div className="p-3 rounded-lg bg-accent-red/20 border border-accent-red/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent-red" />
            <span className="text-sm text-accent-red font-medium">Order failed. Please try again.</span>
          </div>
        )}
      </form>

      {/* Available Balance Info */}
      <div className="mt-4 pt-4 border-t border-border-color/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Available Balance:</span>
          <div className="text-right">
            <p className="text-text-primary font-medium">10,000.00 USDT</p>
            <p className="text-text-secondary">0.25 {symbol.split('/')[0]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
