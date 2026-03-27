import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'

interface NewCustomerState {
  name: string
  email: string
  phone: string
  address: string
}

interface CreateCustomerModalProps {
  isOpen: boolean
  newCustomer: NewCustomerState
  isCreating: boolean
  onClose: () => void
  onCreate: () => void
  onChange: (next: NewCustomerState) => void
}

export default function CreateCustomerModal({
  isOpen,
  newCustomer,
  isCreating,
  onClose,
  onCreate,
  onChange,
}: CreateCustomerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Cliente"
      maxWidth="md"
      footer={
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onCreate}
            disabled={isCreating}
          >
            {isCreating ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <Input
            type="text"
            value={newCustomer.name}
            onChange={(e) => onChange({ ...newCustomer, name: e.target.value })}
            placeholder="Nombre del cliente"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            type="email"
            value={newCustomer.email}
            onChange={(e) => onChange({ ...newCustomer, email: e.target.value })}
            placeholder="email@cliente.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <Input
            type="tel"
            value={newCustomer.phone}
            onChange={(e) => onChange({ ...newCustomer, phone: e.target.value })}
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <Input
            type="text"
            value={newCustomer.address}
            onChange={(e) => onChange({ ...newCustomer, address: e.target.value })}
            placeholder="Dirección del cliente"
          />
        </div>
      </div>
    </Modal>
  )
}
