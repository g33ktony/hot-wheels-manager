import { forwardRef, InputHTMLAttributes } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', disabled, ...props }, ref) => {
        const { mode } = useTheme()
        const isDark = mode === 'dark'

        const inputClasses = `
            input
      ${error
                ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500'
                : ''
            }
            ${isDark
                ? 'bg-slate-700 text-white border-slate-600 placeholder:text-slate-400'
                : 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400'
            }
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      ${className}
    `

        // iOS-specific styles to prevent zoom on focus and improve appearance
        const iosStyles = {
            fontSize: '16px', // Prevent iOS zoom on focus
            WebkitAppearance: 'none' as const,
            WebkitTapHighlightColor: 'transparent',
        }

        return (
            <div>
                {label && (
                    <label className={`block text-sm font-medium mb-2 select-none ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={inputClasses}
                    style={iosStyles}
                    disabled={disabled}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-sm text-danger-600 select-none">{error}</p>
                )}
                {helperText && !error && (
                    <p className={`mt-1.5 text-sm select-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{helperText}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input
