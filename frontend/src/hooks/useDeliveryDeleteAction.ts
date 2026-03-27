interface UseDeliveryDeleteActionParams {
  deleteDelivery: (deliveryId: string) => Promise<unknown>
}

export function useDeliveryDeleteAction({ deleteDelivery }: UseDeliveryDeleteActionParams) {
  const handleDeleteDelivery = async (deliveryId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
      await deleteDelivery(deliveryId)
    }
  }

  return {
    handleDeleteDelivery,
  }
}
