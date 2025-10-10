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
    return new Intl.NumberFormat('es-MX', {
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
        return 'Entregado'
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

  // (removed openBlobInNewTab helper; handling is done inline below)

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

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b)))
      if (!blob) throw new Error('No se pudo generar la imagen')

      const file = new File([blob], `reporte-entrega-${delivery._id || 'sin-id'}.png`, { type: 'image/png' })

      const shareData: any = {
        title: 'Reporte de Entrega',
        text: `Entrega para ${delivery.customer.name}`
      }

      const nav: any = navigator

      // 1) Prefer sharing the file via Web Share API (fast path)
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ ...shareData, files: [file] })
          return
        } catch (err) {
          console.warn('share(files) falló', err)
        }
      }

      // 2) Try plain share (text/title)
      if (nav.share) {
        try {
          await nav.share(shareData)
          return
        } catch (err) {
          console.warn('navigator.share con texto falló', err)
        }
      }

      // 3) Ask user whether to open the image in a new tab for manual sharing (explicit opt-in)
      const wantOpen = window.confirm('No fue posible abrir el menú de compartir automáticamente. ¿Deseas abrir la imagen en una nueva pestaña para compartirla manualmente (usar menú de Safari)?')
      if (wantOpen) {
        try {
          const url = URL.createObjectURL(blob)
          // Open in a new tab now (user-initiated) — should avoid popup blockers
          const w = window.open(url, '_blank')
          if (!w) {
            // If still blocked, fall back to download
            generateImage()
          } else {
            setTimeout(() => URL.revokeObjectURL(url), 15000)
          }
          return
        } catch (e) {
          console.warn('No se pudo abrir la nueva pestaña con la imagen', e)
        }
      }

      // 4) Last resort: ask to download
      const shouldDownload = window.confirm('¿Deseas descargar el reporte en su lugar?')
      if (shouldDownload) generateImage()

    } catch (error) {
      console.error('Error generando imagen para compartir:', error)
      const shouldDownload = window.confirm('No fue posible compartir el reporte. ¿Deseas descargarlo en su lugar?')
      if (shouldDownload) generateImage()
    } finally {
      setIsGenerating(false)
    }
  }

  const generatePDF = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)

    // Render at a desktop-like width so mobile PDFs look like desktop
    const DESKTOP_WIDTH = 1000 // px — chosen to emulate desktop layout

    try {
      // Clone the report node so we can style it independently
      const original = reportRef.current
      const clone = original.cloneNode(true) as HTMLElement

      // Create an offscreen container to host the clone
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = `${DESKTOP_WIDTH}px`
      container.style.overflow = 'visible'
      container.appendChild(clone)
      document.body.appendChild(container)

      // Apply desktop-like styles to the clone root to force desktop layout
      clone.style.width = `${DESKTOP_WIDTH}px`
      clone.style.boxSizing = 'border-box'

      // Use html2canvas on the clone with higher scale for crispness
      const scale = Math.min(2, (DESKTOP_WIDTH / (original.getBoundingClientRect().width || DESKTOP_WIDTH)) * 2)

      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        allowTaint: true,
        width: DESKTOP_WIDTH,
        height: clone.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')

      // Dynamically import jspdf only when needed
      const jspdfModule: any = await import('jspdf')
      const { jsPDF } = jspdfModule

      // Prepare PDF (A4 in points)
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // The canvas dimensions are in device pixels; compute rendered size to fit PDF width
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const renderedWidth = pdfWidth
      const renderedHeight = (imgHeight * renderedWidth) / imgWidth

      // If the renderedHeight fits in one page, add once. Otherwise, split into pages
      if (renderedHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, renderedWidth, renderedHeight)
      } else {
        // For tall images, slice vertically into page-sized chunks
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')!

        const pxPerPt = imgWidth / renderedWidth
        const pagePxHeight = Math.floor(pdfHeight * pxPerPt)

        pageCanvas.width = imgWidth
        pageCanvas.height = pagePxHeight

        let yOffset = 0
        let pageIndex = 0
        while (yOffset < imgHeight) {
          pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height)
          pageCtx.drawImage(canvas, 0, yOffset, imgWidth, pagePxHeight, 0, 0, imgWidth, pagePxHeight)
          const pageData = pageCanvas.toDataURL('image/png')

          if (pageIndex > 0) pdf.addPage()
          pdf.addImage(pageData, 'PNG', 0, 0, renderedWidth, pdfHeight)

          yOffset += pagePxHeight
          pageIndex += 1
        }
      }

      pdf.save(`reporte-entrega-${delivery._id || 'sin-id'}.pdf`)

      // Cleanup clone container
      document.body.removeChild(container)

    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar PDF del reporte')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-x-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header con acciones */}
        <div className="flex justify-between items-center p-6 border-b gap-4 flex-wrap" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <h2 className="text-xl font-bold text-gray-900">Reporte de Entrega</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Button onClick={shareImage} variant="secondary" size="sm" className="flex items-center gap-2" disabled={isGenerating}>
              <Share2 size={16} />
              Compartir
            </Button>

            <Button onClick={generateImage} variant="secondary" size="sm" className="flex items-center gap-2" disabled={isGenerating}>
              <Download size={16} />
              Descargar
            </Button>

            <Button onClick={generatePDF} variant="secondary" size="sm" className="flex items-center gap-2" disabled={isGenerating}>
              PDF
            </Button>

            <Button onClick={onClose} variant="secondary" size="sm" disabled={isGenerating}>
              Cerrar
            </Button>

            {isGenerating && <div className="ml-2 text-sm text-gray-600">Generando...</div>}
          </div>
        </div>

        {/* Contenido del reporte */}
        <div className="p-6">
          <div ref={reportRef} className="bg-white p-6 border rounded-lg" style={{ minHeight: '400px' }}>
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
                {delivery.customer.phone && <p className="text-gray-600">Teléfono: {delivery.customer.phone}</p>}
                {delivery.customer.email && <p className="text-gray-600">Email: {delivery.customer.email}</p>}
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
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[640px]">
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
                        <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">{formatCurrency(delivery.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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