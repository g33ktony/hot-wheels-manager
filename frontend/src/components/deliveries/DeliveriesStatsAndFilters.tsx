import { Search, Truck, Package, CheckCircle, Clock } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

interface DeliveriesStatsAndFiltersProps {
  statusFilter?: string
  setStatusFilter: (status?: string) => void
  totalDeliveries: number
  pendingDeliveries: number
  preparedDeliveries: number
  completedDeliveries: number
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedDate: string
  setSelectedDate: (value: string) => void
}

export default function DeliveriesStatsAndFilters({
  statusFilter,
  setStatusFilter,
  totalDeliveries,
  pendingDeliveries,
  preparedDeliveries,
  completedDeliveries,
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
}: DeliveriesStatsAndFiltersProps) {
  const handleStatusFilterClick = (status?: string) => {
    if (status === 'pending') {
      setStatusFilter(statusFilter === 'pending' ? undefined : 'pending')
    } else {
      setStatusFilter(statusFilter === status ? undefined : status)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${!statusFilter ? 'ring-2 ring-blue-500' : ''}`}>
          <div
            className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
            onClick={() => handleStatusFilterClick(undefined)}
          >
            <div className="p-2 rounded-lg bg-blue-100 self-start">
              <Truck size={20} className="text-blue-600" />
            </div>
            <div className="lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-slate-400 dark:text-slate-400">Total Activas</p>
              <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{totalDeliveries}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}>
          <div
            className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
            onClick={() => handleStatusFilterClick('pending')}
          >
            <div className="p-2 rounded-lg bg-yellow-100 self-start">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div className="lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</p>
              <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{pendingDeliveries}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'prepared' ? 'ring-2 ring-orange-500' : ''}`}>
          <div
            className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
            onClick={() => handleStatusFilterClick('prepared')}
          >
            <div className="p-2 rounded-lg bg-orange-100 self-start">
              <Package size={20} className="text-orange-600" />
            </div>
            <div className="lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Preparadas</p>
              <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{preparedDeliveries}</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}>
          <div
            className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-y-0"
            onClick={() => handleStatusFilterClick('completed')}
          >
            <div className="p-2 rounded-lg bg-green-100 self-start">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400">Completadas</p>
              <p className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">{completedDeliveries}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 lg:p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Buscar por cliente o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 lg:flex-none lg:w-48">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Card>

      {statusFilter && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Mostrando entregas: <span className="font-semibold">
              {statusFilter === 'pending' ? 'Pendientes (Programadas y Preparadas)' :
                statusFilter === 'scheduled' ? 'Programadas' :
                  statusFilter === 'prepared' ? 'Preparadas' :
                    statusFilter === 'completed' ? 'Completadas' :
                      statusFilter === 'cancelled' ? 'Canceladas' :
                        statusFilter === 'rescheduled' ? 'Reprogramadas' : ''}
            </span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setStatusFilter(undefined)}
            className="text-blue-700 hover:text-blue-900"
          >
            Limpiar filtro
          </Button>
        </div>
      )}
    </>
  )
}
