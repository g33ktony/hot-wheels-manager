import Card from '@/components/common/Card'
import DeliveryCard from '@/components/DeliveryCard'
import { Truck } from 'lucide-react'
import type { Delivery, InventoryItem } from '../../../../shared/types'

interface DeliveriesListProps {
  filteredDeliveries: Delivery[]
  inventoryItems: InventoryItem[]
  onViewDetails: (delivery: Delivery) => void
  onEdit: (delivery: Delivery) => void
  onMarkAsPrepared: (deliveryId: string) => void
  onMarkAsCompleted: (deliveryId: string) => void
  onDelete: (deliveryId: string) => void
  onShare: (delivery: Delivery) => void
  isLoadingPrepared: boolean
  isLoadingCompleted: boolean
  isLoadingDelete: boolean
}

export default function DeliveriesList({
  filteredDeliveries,
  inventoryItems,
  onViewDetails,
  onEdit,
  onMarkAsPrepared,
  onMarkAsCompleted,
  onDelete,
  onShare,
  isLoadingPrepared,
  isLoadingCompleted,
  isLoadingDelete,
}: DeliveriesListProps) {
  return (
    <Card className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h2 className="text-base lg:text-lg font-semibold text-white">Lista de Entregas</h2>
      </div>

      {filteredDeliveries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {filteredDeliveries.map((delivery) => (
            <DeliveryCard
              key={delivery._id}
              delivery={delivery}
              inventoryItems={inventoryItems}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onMarkAsPrepared={onMarkAsPrepared}
              onMarkAsCompleted={onMarkAsCompleted}
              onDelete={onDelete}
              onShare={onShare}
              isLoadingPrepared={isLoadingPrepared}
              isLoadingCompleted={isLoadingCompleted}
              isLoadingDelete={isLoadingDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Truck size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No hay entregas</h3>
          <p className="text-slate-400">No se encontraron entregas para los filtros seleccionados</p>
        </div>
      )}
    </Card>
  )
}
