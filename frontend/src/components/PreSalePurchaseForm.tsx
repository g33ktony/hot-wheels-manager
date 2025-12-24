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
        preSalePrice: 0,
        normalPrice: 0, // Can be manually edited
        condition: 'mint' as 'mint' | 'good' | 'fair' | 'poor',
        purchaseDate: new Date().toISOString().split('T')[0],
        preSaleScheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        notes: '',
        photo: null as string | null
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(false)

    // Handle photo upload
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrors({ ...errors, photo: 'Photo must be less than 5MB' })
                return
            }

            const reader = new FileReader()
            reader.onload = (event) => {
                const base64 = event.target?.result as string
                setFormData({ ...formData, photo: base64 })
                setErrors({ ...errors, photo: '' })
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemovePhoto = () => {
        setFormData({ ...formData, photo: null })
    }

    // Calculate normal price based on unit price and markup (this is the max profit price)
    const calculateNormalPrice = (unitPrice: number, markup: number): number => {
        return unitPrice * (1 + markup / 100)
    }

    // Normal price is always calculated from markup (but can be overridden)
    const calculatedNormalPrice = calculateNormalPrice(formData.unitPrice, formData.markupPercentage)
    const finalNormalPrice = formData.normalPrice > 0 ? formData.normalPrice : calculatedNormalPrice
    
    // Use pre-sale price if set, otherwise use normal price
    const effectivePrice = formData.preSalePrice > 0 ? formData.preSalePrice : finalNormalPrice

    const totalCost = effectivePrice * formData.quantity
    const profit = (effectivePrice - formData.unitPrice) * formData.quantity

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
        if (formData.preSalePrice > 0 && formData.preSalePrice >= (formData.normalPrice || calculatedNormalPrice)) {
            newErrors.preSalePrice = `Pre-sale price must be lower than normal price ($${(formData.normalPrice || calculatedNormalPrice).toFixed(2)})`
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
                markupPercentage: formData.markupPercentage,
                preSalePrice: formData.preSalePrice > 0 ? formData.preSalePrice : undefined,
                normalPrice: formData.normalPrice > 0 ? formData.normalPrice : calculatedNormalPrice, // Send custom or calculated
                photo: formData.photo
            })

            // Reset form
            setFormData({
                supplierId: '',
                carId: '',
                quantity: 1,
                unitPrice: 0,
                markupPercentage: 15,
                preSalePrice: 0,
                normalPrice: 0,
                condition: 'mint',
                purchaseDate: new Date().toISOString().split('T')[0],
                preSaleScheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                notes: '',
                photo: null
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
                                    Markup % (editable)
                                </label>
                                <Input
                                    type="number"
                                    value={formData.markupPercentage}
                                    onChange={(e) => {
                                        const markup = parseFloat(e.target.value) || 0
                                        setFormData({ ...formData, markupPercentage: markup })
                                    }}
                                    min="0"
                                    step="0.1"
                                    placeholder="15"
                                />
                                {errors.markupPercentage && (
                                    <p className="text-sm text-red-500 mt-1">{errors.markupPercentage}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">Edit to recalculate final price</p>
                            </div>
                        </div>

                        {/* Pre-Sale Price and Normal Price Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-gray-300 rounded-lg p-4 space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Pricing Strategy
                            </h3>
                            
                            {/* Normal Price (Auto-calculated from markup but editable) */}
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <label className="block text-sm font-medium text-green-800 mb-2">
                                    Normal Price (Editable)
                                </label>
                                <Input
                                    type="number"
                                    value={formData.normalPrice || calculatedNormalPrice}
                                    onChange={(e) => {
                                        const customNormalPrice = parseFloat(e.target.value) || 0
                                        setFormData({ ...formData, normalPrice: customNormalPrice })
                                    }}
                                    min="0"
                                    step="0.01"
                                    placeholder={calculatedNormalPrice.toFixed(2)}
                                    className="mb-2 font-bold text-lg"
                                />
                                <p className="text-xs text-green-700 mt-1">
                                    Auto-calculated: ${calculatedNormalPrice.toFixed(2)} (Base ${formData.unitPrice.toFixed(2)} + {formData.markupPercentage}% markup)
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    You can edit this if the calculated value doesn't match your exact target price
                                </p>
                            </div>

                            {/* Pre-Sale Price (Optional - must be lower) */}
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                    Pre-Sale Price (Optional - During 'Active' Status)
                                </label>
                                <Input
                                    type="number"
                                    value={formData.preSalePrice || ''}
                                    onChange={(e) => {
                                        const preSalePrice = parseFloat(e.target.value) || 0
                                        setFormData({ ...formData, preSalePrice })
                                    }}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="mb-2"
                                />
                                <p className="text-xs text-blue-700 mt-1">
                                    Special discounted price during pre-sale period (must be lower than ${(formData.normalPrice || calculatedNormalPrice).toFixed(2)})
                                </p>
                                {formData.preSalePrice > 0 && formData.preSalePrice < (formData.normalPrice || calculatedNormalPrice) && (
                                    <div className="mt-2 text-xs text-green-600 font-medium">
                                        ✓ Discount: ${((formData.normalPrice || calculatedNormalPrice) - formData.preSalePrice).toFixed(2)} ({((((formData.normalPrice || calculatedNormalPrice) - formData.preSalePrice) / (formData.normalPrice || calculatedNormalPrice)) * 100).toFixed(1)}% off)
                                    </div>
                                )}
                            </div>
                            {errors.preSalePrice && <p className="text-sm text-red-500">{errors.preSalePrice}</p>}
                        </div>

                        {/* Pricing Summary */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 space-y-3">
                            <h4 className="font-semibold text-gray-900">Pricing Summary</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600 uppercase">Base Price / Unit</p>
                                    <p className="text-lg font-semibold text-gray-900">${formData.unitPrice.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 uppercase">Markup</p>
                                    <p className="text-lg font-semibold text-purple-600">{formData.markupPercentage.toFixed(1)}%</p>
                                </div>
                            </div>
                            
                            <div className="border-t border-purple-200 pt-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">Normal Price / Unit:</span>
                                    <span className="font-semibold text-green-700">${finalNormalPrice.toFixed(2)}</span>
                                </div>
                                {formData.preSalePrice > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-700">Pre-Sale Price / Unit:</span>
                                        <span className="font-semibold text-blue-700">${formData.preSalePrice.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                                    <span className="font-semibold text-gray-900">Effective Price / Unit:</span>
                                    <span className="text-xl font-bold text-purple-600">${effectivePrice.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="border-t border-purple-200 pt-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-900">Total Sale ({formData.quantity} units):</span>
                                    <span className="text-xl font-bold text-blue-600">${totalCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-900">Total Profit:</span>
                                    <span className="text-xl font-bold text-green-600">${profit.toFixed(2)}</span>
                                </div>
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

                        {/* Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Photo (optional)
                            </label>
                            {formData.photo ? (
                                <div className="relative">
                                    <img
                                        src={formData.photo}
                                        alt="Presale item"
                                        className="w-full h-64 object-cover rounded-lg border border-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition"
                                    >
                                        Remove Photo
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg
                                            className="w-8 h-8 text-gray-400 mb-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="text-sm text-gray-600">Click to upload a photo</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG (Max. 5MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                    />
                                </label>
                            )}
                            {errors.photo && <p className="text-sm text-red-500 mt-1">{errors.photo}</p>}
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
