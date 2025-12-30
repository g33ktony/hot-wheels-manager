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
 * Hook para manejar uploads de imágenes a Cloudinary con mejor compatibilidad Safari/iPhone
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

      // Validate file type for compatibility
      const validFile = await validateAndConvertFile(file)
      
      // Compress image first to reduce upload time (optimized for Safari)
      const compressedFile = await compressImageSafariCompatible(validFile)
      
      console.log(`📤 Uploading image to Cloudinary...`, {
        fileName: compressedFile.name,
        fileSize: `${(compressedFile.size / 1024).toFixed(2)}KB`,
        fileType: compressedFile.type,
        cloudName: CLOUDINARY_CLOUD_NAME,
        preset: CLOUDINARY_UPLOAD_PRESET,
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      })
      
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'hot-wheels-manager/inventory')
      formData.append('resource_type', 'auto')

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      console.log('📍 Upload URL:', uploadUrl)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it automatically with multipart boundary
        }
      })

      const responseData = await response.json().catch(() => null)
      
      if (!response.ok) {
        console.error('❌ Upload error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          fileName: compressedFile.name,
          fileType: compressedFile.type
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
 * Validate file type and convert if needed for better compatibility
 */
async function validateAndConvertFile(file: File): Promise<File> {
  console.log(`🔍 Validating file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)}KB`)

  // List of supported types
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  
  // If it's already a supported type, return as-is
  if (supportedTypes.includes(file.type)) {
    console.log(`✅ File type supported: ${file.type}`)
    return file
  }

  // If type is missing or unsupported, try to detect from extension
  const fileName = file.name.toLowerCase()
  let detectedType = file.type

  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    console.log('📱 Detected HEIC/HEIF file (iOS), will convert to JPEG')
    detectedType = 'image/jpeg'
  } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    detectedType = 'image/jpeg'
  } else if (fileName.endsWith('.png')) {
    detectedType = 'image/png'
  } else if (fileName.endsWith('.webp')) {
    detectedType = 'image/webp'
  } else {
    // Default to JPEG for unknown types
    console.warn(`⚠️ Unknown file type: ${file.type}, will attempt JPEG conversion`)
    detectedType = 'image/jpeg'
  }

  // If file type was corrected, create new file with correct type
  if (detectedType !== file.type) {
    console.log(`🔄 Converting ${file.type || 'unknown'} → ${detectedType}`)
    return new File([file], file.name, { type: detectedType, lastModified: file.lastModified })
  }

  return file
}

/**
 * Compress image before uploading - optimized for Safari/iPhone compatibility
 */
async function compressImageSafariCompatible(file: File): Promise<File> {
  // If file is already small, skip compression
  if (file.size < 1024 * 300) { // < 300KB
    console.log(`ℹ️ File small enough (${(file.size / 1024).toFixed(2)}KB), skipping compression`)
    return file
  }

  console.log(`🗜️ Compressing image: ${(file.size / 1024).toFixed(2)}KB`)

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
              
              // Calculate new dimensions
              let { width, height } = img
              const maxWidth = 1200
              const maxHeight = 1200
              
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height)
                width = Math.round(width * ratio)
                height = Math.round(height * ratio)
                console.log(`📐 Resizing: ${img.width}x${img.height} → ${width}x${height}`)
              }
              
              canvas.width = width
              canvas.height = height
              
              // Use better image smoothing for quality
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, 0, 0, width, height)
              
              // Try JPEG first (best compatibility), then WebP, then PNG
              const tryCompressionFormats = [
                { type: 'image/jpeg', quality: 0.75 },
                { type: 'image/jpeg', quality: 0.65 },
                { type: 'image/png', quality: 0.8 }
              ]
              
              let compressionAttempt = 0
              
              const attemptCompression = () => {
                if (compressionAttempt >= tryCompressionFormats.length) {
                  console.warn('⚠️ All compression attempts failed, using original file')
                  resolve(file)
                  return
                }
                
                const { type, quality } = tryCompressionFormats[compressionAttempt]
                console.log(`💾 Attempting compression ${compressionAttempt + 1}/${tryCompressionFormats.length}: ${type} @ ${(quality * 100).toFixed(0)}%`)
                
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      console.warn(`⚠️ Compression failed for ${type}, trying next format...`)
                      compressionAttempt++
                      attemptCompression()
                      return
                    }
                    
                    // If compressed file is actually larger or close to original, use original
                    if (blob.size > file.size * 0.95) {
                      console.log(`📊 Compressed file not smaller, keeping original: ${(file.size / 1024).toFixed(2)}KB`)
                      resolve(file)
                      return
                    }
                    
                    const compressedFile = new File([blob], file.name, {
                      type: type,
                      lastModified: Date.now()
                    })
                    
                    console.log(`✅ Compression successful: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB (${(100 - (compressedFile.size / file.size) * 100).toFixed(0)}% reduction)`)
                    resolve(compressedFile)
                  },
                  type,
                  quality
                )
              }
              
              attemptCompression()
              
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
