import React, { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import Modal from './common/Modal'
import Button from './common/Button'
import { useEditCatalogItem } from '@/hooks/useEditCatalogItem'
import { uploadImageToCloudinary } from '@/services/cloudinary'

interface EditCatalogModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSuccess?: () => void
  inline?: boolean
}

export default function EditCatalogModal({ isOpen, onClose, item, onSuccess, inline = false }: EditCatalogModalProps) {
  const [formData, setFormData] = useState({
    carModel: '',
    photo_url: '',
    year: '',
    series: '',
    series_num: '',
    color: '',
    tampo: '',
    wheel_type: '',
    car_make: '',
    segment: '',
    country: '',
    brand: ''
  })

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const editMutation = useEditCatalogItem()

  // Initialize form with item data when opened
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        carModel: item.carModel || item.model || '',
        photo_url: item.photo_url || '',
        year: item.year || '',
        series: item.series || '',
        series_num: item.series_num || '',
        color: item.color || '',
        tampo: item.tampo || '',
        wheel_type: item.wheel_type || '',
        car_make: item.car_make || '',
        segment: item.segment || '',
        country: item.country || '',
        brand: item.brand || 'Hot Wheels'
      })
      setPhotoPreview(item.photo_url || '')
    }
  }, [item, isOpen])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const url = await uploadImageToCloudinary(file, 'hot-wheels-manager/catalog')
      setFormData(prev => ({ ...prev, photo_url: url }))
      setPhotoPreview(url)
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await editMutation.mutateAsync({
        toyNum: item.toy_num,
        data: formData
      })
      
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error('Error al guardar:', error)
    }
  }

  const modalContent = (
    <div className="space-y-4">
      {/* Photo Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Auto</label>
        <div className="flex gap-4">
          {photoPreview && (
            <img 
              src={photoPreview} 
              alt="Preview" 
              className="w-24 h-24 object-cover rounded border"
            />
          )}
          <label className="flex-1 border-2 border-dashed border-gray-300 rounded p-4 flex items-center justify-center cursor-pointer hover:border-blue-500">
            <div className="text-center">
              <Upload size={24} className="text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">
                {uploadingPhoto ? 'Subiendo...' : 'Clic para subir foto'}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Nombre del Auto */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Auto</label>
          <input
            type="text"
            name="carModel"
            value={formData.carModel}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del modelo"
          />
        </div>

        {/* Marca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <select
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Hot Wheels">Hot Wheels</option>
            <option value="Mini GT">Mini GT</option>
            <option value="Pop Race">Pop Race</option>
            <option value="Kaido House">Kaido House</option>
            <option value="Tomica">Tomica</option>
          </select>
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <input
            type="text"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2024"
          />
        </div>

        {/* Serie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serie</label>
          <input
            type="text"
            name="series"
            value={formData.series}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de la serie"
          />
        </div>

        {/* Número de Serie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1"># de Serie</label>
          <input
            type="text"
            name="series_num"
            value={formData.series_num}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1/250"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rojo metálico"
          />
        </div>

        {/* Tampo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tampo</label>
          <input
            type="text"
            name="tampo"
            value={formData.tampo}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hot Wheels"
          />
        </div>

        {/* Tipo de Rueda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Rueda</label>
          <input
            type="text"
            name="wheel_type"
            value={formData.wheel_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hong Kong"
          />
        </div>

        {/* Marca del Auto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca (Ford, BMW, etc.)</label>
          <input
            type="text"
            name="car_make"
            value={formData.car_make}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ford"
          />
        </div>

        {/* Segmento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
          <input
            type="text"
            name="segment"
            value={formData.segment}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Muscle Car"
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hong Kong"
          />
        </div>
      </div>
    </div>
  )

  if (inline) {
    return isOpen && item ? (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Editar: {item.carModel || item.model}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {modalContent}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={editMutation.isLoading}
            >
              {editMutation.isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    ) : null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar: ${item?.carModel || item?.model || 'Auto'}`}
      maxWidth="lg"
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={editMutation.isLoading}
          >
            {editMutation.isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {modalContent}
      </form>
    </Modal>
  )
}
