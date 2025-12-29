import { Plus, Minus } from 'lucide-react'

interface StepperProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    className?: string
}

export default function Stepper({
    value,
    onChange,
    min = 1,
    max = 999,
    step = 1,
    disabled = false,
    className = ''
}: StepperProps) {
    const handleDecrement = () => {
        const newValue = value - step
        if (newValue >= min) {
            onChange(newValue)
        }
    }

    const handleIncrement = () => {
        const newValue = value + step
        if (newValue <= max) {
            onChange(newValue)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val === '') {
            onChange(min)
        } else {
            const num = parseInt(val, 10)
            if (!isNaN(num)) {
                const clampedValue = Math.max(min, Math.min(max, num))
                onChange(clampedValue)
            }
        }
    }

    return (
        <div className={`flex items-center gap-1 sm:gap-2 ${className}`}>
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Disminuir cantidad"
            >
                <Minus size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600" />
            </button>

            <input
                type="number"
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
                min={min}
                max={max}
                inputMode="numeric"
                className="w-12 sm:w-16 text-center px-1 sm:px-2 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
                aria-label="Cantidad"
            />

            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Aumentar cantidad"
            >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px] text-gray-600" />
            </button>
        </div>
    )
}
