import toast from 'react-hot-toast'

// Cloudinary configuration (using unsigned upload - no backend needed)
// Get your cloud name from https://cloudinary.com/console
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'hot-wheels-manager'
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_upload'

interface UploadResponse {
  url: string
  publicId: string
  timestamp: number
}

/**
 * Hook para manejar uploads de imágenes a Cloudinary
 * Las imágenes se guardan en la nube en lugar de la BD
 */
export const useCloudinaryUpload = () => {
  const uploadImage = async (file: File): Promise<UploadResponse | null> => {
    try {
      // Verify environment variables are set
      if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'hot-wheels-manager') {
        console.error('❌ CLOUDINARY_CLOUD_NAME not configured:', CLOUDINARY_CLOUD_NAME)
        toast.error('Cloudinary no está configurado correctamente')
        return null
      }

      if (!CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'unsigned_upload') {
        console.warn('⚠️ Using default upload preset, may need configuration')
      }

      // Compress image first to reduce upload time
      const compressedFile = await compressImage(file)
      
      console.log(`📤 Uploading image to Cloudinary...`, {
        fileName: compressedFile.name,
        fileSize: compressedFile.size,
        fileType: compressedFile.type,
        cloudName: CLOUDINARY_CLOUD_NAME,
        preset: CLOUDINARY_UPLOAD_PRESET
      })
      
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'hot-wheels-manager/inventory')

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      console.log('📍 Upload URL:', uploadUrl)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
        // Note: Don't set Content-Type header, let browser set it with boundary for multipart/form-data
      })

      const responseData = await response.json().catch(() => null)
      
      if (!response.ok) {
        console.error('❌ Upload error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        })
        const errorMsg = responseData?.error?.message || response.statusText || 'Unknown error'
        throw new Error(`Cloudinary error (${response.status}): ${errorMsg}`)
      }

      console.log('✅ Image uploaded successfully:', responseData?.secure_url)
      
      return {
        url: responseData.secure_url,
        publicId: responseData.public_id,
        timestamp: Date.now()
      } as UploadResponse
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error uploading image:', errorMsg)
      toast.error(`Error: ${errorMsg}`)
      return null
    }
  }

  const deleteImage = async (_publicId: string): Promise<boolean> => {
    try {
      // Note: Deleting from Cloudinary via unsigned upload requires signed requests
      // For now, we'll just remove from our database
      // In production, use a backend endpoint to delete with signed request
      console.log('📝 Note: Image deletion requires backend implementation')
      return true
    } catch (error) {
      console.error('❌ Error deleting image:', error)
      return false
    }
  }

  return { uploadImage, deleteImage }
}

/**
 * Compress image before uploading to reduce bandwidth
 */
async function compressImage(file: File): Promise<File> {
  // If file is already small, skip compression
  if (file.size < 1024 * 100) { // < 100KB
    console.log('ℹ️ File already small, skipping compression')
    return file
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event: any) => {
        try {
          const img = new Image()
          img.src = event.target.result
          img.onerror = () => {
            console.warn('⚠️ Image failed to load for compression, using original file')
            resolve(file)
          }
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              if (!ctx) {
                console.warn('⚠️ Canvas context not available, using original file')
                resolve(file)
                return
              }
              
              // Reduce dimensions if image is very large
              let { width, height } = img
              if (width > 1200) {
                height = (height * 1200) / width
                width = 1200
              }
              
              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
              
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    console.warn('⚠️ Blob creation failed, using original file')
                    resolve(file)
                    return
                  }
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  })
                  console.log(`✅ Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`)
                  resolve(compressedFile)
                },
                'image/jpeg',
                0.7 // 70% quality
              )
            } catch (canvasError) {
              console.warn('⚠️ Canvas operation failed:', canvasError, 'using original file')
              resolve(file)
            }
          }
        } catch (readerError) {
          console.warn('⚠️ Image load failed:', readerError, 'using original file')
          resolve(file)
        }
      }
      reader.onerror = () => {
        console.warn('⚠️ FileReader failed, using original file')
        resolve(file)
      }
    } catch (error) {
      console.warn('⚠️ Compression error:', error, 'using original file')
      resolve(file)
    }
  })
}

/**
 * Generate Cloudinary URL with transformations
 */
export const getCloudinaryUrl = (publicId: string, options: {
  width?: number
  height?: number
  quality?: 'auto' | 'low' | 'normal' | 'high'
  format?: 'auto' | 'webp' | 'jpg'
} = {}): string => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
    format = 'auto'
  } = options

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_${width},h_${height},q_${quality},f_${format},c_limit/${publicId}`
}
