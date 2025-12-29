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
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Disminuir cantidad"
            >
                <Minus size={18} className="text-gray-600" />
            </button>

            <input
                type="number"
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
                min={min}
                max={max}
                inputMode="numeric"
                className="w-16 text-center px-2 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                aria-label="Cantidad"
            />

            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Aumentar cantidad"
            >
                <Plus size={18} className="text-gray-600" />
            </button>
        </div>
    )
}
