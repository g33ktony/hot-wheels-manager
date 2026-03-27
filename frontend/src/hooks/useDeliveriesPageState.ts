import { useState } from 'react'

export interface DeliveryPageCustomerForm {
  name: string
  email: string
  phone: string
  address: string
}

export const initialDeliveryPageCustomerForm = (): DeliveryPageCustomerForm => ({
  name: '',
  email: '',
  phone: '',
  address: '',
})

export function useDeliveriesPageState() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [newCustomer, setNewCustomer] = useState<DeliveryPageCustomerForm>(initialDeliveryPageCustomerForm)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    showCreateModal,
    setShowCreateModal,
    showCreateCustomerModal,
    setShowCreateCustomerModal,
    selectedDate,
    setSelectedDate,
    newCustomer,
    setNewCustomer,
  }
}
