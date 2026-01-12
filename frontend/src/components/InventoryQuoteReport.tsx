import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { Download, Share2, FileText, Edit2, Check, X } from 'lucide-react'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import type { InventoryItem } from '@shared/types'

interface QuoteItem {
  inventoryItem: InventoryItem
  customPrice: number
  carInfo?: {
    model: string
    series?: string
    year?: string
  }
}

interface InventoryQuoteReportProps {
  items: InventoryItem[]
  onClose: () => void
}

export default function InventoryQuoteReport({ items, onClose }: InventoryQuoteReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null)
  const [tempPrice, setTempPrice] = useState('')
  const [companyName] = useState(import.meta.env.VITE_STORE_NAME || '2Fast Wheels Garage')
  const [notes, setNotes] = useState('')

  const DESKTOP_WIDTH = 1000
  const generationCancelledRef = useRef({ cancelled: false })

  // Initialize quote items with car info
  useEffect(() => {
    const initQuoteItems = async () => {
      const itemsWithInfo = await Promise.all(
        items.map(async (item) => {
          // Try to get car info if carId exists
          let carInfo = undefined
          if (item.carId) {
            try {
              // You can fetch car details from your API here if needed
              // For now, we'll use the carId as model
              carInfo = {
                model: item.carId,
                series: (item as any).seriesName || '',
                year: ''
              }
            } catch (error) {
              console.warn('Could not fetch car info:', error)
            }
          }

          return {
            inventoryItem: item,
            customPrice: item.actualPrice || item.suggestedPrice || 0,
            carInfo
          }
        })
      )
      setQuoteItems(itemsWithInfo)
    }

    initQuoteItems()
  }, [items])

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

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTotalPrice = () => {
    return quoteItems.reduce((sum, item) => sum + item.customPrice, 0)
  }

  const handlePriceEdit = (index: number) => {
    setEditingPriceIndex(index)
    setTempPrice(quoteItems[index].customPrice.toString())
  }

  const handlePriceSave = (index: number) => {
    const newPrice = parseFloat(tempPrice)
    if (!isNaN(newPrice) && newPrice >= 0) {
      const updated = [...quoteItems]
      updated[index].customPrice = newPrice
      setQuoteItems(updated)
    }
    setEditingPriceIndex(null)
    setTempPrice('')
  }

  const handlePriceCancel = () => {
    setEditingPriceIndex(null)
    setTempPrice('')
  }

  const generatePDF = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    setShowPreview(false)

    // Wait for re-render without preview buttons
    await new Promise(resolve => setTimeout(resolve, 100))

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
      pdf.save(`cotizacion-${new Date().getTime()}.pdf`)
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar PDF del reporte')
    } finally {
      if (capturedContainer && capturedContainer.parentNode) capturedContainer.parentNode.removeChild(capturedContainer)
      setIsGenerating(false)
      setShowPreview(true)
    }
  }

  const shareReport = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)
    setShowPreview(false)

    // Wait for re-render without preview buttons
    await new Promise(resolve => setTimeout(resolve, 100))

    let capturedContainer: HTMLElement | null = null
    try {
      const nav: any = navigator
      const { blob, container: c } = await captureNode(reportRef.current, DESKTOP_WIDTH)
      capturedContainer = c
      if (!blob) throw new Error('No se pudo generar la imagen')

      const file = new File([blob], `cotizacion-${new Date().getTime()}.png`, { type: 'image/png' })
      const shareMeta: any = {
        title: 'Cotización de Inventario',
        text: `Cotización de ${quoteItems.length} items - Total: ${formatCurrency(getTotalPrice())}`
      }

      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({ ...shareMeta, files: [file] })
          return
        } catch (err) {
          console.warn('navigator.share(files) failed', err)
        }
      }

      if (nav.share) {
        try {
          await nav.share({ ...shareMeta, files: [file] })
          return
        } catch (err) {
          console.warn('navigator.share(files) fallback failed', err)
        }
      }

      const wantOpen = window.confirm('No fue posible abrir el menú de compartir automáticamente. ¿Deseas abrir la imagen en una nueva pestaña?')
      if (wantOpen) {
        const url = URL.createObjectURL(blob)
        const w = window.open(url, '_blank')
        if (!w) downloadBlob(blob, `cotizacion-${new Date().getTime()}.png`)
        else setTimeout(() => URL.revokeObjectURL(url), 15000)
        return
      }

      const shouldDownload = window.confirm('¿Deseas descargar el reporte en su lugar?')
      if (shouldDownload) downloadBlob(blob, `cotizacion-${new Date().getTime()}.png`)
    } catch (error) {
      console.error('Error compartiendo:', error)
      alert('Error al compartir el reporte')
    } finally {
      if (capturedContainer && capturedContainer.parentNode) capturedContainer.parentNode.removeChild(capturedContainer)
      setIsGenerating(false)
      setShowPreview(true)
    }
  }

  const getBrandLabel = (item: InventoryItem) => {
    return item.brand || 'Hot Wheels'
  }

  const getPieceTypeLabel = (item: InventoryItem) => {
    const typeMap: Record<string, string> = {
      'basic': 'Básico',
      'premium': 'Premium',
      'rlc': 'RLC',
      'silver_series': 'Silver Series',
      'elite_64': 'Elite 64'
    }
    return item.pieceType ? typeMap[item.pieceType] || item.pieceType : ''
  }

  const ReportContent = (
    <div className="bg-white p-8" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg -mx-8 -mt-8 mb-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{companyName}</h1>
          <p className="text-lg">Cotización de Inventario</p>
        </div>
      </div>

      {/* Date and Info */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-600">Fecha</p>
            <p className="text-lg font-semibold">{formatDate()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total de Items</p>
            <p className="text-lg font-semibold">{quoteItems.length}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left p-3 text-sm font-semibold">#</th>
              <th className="text-left p-3 text-sm font-semibold">Modelo</th>
              <th className="text-left p-3 text-sm font-semibold">Marca</th>
              <th className="text-left p-3 text-sm font-semibold">Tipo</th>
              <th className="text-left p-3 text-sm font-semibold">Condición</th>
              <th className="text-right p-3 text-sm font-semibold">Precio</th>
            </tr>
          </thead>
          <tbody>
            {quoteItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 text-sm">{index + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.inventoryItem.photos && item.inventoryItem.photos.length > 0 && (
                      <img
                        src={item.inventoryItem.photos[0]}
                        alt="Item"
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.carInfo?.model || item.inventoryItem.carId || 'Sin modelo'}</p>
                      {item.carInfo?.series && (
                        <p className="text-xs text-gray-600">{item.carInfo.series}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-sm">{getBrandLabel(item.inventoryItem)}</td>
                <td className="p-3 text-sm">{getPieceTypeLabel(item.inventoryItem)}</td>
                <td className="p-3 text-sm capitalize">{item.inventoryItem.condition}</td>
                <td className="p-3 text-right">
                  {showPreview && editingPriceIndex === index ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        className="w-24 text-right text-sm"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                      <button
                        onClick={() => handlePriceSave(index)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handlePriceCancel}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm font-medium">{formatCurrency(item.customPrice)}</span>
                      {showPreview && (
                        <button
                          onClick={() => handlePriceEdit(index)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(getTotalPrice())}</span>
            </div>
            <div className="flex justify-between items-center mb-2 text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(getTotalPrice())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">Notas:</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
        <p>Gracias por tu interés. Esta cotización es válida por 7 días.</p>
        <p className="mt-2">Para más información, contáctanos.</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={24} />
            <h2 className="text-xl font-bold">Cotización de Inventario</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Agrega notas o condiciones especiales para esta cotización..."
              />
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Puedes editar los precios haciendo clic en el ícono de lápiz junto a cada precio.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <Download size={18} />
                Descargar PDF
              </Button>
              <Button
                variant="secondary"
                onClick={shareReport}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <Share2 size={18} />
                Compartir
              </Button>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="flex-1 overflow-auto">
          <div ref={reportRef}>
            {ReportContent}
          </div>
        </div>

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-700 font-medium">Generando reporte...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
