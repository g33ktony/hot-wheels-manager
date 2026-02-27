import React from 'react'
import { usePreSaleItems } from '@/hooks/usePresale'
import { useStore } from '@/contexts/StoreContext'
import { AlertCircle, Calendar, DollarSign } from 'lucide-react'

const PreSaleAlertSection: React.FC = () => {
    const { selectedStore } = useStore()
    const { data: preSaleItems = [] } = usePreSaleItems({ status: 'active', storeId: selectedStore || undefined })

    // Filter items with upcoming dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingItems = preSaleItems
        .filter((item: any) => {
            if (!item.endDate) return false
            const endDate = new Date(item.endDate)
            endDate.setHours(0, 0, 0, 0)
            return endDate >= today && item.availableQuantity > 0
        })
        .sort((a: any, b: any) => {
            const dateA = new Date(a.endDate).getTime()
            const dateB = new Date(b.endDate).getTime()
            return dateA - dateB
        })
        .slice(0, 5) // Show only top 5

    if (upcomingItems.length === 0) {
        return null
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Active Pre-Sales</h3>
            </div>

            <div className="space-y-3">
                {upcomingItems.map((item: any) => {
                    const endDate = new Date(item.endDate)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    endDate.setHours(0, 0, 0, 0)

                    const isToday = endDate.getTime() === today.getTime()
                    const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                    return (
                        <div
                            key={item._id}
                            className={`p-3 rounded-lg border-2 transition ${isToday
                                ? 'bg-red-50 border-red-300 scale-105'
                                : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Photo */}
                                {item.photo && (
                                    <div className="flex-shrink-0">
                                        <img
                                            src={item.photo}
                                            alt={item.carModel}
                                            className={`${isToday ? 'w-20 h-20' : 'w-16 h-16'} object-cover rounded border border-gray-300`}
                                        />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`${isToday ? 'text-lg' : 'text-base'} font-semibold text-gray-900 truncate`}>
                                            {item.carModel || item.carId}
                                        </h4>
                                        {isToday && (
                                            <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                                                TODAY
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{item.carId}</p>

                                    {/* Details */}
                                    <div className={`flex gap-4 mt-2 ${isToday ? 'text-base' : 'text-sm'}`}>
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="font-semibold text-green-600">
                                                ${item.finalPricePerUnit.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className={`w-4 h-4 ${isToday ? 'text-red-600' : 'text-blue-600'}`} />
                                            <span className={`font-semibold ${isToday ? 'text-red-600' : 'text-blue-600'}`}>
                                                {isToday ? '🔴 Today' : `${daysUntil}d`}
                                            </span>
                                        </div>
                                        <div className="text-gray-600">
                                            {item.availableQuantity} units
                                        </div>
                                    </div>
                                </div>

                                {/* Large TODAY badge */}
                                {isToday && (
                                    <div className="text-center flex-shrink-0">
                                        <div className="text-4xl font-bold text-red-600 animate-pulse">⏰</div>
                                        <p className="text-xs font-bold text-red-600 mt-1">ARRIVING</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default PreSaleAlertSection
