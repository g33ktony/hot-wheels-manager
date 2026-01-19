import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle, InfoIcon, XCircle } from 'lucide-react'

export type AlertType = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
    type: AlertType
    title: string
    message: string
    details?: string
    onClose?: (id: string) => void
    autoClose?: boolean
    autoCloseDuration?: number
    action?: {
        label: string
        onClick: () => void
    }
}

export const useAlert = () => {
    const [alerts, setAlerts] = useState<(AlertProps & { id: string })[]>([])

    const showAlert = useCallback(
        (alert: AlertProps) => {
            const id = `alert-${Date.now()}-${Math.random()}`
            const newAlert = { ...alert, id }

            setAlerts((prev) => [...prev, newAlert])

            // Auto-close if enabled
            if (alert.autoClose !== false) {
                const duration = alert.autoCloseDuration || 5000
                setTimeout(() => {
                    removeAlert(id)
                }, duration)
            }

            return id
        },
        []
    )

    const removeAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    }, [])

    const error = useCallback(
        (title: string, message: string, details?: string) => {
            return showAlert({
                type: 'error',
                title,
                message,
                details,
                autoClose: true,
                autoCloseDuration: 6000
            })
        },
        [showAlert]
    )

    const success = useCallback(
        (title: string, message: string) => {
            return showAlert({
                type: 'success',
                title,
                message,
                autoClose: true,
                autoCloseDuration: 3000
            })
        },
        [showAlert]
    )

    const warning = useCallback(
        (title: string, message: string) => {
            return showAlert({
                type: 'warning',
                title,
                message,
                autoClose: true,
                autoCloseDuration: 5000
            })
        },
        [showAlert]
    )

    const info = useCallback(
        (title: string, message: string) => {
            return showAlert({
                type: 'info',
                title,
                message,
                autoClose: true,
                autoCloseDuration: 4000
            })
        },
        [showAlert]
    )

    return {
        alerts,
        showAlert,
        removeAlert,
        error,
        success,
        warning,
        info
    }
}

const AlertIcon: React.FC<{ type: AlertType }> = ({ type }) => {
    const iconProps = { size: 20 }
    switch (type) {
        case 'error':
            return <XCircle {...iconProps} className="text-red-500" />
        case 'success':
            return <CheckCircle {...iconProps} className="text-green-500" />
        case 'warning':
            return <AlertCircle {...iconProps} className="text-yellow-500" />
        case 'info':
            return <InfoIcon {...iconProps} className="text-blue-500" />
    }
}

const getBgColor = (type: AlertType): string => {
    switch (type) {
        case 'error':
            return 'bg-red-50 border-red-200'
        case 'success':
            return 'bg-green-50 border-green-200'
        case 'warning':
            return 'bg-yellow-50 border-yellow-200'
        case 'info':
            return 'bg-blue-50 border-blue-200'
    }
}

const getTextColor = (type: AlertType): string => {
    switch (type) {
        case 'error':
            return 'text-red-800'
        case 'success':
            return 'text-green-800'
        case 'warning':
            return 'text-yellow-800'
        case 'info':
            return 'text-blue-800'
    }
}

const Alert: React.FC<AlertProps & { id: string }> = ({
    id,
    type,
    title,
    message,
    details,
    onClose,
    action
}) => {
    return (
        <div
            className={`border rounded-lg p-4 mb-4 ${getBgColor(type)} ${getTextColor(type)}`}
            role="alert"
        >
            <div className="flex items-start gap-3">
                <AlertIcon type={type} />
                <div className="flex-1">
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-sm">{message}</p>
                    {details && (
                        <details className="text-xs mt-2">
                            <summary className="cursor-pointer font-medium">More details</summary>
                            <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-auto max-h-32">
                                {details}
                            </pre>
                        </details>
                    )}
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="text-sm font-medium mt-2 hover:underline"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={() => onClose(id)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        aria-label="Close alert"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    )
}

interface AlertContainerProps {
    alerts: (AlertProps & { id: string })[]
    onRemoveAlert: (id: string) => void
}

export const AlertContainer: React.FC<AlertContainerProps> = ({ alerts, onRemoveAlert }) => {
    return (
        <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
            {alerts.map((alert) => (
                <Alert key={alert.id} {...alert} onClose={onRemoveAlert} />
            ))}
        </div>
    )
}

export default Alert
