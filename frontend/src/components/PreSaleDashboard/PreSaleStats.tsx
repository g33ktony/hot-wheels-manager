import React from 'react'
import { AlertCircle, Clock, CheckCircle } from 'lucide-react'

interface PreSaleStatsProps {
  statusCounts: {
    pending: number
    'in-progress': number
    completed: number
  }
  totalItems: number
}

const PreSaleStats: React.FC<PreSaleStatsProps> = ({ statusCounts, totalItems }) => {
  const stats = [
    {
      label: 'Total Pre-Ventas',
      value: totalItems,
      icon: null,
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      valueColor: 'text-blue-900',
    },
    {
      label: 'Pendientes',
      value: statusCounts.pending,
      icon: AlertCircle,
      bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      valueColor: 'text-yellow-900',
    },
    {
      label: 'En Progreso',
      value: statusCounts['in-progress'],
      icon: Clock,
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      valueColor: 'text-purple-900',
    },
    {
      label: 'Completadas',
      value: statusCounts.completed,
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      valueColor: 'text-green-900',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`${stat.bgColor} border-2 ${stat.borderColor} rounded-lg p-6 transition-transform hover:scale-105`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${stat.textColor} mb-2`}>{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
              </div>
              {Icon && <Icon className={`w-8 h-8 ${stat.textColor} opacity-60`} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PreSaleStats
