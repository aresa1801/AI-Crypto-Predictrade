'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface AccessibleSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
  description?: string
  disabled?: boolean
}

export function AccessibleSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  description,
  disabled = false,
}: AccessibleSliderProps) {
  const sliderRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Calculate percentage for visual feedback
  const percentage = ((value - min) / (max - min)) * 100

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value))
    },
    [onChange]
  )

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp)
      return () => window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseUp])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={`slider-${label}`} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <span className="text-sm font-semibold text-accent-blue">
          {value.toFixed(2)}{unit}
        </span>
      </div>

      {description && (
        <p id={`slider-${label}-desc`} className="text-xs text-text-secondary">
          {description}
        </p>
      )}

      <div className="relative pt-1">
        <input
          ref={sliderRef}
          id={`slider-${label}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          disabled={disabled}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-describedby={description ? `slider-${label}-desc` : undefined}
          role="slider"
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`,
            WebkitAppearance: 'none',
          }}
        />

        {/* Custom track background */}
        <style>{`
          input[type='range']::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent-blue);
            cursor: pointer;
            box-shadow: 0 0 0 3px var(--surface-primary), 0 0 0 5px var(--accent-blue);
            transition: box-shadow 0.2s ease;
          }

          input[type='range']::-webkit-slider-thumb:active {
            box-shadow: 0 0 0 3px var(--surface-primary), 0 0 0 7px var(--accent-blue);
          }

          input[type='range']::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent-blue);
            cursor: pointer;
            border: 2px solid var(--surface-primary);
            box-shadow: 0 0 0 2px var(--accent-blue);
            transition: box-shadow 0.2s ease;
          }

          input[type='range']::-moz-range-thumb:active {
            box-shadow: 0 0 0 4px var(--accent-blue);
          }

          input[type='range']::-moz-range-track {
            background: transparent;
            border: none;
          }

          input[type='range']::-moz-range-progress {
            background: var(--accent-blue);
            height: 8px;
            border-radius: 4px;
          }
        `}</style>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
