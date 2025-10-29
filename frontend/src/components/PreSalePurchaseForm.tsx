import { useState } from 'react'
import { useCreatePreSaleItem } from '@/hooks/usePresale'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import AutocompleteCarId from '@/components/AutocompleteCarId'
import { Plus, DollarSign, Users, Calendar, Package, Info } from 'lucide-react'

interface PreSalePurchaseFormProps {
    onSuccess?: (item: any) => void
    onClose?: () => void
    initialPurchaseId?: string
}

export default function PreSalePurchaseForm({
    onSuccess,
    onClose,
    initialPurchaseId
}: PreSalePurchaseFormProps) {
    const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false)
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactMethod: 'email' as const
    })

    // Hooks
    const { data: suppliers = [] } = useSuppliers()
    const createSupplierMutation = useCreateSupplier()
    const createPreSaleItem = useCreatePreSaleItem()

    // Form state
    const [formData, setFormData] = useState({
        supplierId: '',
        carId: '',
        quantity: 1,
        unitPrice: 0,
        markupPercentage: 15,
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        purchaseDate: new Date().toISOString().split('T')[0],
        preSaleScheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        notes: ''
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(false)

    // Calculate final price
    const finalPricePerUnit = formData.unitPrice * (1 + formData.markupPercentage / 100)
    const totalCost = finalPricePerUnit * formData.quantity
    const profit = (finalPricePerUnit - formData.unitPrice) * formData.quantity

    // Validation
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.supplierId && !newSupplier.name) {
            newErrors.supplierId = 'Supplier is required'
        }
        if (!formData.carId) {
            newErrors.carId = 'Car is required'
        }
        if (formData.quantity < 1) {
            newErrors.quantity = 'Quantity must be at least 1'
        }
        if (formData.unitPrice < 0) {
            newErrors.unitPrice = 'Unit price cannot be negative'
        }
        if (formData.markupPercentage < 0 || formData.markupPercentage > 100) {
            newErrors.markupPercentage = 'Markup must be between 0 and 100'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle supplier creation
    const handleCreateSupplier = async () => {
        if (!newSupplier.name) {
            setErrors({ supplier: 'Supplier name is required' })
            return
        }

        try {
            const supplier = await createSupplierMutation.mutateAsync({
                ...newSupplier,
                contactMethod: newSupplier.contactMethod as 'phone' | 'email' | 'whatsapp' | 'other'
            })
            setFormData({ ...formData, supplierId: supplier._id || '' })
            setNewSupplier({ name: '', email: '', phone: '', address: '', contactMethod: 'email' as const })
            setShowCreateSupplierModal(false)
        } catch (error) {
            // Error is handled by toast in the hook
        }
    }

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsLoading(true)

        try {
            // In a real scenario, we would first create a Purchase,
            // then use its ID to create the PreSaleItem.
            // For now, we'll use a placeholder purchaseId.
            const purchaseId = initialPurchaseId || `presale-${Date.now()}`

            await createPreSaleItem.mutateAsync({
                purchaseId,
                carId: formData.carId,
                quantity: formData.quantity,
                unitPrice: formData.unitPrice,
                markupPercentage: formData.markupPercentage
            })

            // Reset form
            setFormData({
                supplierId: '',
                carId: '',
                quantity: 1,
                unitPrice: 0,
                markupPercentage: 15,
                condition: 'mint',
                purchaseDate: new Date().toISOString().split('T')[0],
                preSaleScheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                notes: ''
            })
            setErrors({})

            if (onSuccess) {
                onSuccess({ ...formData })
            }
        } catch (error) {
            // Error is handled by toast in the hook
        } finally {
            setIsLoading(false)
        }
    }

    const selectedSupplier = suppliers.find((s) => s._id === formData.supplierId)

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Register Pre-Sale Purchase
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Supplier Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Users className="inline-block w-4 h-4 mr-1" />
                                Supplier
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={formData.supplierId}
                                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                    className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplierId ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Select a supplier...</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier._id} value={supplier._id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    onClick={() => setShowCreateSupplierModal(true)}
                                    variant="secondary"
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    New
                                </Button>
                            </div>
                            {selectedSupplier && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {selectedSupplier.email} • {selectedSupplier.phone}
                                </p>
                            )}
                            {errors.supplierId && <p className="text-sm text-red-500 mt-1">{errors.supplierId}</p>}
                        </div>

                        {/* Car Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Info className="inline-block w-4 h-4 mr-1" />
                                Hot Wheels Car
                            </label>
                            <AutocompleteCarId
                                value={formData.carId}
                                onChange={(carId) => setFormData({ ...formData, carId })}
                                placeholder="Search by car ID or model..."
                            />
                            {errors.carId && <p className="text-sm text-red-500 mt-1">{errors.carId}</p>}
                        </div>

                        {/* Quantity and Pricing Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Package className="inline-block w-4 h-4 mr-1" />
                                    Quantity
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        −
                                    </button>
                                    <Input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) =>
                                            setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })
                                        }
                                        min="1"
                                        className="text-center"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        +
                                    </button>
                                </div>
                                {errors.quantity && <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>}
                            </div>

                            {/* Unit Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign className="inline-block w-4 h-4 mr-1" />
                                    Unit Price
                                </label>
                                <Input
                                    type="number"
                                    value={formData.unitPrice}
                                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                                {errors.unitPrice && <p className="text-sm text-red-500 mt-1">{errors.unitPrice}</p>}
                            </div>

                            {/* Markup Percentage */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign className="inline-block w-4 h-4 mr-1" />
                                    Markup %
                                </label>
                                <Input
                                    type="number"
                                    value={formData.markupPercentage}
                                    onChange={(e) =>
                                        setFormData({ ...formData, markupPercentage: parseFloat(e.target.value) || 0 })
                                    }
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="15"
                                />
                                {errors.markupPercentage && (
                                    <p className="text-sm text-red-500 mt-1">{errors.markupPercentage}</p>
                                )}
                            </div>
                        </div>

                        {/* Pricing Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-700">Base Price / Unit:</span>
                                <span className="font-semibold">${formData.unitPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-700">Final Price / Unit (+{formData.markupPercentage}%):</span>
                                <span className="font-semibold text-blue-600">${finalPricePerUnit.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 flex justify-between">
                                <span className="font-semibold">Total Sale Amount ({formData.quantity} units):</span>
                                <span className="text-lg font-bold text-blue-600">${totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span className="font-semibold">Total Profit:</span>
                                <span className="text-lg font-bold">${profit.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Purchase Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    Purchase Date
                                </label>
                                <Input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                />
                            </div>

                            {/* Pre-Sale Scheduled Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="inline-block w-4 h-4 mr-1" />
                                    Pre-Sale Ends
                                </label>
                                <Input
                                    type="date"
                                    value={formData.preSaleScheduledDate}
                                    onChange={(e) => setFormData({ ...formData, preSaleScheduledDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Condition */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Condition</label>
                            <div className="flex gap-4">
                                {(['mint', 'good', 'fair', 'poor'] as const).map((cond) => (
                                    <label key={cond} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="condition"
                                            value={cond}
                                            checked={formData.condition === cond}
                                            onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                                            className="w-4 h-4"
                                        />
                                        <span className="capitalize text-gray-700">{cond}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add any notes about this pre-sale..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                disabled={isLoading || createPreSaleItem.isLoading}
                                className="flex-1"
                            >
                                {isLoading || createPreSaleItem.isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2 inline" />
                                        Creating...
                                    </>
                                ) : (
                                    'Register Pre-Sale'
                                )}
                            </Button>
                            {onClose && (
                                <Button type="button" onClick={onClose} variant="secondary">
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Create Supplier Modal */}
            <Modal
                isOpen={showCreateSupplierModal}
                onClose={() => setShowCreateSupplierModal(false)}
                title="Create New Supplier"
            >
                <div className="space-y-4">

                    <Input
                        placeholder="Supplier Name"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    />

                    <Input
                        type="email"
                        placeholder="Email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    />

                    <Input
                        placeholder="Phone"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    />

                    <textarea
                        placeholder="Address"
                        value={newSupplier.address}
                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex gap-2">
                        <Button onClick={handleCreateSupplier} disabled={createSupplierMutation.isLoading} className="flex-1">
                            {createSupplierMutation.isLoading ? 'Creating...' : 'Create Supplier'}
                        </Button>
                        <Button
                            onClick={() => setShowCreateSupplierModal(false)}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
