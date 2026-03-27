import type React from 'react'
import { Plus, UserPlus, X } from 'lucide-react'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import InventoryItemSelector from '@/components/InventoryItemSelector'
import PreSaleItemAutocomplete from '@/components/PreSaleItemAutocomplete'
import type { Customer, DeliveryLocation } from '@shared/types'
import type { PreSaleItem } from '@/services/presale'

type PreSaleAutocompleteItem = PreSaleItem & {
  carModel?: string
}

interface DeliveryFormItem {
  inventoryItemId?: string
  hotWheelsCarId?: string
  carId: string
  carName: string
  quantity: number
  unitPrice: number
  basePricePerUnit?: number
  seriesId?: string
  seriesName?: string
  seriesSize?: number
  seriesPrice?: number
  isSoldAsSeries?: boolean
}

interface NewDeliveryForm {
  customerId: string
  items: DeliveryFormItem[]
  scheduledDate: string
  scheduledTime: string
  location: string
  totalAmount: number
  notes: string
  isThirdPartyDelivery: boolean
  thirdPartyRecipient: string
  thirdPartyPhone: string
}

interface PaymentPlanConfig {
  enabled: boolean
  numberOfPayments: number
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
  startDate: string
  earlyPaymentBonus: number
}

interface DeliveryFormModalProps {
  isOpen: boolean
  onClose: () => void
  isEditMode: boolean
  addDeliveryItem: () => void
  handleCreateDelivery: () => void
  createLoading: boolean
  updateLoading: boolean
  newDelivery: NewDeliveryForm
  setNewDelivery: (delivery: NewDeliveryForm) => void
  customers?: Customer[]
  onOpenCreateCustomer: () => void
  deliveryLocations?: DeliveryLocation[]
  showCustomLocationInput: boolean
  customLocation: string
  setCustomLocation: (value: string) => void
  handleCustomLocationBlur: () => void
  handleLocationChange: (value: string) => void
  setShowCustomLocationInput: (value: boolean) => void
  updateDeliveryItem: (index: number, field: string, value: unknown) => void
  removeDeliveryItem: (index: number) => void
  completeSeries: (seriesId: string, seriesPrice: number, seriesSize: number) => void
  calculateTotal: () => number
  paymentPlanConfig: PaymentPlanConfig
  setPaymentPlanConfig: (config: PaymentPlanConfig) => void
}

