import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Share2, FileText } from 'lucide-react'
import Button from '@/components/common/Button'
import type { Delivery } from '@shared/types'

interface DeliveryReportProps {
  delivery: Delivery
  onClose: () => void
  // When true, render only the inner report content (no outer modal wrapper or header actions).
  inline?: boolean
}

export default function DeliveryReport({ delivery, onClose, inline }: DeliveryReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const DESKTOP_WIDTH = 1000
  const generationCancelledRef = useRef({ cancelled: false })

  async function captureNode(node: HTMLElement, desktopWidth = DESKTOP_WIDTH) {
    const originalRect = node.getBoundingClientRect()
    const clone = node.cloneNode(true) as HTMLElement
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = `${desktopWidth}px`
    container.style.overflow = 'visible'
    container.appendChild(clone)
    document.body.appendChild(container)

    clone.style.width = `${desktopWidth}px`
    clone.style.boxSizing = 'border-box'

    const scale = Math.min(2, (desktopWidth / (originalRect.width || desktopWidth)) * 2)

    try {
      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        allowTaint: true,
        width: desktopWidth,
        height: clone.scrollHeight
      })
      if (generationCancelledRef.current.cancelled) {
        if (container.parentNode) container.parentNode.removeChild(container)
        throw new Error('generation cancelled')
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b)))
      return { blob, canvas, container }
    } catch (err) {
      if (container.parentNode) container.parentNode.removeChild(container)
      throw err
    }
  }

  function cancelGeneration() {
    generationCancelledRef.current.cancelled = true
    setIsGenerating(false)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

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
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const generateImage = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    let capturedContainer: HTMLElement | null = null
    try {
      const { blob, container: c } = await captureNode(reportRef.current, DESKTOP_WIDTH)
      capturedContainer = c
      if (!blob) throw new Error('no blob')
      downloadBlob(blob, `reporte-entrega-${delivery._id || 'sin-id'}.png`)
    } catch (error) {
      console.error('Error generando imagen:', error)
      alert('Error al generar la imagen del reporte')
    } finally {
      if (capturedContainer && capturedContainer.parentNode) capturedContainer.parentNode.removeChild(capturedContainer)
      setIsGenerating(false)
    }
  }

  const shareImage = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    let capturedContainer: HTMLElement | null = null
    try {
      const nav: any = navigator
      const { blob, container: c } = await captureNode(reportRef.current, DESKTOP_WIDTH)
      capturedContainer = c
      if (!blob) throw new Error('No se pudo generar la imagen')

      const file = new File([blob], `reporte-entrega-${delivery._id || 'sin-id'}.png`, { type: 'image/png' })
      const shareMeta: any = { title: 'Reporte de Entrega', text: `Entrega para ${delivery.customer?.name || ''}` }

      // Prefer file-based share
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({ ...shareMeta, files: [file] })
          return
        } catch (err) {
          console.warn('navigator.share(files) failed', err)
        }
      }

      // Try calling share(files) even if canShare wasn't present
      if (nav.share) {
        try {
          await nav.share({ ...shareMeta, files: [file] })
          return
        } catch (err) {
          console.warn('navigator.share(files) fallback failed', err)
        }
      }

      // Try text-only share
      if (nav.share) {
        try {
          await nav.share(shareMeta)
          return
        } catch (err) {
          console.warn('navigator.share(text) failed', err)
        }
      }

      // Final fallback: open in new tab or download
      const wantOpen = window.confirm('No fue posible abrir el menú de compartir automáticamente. ¿Deseas abrir la imagen en una nueva pestaña para compartirla manualmente?')
      if (wantOpen) {
        const url = URL.createObjectURL(blob)
        const w = window.open(url, '_blank')
        if (!w) downloadBlob(blob, `reporte-entrega-${delivery._id || 'sin-id'}.png`)
        else setTimeout(() => URL.revokeObjectURL(url), 15000)
        return
      }

      const shouldDownload = window.confirm('¿Deseas descargar el reporte en su lugar?')
      if (shouldDownload) downloadBlob(blob, `reporte-entrega-${delivery._id || 'sin-id'}.png`)
    } catch (error) {
      console.error('Error generando imagen para compartir:', error)
      const shouldDownload = window.confirm('No fue posible compartir el reporte. ¿Deseas descargarlo en su lugar?')
      if (shouldDownload) {
        try {
          await generateImage()
        } catch (_) {
          /* ignore */
        }
      }
    } finally {
      if (capturedContainer && capturedContainer.parentNode) capturedContainer.parentNode.removeChild(capturedContainer)
      setIsGenerating(false)
    }
  }

  const generatePDF = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    let capturedContainer: HTMLElement | null = null
    try {
      const { canvas, container: c } = await captureNode(reportRef.current, DESKTOP_WIDTH)
      capturedContainer = c
      if (!canvas) throw new Error('no canvas')
      const imgData = canvas.toDataURL('image/png')
      const jspdfModule: any = await import('jspdf')
      const { jsPDF } = jspdfModule
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const renderedWidth = pdfWidth
      const renderedHeight = (imgHeight * renderedWidth) / imgWidth

      if (renderedHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, renderedWidth, renderedHeight)
      } else {
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
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar PDF del reporte')
    } finally {
      if (capturedContainer && capturedContainer.parentNode) capturedContainer.parentNode.removeChild(capturedContainer)
      setIsGenerating(false)
    }
  }

  const ReportContent = (
    <div className="bg-white p-6 border rounded-lg" style={{ minHeight: '400px' }}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">2Fast Wheels Garage</h1>
        <h2 className="text-lg font-semibold text-gray-700">Reporte de Entrega</h2>
        <p className="text-sm text-gray-500">ID: {delivery._id}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Cliente</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-medium text-gray-900">{delivery.customer?.name}</p>
          {delivery.customer?.phone && <p className="text-gray-600">Teléfono: {delivery.customer.phone}</p>}
          {delivery.customer?.email && <p className="text-gray-600">Email: {delivery.customer.email}</p>}
        </div>
      </div>

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
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-900">Total:</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">{formatCurrency(delivery.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {delivery.payments && delivery.payments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pagos</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Monto pagado: {formatCurrency(delivery.paidAmount || 0)}</p>
            <p className="text-sm text-gray-600">Estado: {delivery.paymentStatus || 'pending'}</p>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Generado por 2Fast Wheels Garage</p>
        <p>{new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  )

  // Render inline content when embedded
  if (inline) {
    return (
      <div className="p-6 relative">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600" />
              <div className="text-sm text-gray-700">Generando imagen, por favor espera...</div>
              <div className="flex gap-2">
                <Button onClick={cancelGeneration} variant="secondary" size="sm">Cancelar</Button>
              </div>
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Reporte de Entrega</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={shareImage} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Compartir reporte">
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button onClick={generateImage} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Descargar reporte">
              <Download size={16} />
              <span className="hidden sm:inline">Descargar</span>
            </Button>

            <Button onClick={generatePDF} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Generar PDF">
              <FileText size={16} />
              <span className="hidden sm:inline">PDF</span>
            </Button>

            <Button onClick={onClose} variant="secondary" size="sm" className="min-w-0" disabled={isGenerating} aria-label="Cerrar reporte">
              <span className="hidden sm:inline">Cerrar</span>
            </Button>
          </div>
        </div>

        <div ref={reportRef}>{ReportContent}</div>
      </div>
    )
  }

  // Default: full-screen modal with header actions
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-x-hidden">
      <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b gap-4 flex-wrap" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <h2 className="text-xl font-bold text-gray-900">Reporte de Entrega</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={shareImage} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Compartir reporte">
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartir</span>
            </Button>

            <Button onClick={generateImage} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Descargar reporte">
              <Download size={16} />
              <span className="hidden sm:inline">Descargar</span>
            </Button>

            <Button onClick={generatePDF} variant="secondary" size="sm" className="flex items-center gap-2 min-w-0" disabled={isGenerating} aria-label="Generar PDF">
              <FileText size={16} />
              <span className="hidden sm:inline">PDF</span>
            </Button>

            <Button onClick={onClose} variant="secondary" size="sm" className="min-w-0" disabled={isGenerating} aria-label="Cerrar reporte">
              <span className="hidden sm:inline">Cerrar</span>
            </Button>

            {isGenerating && (
              <div className="ml-2 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
                <div className="text-sm text-gray-600">Generando...</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
              <div className="text-sm text-gray-700">Generando imagen, por favor espera...</div>
            </div>
          )}

          <div ref={reportRef}>{ReportContent}</div>
        </div>
      </div>
    </div>
  )
}