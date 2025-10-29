import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePreSaleItem } from '@/hooks/usePresale'
import { useUpdatePreSaleFinalPrice } from '@/hooks/usePresale'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import { DollarSign, Calendar, ArrowLeft } from 'lucide-react'
import LoadingSpinner from '@/components/common/Loading'

interface PreSaleEditItem {
    _id: string
    carId: string
    carModel?: string
    basePricePerUnit: number
    markupPercentage: number
    finalPricePerUnit: number
    condition?: string
    notes?: string
    startDate: string
    endDate?: string
}

export default function PreSaleEditPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: item, isLoading, error } = usePreSaleItem(id || '')
    const updateFinalPrice = useUpdatePreSaleFinalPrice()

    const [formData, setFormData] = useState<Partial<PreSaleEditItem>>({
        finalPricePerUnit: 0,
        condition: 'mint',
        notes: '',
        endDate: '',
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (item) {
            const formatDate = (date: any) => {
                if (!date) return ''
                if (date instanceof Date) return date.toISOString().split('T')[0]
                if (typeof date === 'string') return date.split('T')[0]
                return ''
            }

            setFormData({
                _id: item._id,
                carId: item.carId,
                carModel: (item as any).carModel,
                basePricePerUnit: item.basePricePerUnit,
                markupPercentage: item.markupPercentage,
                finalPricePerUnit: item.finalPricePerUnit,
                condition: (item as any).condition || 'mint',
                notes: (item as any).notes || '',
                startDate: formatDate(item.startDate),
                endDate: formatDate((item as any).endDate),
            })
        }
    }, [item])

    const handleSave = async () => {
        if (!formData._id || !formData.finalPricePerUnit) {
            return
        }

        setIsSaving(true)
        try {
            await updateFinalPrice.mutateAsync({
                id: formData._id,
                finalPrice: formData.finalPricePerUnit
            })
            navigate('/presale/dashboard')
        } catch (error) {
            console.error('Error updating presale:', error)
        } finally {
            setIsSaving(false)
        }
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-red-800 font-semibold mb-2">Error loading presale item</h3>
                    <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
                    <button
                        onClick={() => navigate('/presale/dashboard')}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-gray-600 mt-4">Loading presale item...</p>
                </div>
            </div>
        )
    }

    if (!formData._id) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-yellow-800 font-semibold mb-2">Presale item not found</h3>
                    <button
                        onClick={() => navigate('/presale/dashboard')}
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    const calculatedFinalPrice = formData.basePricePerUnit! * (1 + (formData.markupPercentage || 0) / 100)
    const showCustomPrice = formData.finalPricePerUnit !== calculatedFinalPrice

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/presale/dashboard')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{formData.carModel || formData.carId}</h1>
                <p className="text-gray-600 mt-1">{formData.carId}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Pre-Sale Item</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
                        {/* Base Information - Read Only */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            <h3 className="font-semibold text-gray-900">Item Information</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Car ID</label>
                                    <p className="text-lg font-semibold text-gray-900">{formData.carId}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                    <select
                                        value={formData.condition || 'mint'}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="mint">🔶 Mint</option>
                                        <option value="good">🟡 Good</option>
                                        <option value="fair">🟠 Fair</option>
                                        <option value="poor">🔴 Poor</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add notes about this presale item..."
                                />
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Pricing Information
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price / Unit</label>
                                    <p className="text-lg font-bold text-gray-900">${formData.basePricePerUnit?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
                                    <p className="text-lg font-bold text-blue-600">{formData.markupPercentage?.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Final Price - Editable */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Final Sell Price / Unit {showCustomPrice && <span className="text-green-600 font-bold">(custom)</span>}
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={formData.finalPricePerUnit || 0}
                                            onChange={(e) => setFormData({ ...formData, finalPricePerUnit: parseFloat(e.target.value) || 0 })}
                                            step="0.01"
                                            min={formData.basePricePerUnit || 0}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    {showCustomPrice && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, finalPricePerUnit: calculatedFinalPrice })}
                                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm font-medium"
                                        >
                                            Reset to Calculated
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Calculated value: ${calculatedFinalPrice.toFixed(2)}</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-white rounded p-3 space-y-2 border border-blue-300">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Suggested Sell Price:</span>
                                    <span className="font-bold text-green-600">${formData.finalPricePerUnit?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Effective Markup:</span>
                                    <span className="font-bold text-blue-600">
                                        {formData.basePricePerUnit === 0 
                                            ? '0'
                                            : (((formData.finalPricePerUnit! - formData.basePricePerUnit!) / formData.basePricePerUnit!) * 100).toFixed(1)
                                        }%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    Start Date
                                </label>
                                <p className="text-sm text-gray-600">
                                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString('es-MX') : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate || ''}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={isSaving || updateFinalPrice.isLoading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving || updateFinalPrice.isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/presale/dashboard')}
                                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
