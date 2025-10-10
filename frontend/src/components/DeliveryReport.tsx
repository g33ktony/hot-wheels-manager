import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Share2 } from 'lucide-react'
import Button from '@/components/common/Button'
import type { Delivery } from '@shared/types'

interface DeliveryReportProps {
  delivery: Delivery
  onClose: () => void
}

export default function DeliveryReport({ delivery, onClose }: DeliveryReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time?: string) => {
    if (!time) return ''
    return time
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  // Map delivery status values to Spanish labels
  const statusToSpanish = (status?: string) => {
    if (!status) return 'Desconocido'

    const key = status.toLowerCase()
    switch (key) {

      case 'scheduled':
      case 'programada':
        return 'Programada'

      case 'cancelled':
        return 'Cancelado'
      case 'prepared':
        return 'Preparado'
      case 'completed':
        return 'completado'
      case 'rescheduled':
        return 'Reprogramado'
      default:
        // Capitalize first letter and keep as fallback
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const generateImage = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: reportRef.current.scrollHeight
      })

      const image = canvas.toDataURL('image/png')

      // Crear un enlace para descargar la imagen
      const link = document.createElement('a')
      link.download = `reporte-entrega-${delivery._id || 'sin-id'}.png`
      link.href = image
      link.click()

    } catch (error) {
      console.error('Error generando imagen:', error)
      alert('Error al generar la imagen del reporte')
    } finally {
      setIsGenerating(false)
    }
  }

  const shareImage = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: reportRef.current.scrollHeight
      })

      canvas.toBlob(async (blob) => {
        if (!blob) return

        const file = new File([blob], `reporte-entrega-${delivery._id || 'sin-id'}.png`, { type: 'image/png' })

        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Reporte de Entrega',
              text: `Entrega para ${delivery.customer.name}`,
              files: [file]
            })
          } catch (error) {
            console.error('Error compartiendo:', error)
            // Fallback a descarga
            generateImage()
          }
        } else {
          // Fallback para navegadores que no soportan Web Share API
          generateImage()
        }
      })

    } catch (error) {
      console.error('Error generando imagen para compartir:', error)
      alert('Error al compartir la imagen del reporte')
    } finally {
      setIsGenerating(false)
    }
  }

  const generatePDF = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: reportRef.current.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')

      // Dynamically import jspdf to avoid static module/type resolution issues in the build
      const jspdfModule: any = await import('jspdf')
      const { jsPDF } = jspdfModule

      // Create PDF (A4) and add image
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()

      // Calculate image dimensions to fit PDF width
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = pdfWidth / imgWidth
      const renderedHeight = imgHeight * ratio

      // Single page PDF: scale to fit width. For very long content this will shrink content to fit a single page.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, renderedHeight)
      pdf.save(`reporte-entrega-${delivery._id || 'sin-id'}.pdf`)

    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar PDF del reporte')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header con acciones */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Reporte de Entrega</h2>
          <div className="flex gap-2 items-center">
            <Button
              onClick={shareImage}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              disabled={isGenerating}
            >
              <Share2 size={16} />
              Compartir
            </Button>
            <Button
              onClick={generateImage}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              disabled={isGenerating}
            >
              <Download size={16} />
              Descargar
            </Button>
            <Button
              onClick={generatePDF}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              disabled={isGenerating}
            >
              PDF
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              size="sm"
              disabled={isGenerating}
            >
              Cerrar
            </Button>

            {isGenerating && (
              <div className="ml-2 text-sm text-gray-600">Generando...</div>
            )}
          </div>
        </div>

        {/* Contenido del reporte */}
        <div className="p-6">
          <div
            ref={reportRef}
            className="bg-white p-6 border rounded-lg"
            style={{ minHeight: '400px' }}
          >
            {/* Header del reporte */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">2Fast Wheels Garage</h1>
              <h2 className="text-lg font-semibold text-gray-700">Reporte de Entrega</h2>
              <p className="text-sm text-gray-500">ID: {delivery._id}</p>
            </div>

            {/* Información del cliente */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Cliente</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{delivery.customer.name}</p>
                {delivery.customer.phone && (
                  <p className="text-gray-600">Teléfono: {delivery.customer.phone}</p>
                )}
                {delivery.customer.email && (
                  <p className="text-gray-600">Email: {delivery.customer.email}</p>
                )}
              </div>
            </div>

            {/* Información de entrega */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles de Entrega</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Fecha programada</p>
                    <p className="font-medium">{formatDate(delivery.scheduledDate)}</p>
                  </div>
                  {delivery.scheduledTime && (
                    <div>
                      <p className="text-sm text-gray-600">Hora</p>
                      <p className="font-medium">{formatTime(delivery.scheduledTime)}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Ubicación</p>
                  <p className="font-medium">{delivery.location}</p>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="font-medium">{statusToSpanish(delivery.status as any)}</p>
                </div>
              </div>
            </div>

            {/* Items de la entrega */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Artículos</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Artículo</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Cantidad</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Precio</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {delivery.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.carName}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                        {formatCurrency(delivery.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Información de pago */}
            {delivery.payments && delivery.payments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Pagos</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Monto pagado: {formatCurrency(delivery.paidAmount || 0)}</p>
                  <p className="text-sm text-gray-600">Estado: {delivery.paymentStatus || 'pending'}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
              <p>Generado por 2Fast Wheels Garage</p>
              <p>{new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}