export default function DeliveryFormModal({
  isOpen,
  onClose,
  isEditMode,
  addDeliveryItem,
  handleCreateDelivery,
  createLoading,
  updateLoading,
  newDelivery,
  setNewDelivery,
  customers,
  onOpenCreateCustomer,
  deliveryLocations,
  showCustomLocationInput,
  customLocation,
  setCustomLocation,
  handleCustomLocationBlur,
  handleLocationChange,
  setShowCustomLocationInput,
  updateDeliveryItem,
  removeDeliveryItem,
  completeSeries,
  calculateTotal,
  paymentPlanConfig,
  setPaymentPlanConfig,
}: DeliveryFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Entrega' : 'Nueva Entrega'}
      maxWidth="4xl"
      headerActions={
        <Button
          type="button"
          size="sm"
          onClick={addDeliveryItem}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Agregar Item
        </Button>
      }
      footer={
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleCreateDelivery}
            disabled={createLoading || updateLoading}
          >
            {isEditMode
              ? (updateLoading ? 'Actualizando...' : 'Actualizar Entrega')
              : (createLoading ? 'Creando...' : 'Crear Entrega')
            }
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={newDelivery.customerId}
                onChange={(e) => setNewDelivery({ ...newDelivery, customerId: e.target.value })}
                required
              >
                <option value="">Seleccionar cliente</option>
                {customers?.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} - {customer.email}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onOpenCreateCustomer}
                className="flex items-center gap-1"
              >
                <UserPlus size={16} />
                Crear
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Programada *
            </label>
            <Input
              type="date"
              value={newDelivery.scheduledDate}
              onChange={(e) => setNewDelivery({ ...newDelivery, scheduledDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora Programada
            </label>
            <Input
              type="time"
              value={newDelivery.scheduledTime}
              onChange={(e) => setNewDelivery({ ...newDelivery, scheduledTime: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación *
            </label>
            {!showCustomLocationInput ? (
              <select
                className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={newDelivery.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
              >
                <option value="">Seleccionar ubicación</option>
                {deliveryLocations?.map((loc) => (
                  <option key={loc._id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
                <option value="other">Otro...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nueva ubicación"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  onBlur={handleCustomLocationBlur}
                  required
                  autoFocus
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowCustomLocationInput(false)
                    setCustomLocation('')
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white">Items de la Entrega</h3>
          </div>

          <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                PRE-SALE
              </span>
              Add Pre-Sale Item
            </h4>
            <PreSaleItemAutocomplete
              value=""
              onChange={(preSaleItem) => {
                const selectedPreSaleItem = preSaleItem as PreSaleAutocompleteItem
                setNewDelivery({
                  ...newDelivery,
                  items: [
                    ...newDelivery.items,
                    {
                      carId: selectedPreSaleItem.carId,
                      carName: selectedPreSaleItem.carModel || selectedPreSaleItem.carId,
                      quantity: 1,
                      unitPrice: selectedPreSaleItem.finalPricePerUnit,
                      basePricePerUnit: selectedPreSaleItem.basePricePerUnit || 0,
                      inventoryItemId: `presale_${selectedPreSaleItem._id}`,
                      hotWheelsCarId: selectedPreSaleItem._id,
                      seriesId: selectedPreSaleItem._id,
                      seriesName: selectedPreSaleItem.carModel || 'Pre-Sale Item',
                      isSoldAsSeries: true,
                    },
                  ],
                })
              }}
              placeholder="Search presale items..."
              onlyActive
            />
          </div>

          <div className="space-y-4">
            {newDelivery.items.map((item, index: number) => (
              <div key={index} className="space-y-2">
                <div className={`flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 rounded-lg ${item.isSoldAsSeries ? 'bg-purple-50 border-purple-300' : 'border-slate-600'}`}>
                  {item.isSoldAsSeries && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                        PRE-SALE
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    {item.isSoldAsSeries ? (
                      <div className="p-2 bg-slate-800 rounded border border-purple-200">
                        <p className="font-semibold text-white">{item.carName}</p>
                        <p className="text-sm text-slate-400">{item.carId}</p>
                      </div>
                    ) : (
                      <InventoryItemSelector
                        key={item.inventoryItemId || `empty-${index}`}
                        value={item.inventoryItemId || ''}
                        onChange={(itemId) => updateDeliveryItem(index, 'inventoryItemId', itemId)}
                        excludeIds={newDelivery.items
                          .filter((_, i: number) => i !== index)
                          .map((it) => it.inventoryItemId)
                          .filter(Boolean) as string[]}
                        placeholder="Buscar pieza en inventario..."
                        required
                        fallbackName={item.carName || undefined}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 sm:gap-4 sm:w-auto">
                    <div className="w-20 min-w-[80px]">
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value
                          if (val === '') {
                            updateDeliveryItem(index, 'quantity', '')
                          } else {
                            const num = parseInt(val)
                            updateDeliveryItem(index, 'quantity', isNaN(num) ? 1 : Math.max(1, num))
                          }
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          if (e.target.value === '' || parseInt(e.target.value) < 1) {
                            updateDeliveryItem(index, 'quantity', 1)
                          }
                        }}
                        min="1"
                        disabled={item.isSoldAsSeries}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex-1 sm:w-24 sm:flex-none">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Precio"
                        value={item.unitPrice || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value
                          if (val === '') {
                            updateDeliveryItem(index, 'unitPrice', '')
                          } else {
                            const num = parseFloat(val)
                            updateDeliveryItem(index, 'unitPrice', isNaN(num) ? 0 : num)
                          }
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                            updateDeliveryItem(index, 'unitPrice', 0)
                          }
                        }}
                        step="0.01"
                        min="0"
                        disabled={item.isSoldAsSeries}
                        className="min-h-[44px]"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeDeliveryItem(index)}
                      className="min-h-[44px] min-w-[44px] px-3"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                {(() => {
                  if (!item.seriesId || item.isSoldAsSeries) {
                    return null
                  }

                  const seriesItemsInDelivery = newDelivery.items.filter((i) => i.seriesId === item.seriesId).length
                  const missingPieces = (item.seriesSize || 0) - seriesItemsInDelivery

                  if (missingPieces > 0) {
                    return (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => completeSeries(item.seriesId!, item.seriesPrice || 0, item.seriesSize || 0)}
                        className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                      >
                        🎁 Completar Serie: {item.seriesName} ({missingPieces} {missingPieces === 1 ? 'pieza faltante' : 'piezas faltantes'}) - ${item.seriesPrice?.toFixed(2)}
                      </Button>
                    )
                  }
                  return null
                })()}

                {item.isSoldAsSeries && (
                  <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                    ✨ Vendido como parte de serie: {item.seriesName} (${item.unitPrice?.toFixed(2)}/pieza)
                  </div>
                )}
              </div>
            ))}
          </div>

          {newDelivery.items.length > 0 && (
            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
              <p className="text-lg font-semibold">Total: ${calculateTotal().toFixed(2)}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (Opcional)
          </label>
          <textarea
            className="input w-full h-20 resize-none"
            placeholder="Notas adicionales sobre la entrega..."
            value={newDelivery.notes}
            onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
          />
        </div>

        <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isThirdParty"
              checked={newDelivery.isThirdPartyDelivery}
              onChange={(e) => setNewDelivery({
                ...newDelivery,
                isThirdPartyDelivery: e.target.checked,
                thirdPartyRecipient: e.target.checked ? newDelivery.thirdPartyRecipient : '',
                thirdPartyPhone: e.target.checked ? newDelivery.thirdPartyPhone : '',
              })}
              className="h-4 w-4 text-purple-600 rounded cursor-pointer"
            />
            <label htmlFor="isThirdParty" className="font-medium text-purple-900 cursor-pointer">
              ¿Entregar a una tercera persona?
            </label>
          </div>

          {newDelivery.isThirdPartyDelivery && (
            <div className="space-y-3">
              <Input
                type="text"
                label="Nombre del Receptor *"
                placeholder="Nombre de la persona que recibirá la entrega"
                value={newDelivery.thirdPartyRecipient}
                onChange={(e) => setNewDelivery({
                  ...newDelivery,
                  thirdPartyRecipient: e.target.value,
                })}
                required={newDelivery.isThirdPartyDelivery}
              />
              <Input
                type="tel"
                label="Teléfono del Receptor (Opcional)"
                placeholder="Número de teléfono para contacto"
                value={newDelivery.thirdPartyPhone}
                onChange={(e) => setNewDelivery({
                  ...newDelivery,
                  thirdPartyPhone: e.target.value,
                })}
              />
            </div>
          )}
        </div>

        {!isEditMode && newDelivery.items.some((item) => item.inventoryItemId?.startsWith('presale_')) && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">Plan de Pagos (Preventa)</h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentPlanConfig.enabled}
                  onChange={(e) => setPaymentPlanConfig({
                    ...paymentPlanConfig,
                    enabled: e.target.checked,
                  })}
                  className="mr-2 h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm">Habilitar pagos parciales</span>
              </label>
            </div>

            {paymentPlanConfig.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Pagos
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="2"
                      max="12"
                      value={paymentPlanConfig.numberOfPayments || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: 2 })
                        } else {
                          const num = parseInt(val)
                          setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: isNaN(num) ? 2 : Math.max(2, Math.min(12, num)) })
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseInt(e.target.value) < 2) {
                          setPaymentPlanConfig({ ...paymentPlanConfig, numberOfPayments: 2 })
                        }
                      }}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia
                    </label>
                    <select
                      value={paymentPlanConfig.paymentFrequency}
                      onChange={(e) => setPaymentPlanConfig({
                        ...paymentPlanConfig,
                        paymentFrequency: e.target.value as 'weekly' | 'biweekly' | 'monthly',
                      })}
                      className="input w-full"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Primer Pago
                    </label>
                    <input
                      type="date"
                      value={paymentPlanConfig.startDate}
                      onChange={(e) => setPaymentPlanConfig({
                        ...paymentPlanConfig,
                        startDate: e.target.value,
                      })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bono Pago Anticipado (%)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="20"
                      step="0.5"
                      value={paymentPlanConfig.earlyPaymentBonus || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: 0 })
                        } else {
                          const num = parseFloat(val)
                          setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: isNaN(num) ? 0 : Math.max(0, Math.min(20, num)) })
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                          setPaymentPlanConfig({ ...paymentPlanConfig, earlyPaymentBonus: 0 })
                        }
                      }}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Resumen del Plan</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Total:</span>
                      <div className="font-medium">${newDelivery.totalAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Por Pago:</span>
                      <div className="font-medium">
                        ${(newDelivery.totalAmount / paymentPlanConfig.numberOfPayments).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Fecha Final:</span>
                      <div className="font-medium text-xs">
                        {(() => {
                          const start = new Date(paymentPlanConfig.startDate)
                          const freq = paymentPlanConfig.paymentFrequency
                          const days = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 30
                          const end = new Date(start)
                          end.setDate(end.getDate() + (days * (paymentPlanConfig.numberOfPayments - 1)))
                          return end.toLocaleDateString()
                        })()}
                      </div>
                    </div>
                  </div>
                  {paymentPlanConfig.earlyPaymentBonus > 0 && (
                    <div className="mt-2 text-xs text-green-700">
                      💰 Con {paymentPlanConfig.earlyPaymentBonus}% de descuento si paga todo anticipado
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
