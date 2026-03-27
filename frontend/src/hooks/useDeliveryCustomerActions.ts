import type { Dispatch, SetStateAction } from 'react'
import { initialDeliveryPageCustomerForm, type DeliveryPageCustomerForm } from '@/hooks/useDeliveriesPageState'
import type { CreateCustomerDto, Customer } from '@shared/types'

interface DeliveryStateWithCustomerId {
  customerId: string
}

interface UseDeliveryCustomerActionsParams<T extends DeliveryStateWithCustomerId> {
  newCustomer: DeliveryPageCustomerForm
  setNewCustomer: Dispatch<SetStateAction<DeliveryPageCustomerForm>>
  setNewDelivery: Dispatch<SetStateAction<T>>
  setShowCreateCustomerModal: Dispatch<SetStateAction<boolean>>
  createCustomer: (data: CreateCustomerDto) => Promise<Customer>
}

export function useDeliveryCustomerActions<T extends DeliveryStateWithCustomerId>({
  newCustomer,
  setNewCustomer,
  setNewDelivery,
  setShowCreateCustomerModal,
  createCustomer,
}: UseDeliveryCustomerActionsParams<T>) {
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('El nombre del cliente es obligatorio')
      return
    }

    try {
      const createdCustomer = await createCustomer({
        ...newCustomer,
        contactMethod: 'email',
      })

      if (createdCustomer._id) {
        setNewDelivery((prev) => ({ ...prev, customerId: createdCustomer._id }))
      }

      setNewCustomer(initialDeliveryPageCustomerForm())
      setShowCreateCustomerModal(false)
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Error al crear el cliente')
    }
  }

  return {
    handleCreateCustomer,
  }
}
