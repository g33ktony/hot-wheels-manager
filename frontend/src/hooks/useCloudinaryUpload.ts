import toast from 'react-hot-toast'

// Cloudinary configuration (unsigned upload)
// Fallback values align with current production setup to avoid broken uploads
const CLOUDINARY_CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'deyzkucre').trim()
const CLOUDINARY_UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_upload').trim()

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
      // Verify environment variables
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        console.error('❌ Cloudinary config missing', {
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET
        })
        toast.error('Cloudinary no está configurado correctamente')
        return null
      }

      console.log('='.repeat(60))
      console.log('🎬 UPLOAD STARTED')
      console.log('='.repeat(60))
      console.log('Input File:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)}KB`,
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isIOS: /iPhone|iPad/.test(navigator.userAgent)
      })

      // Step 1: Validate and normalize file
      const validFile = await validateAndConvertFile(file)
      console.log('✅ Step 1 - File validated:', {
        name: validFile.name,
        type: validFile.type,
        size: `${(validFile.size / 1024).toFixed(2)}KB`
      })

      // Step 2: Compress if needed
      let fileToUpload = validFile
      if (validFile.size > 1024 * 500) {
        console.log('🗜️ Step 2 - Compressing file...')
        const compressed = await compressImageSafariCompatible(validFile)
        if (compressed && compressed.size < validFile.size) {
          fileToUpload = compressed
          console.log(`✅ Compressed: ${(validFile.size / 1024).toFixed(2)}KB → ${(compressed.size / 1024).toFixed(2)}KB`)
        }
      }

      // Step 3: Ensure proper MIME type
      let finalType = fileToUpload.type
      if (!finalType || finalType === 'application/octet-stream') {
        finalType = 'image/jpeg'
        console.log('⚠️ Step 3 - Correcting MIME type to image/jpeg')
      }

      const finalFile = new File([fileToUpload], fileToUpload.name, {
        type: finalType,
        lastModified: Date.now()
      })

      console.log('📤 Step 4 - Final file ready:', {
        name: finalFile.name,
        type: finalFile.type,
        size: `${(finalFile.size / 1024).toFixed(2)}KB`
      })

      // Step 5: Build FormData - SIMPLE VERSION
      console.log('📋 Step 5 - Building FormData')
      const formData = new FormData()
      
      // CRITICAL: These are the ONLY two fields Cloudinary needs for unsigned upload
      formData.append('file', finalFile)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      
      console.log('FormData fields:', {
        file: `${finalFile.name} (${finalFile.type})`,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        cloudName: CLOUDINARY_CLOUD_NAME
      })

      // Step 6: Send request
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      console.log('🌐 Step 6 - Sending to:', uploadUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('⏱️ TIMEOUT: Upload took > 60 seconds')
        controller.abort()
      }, 60000)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      console.log('📊 Step 7 - Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      })

      // Step 8: Parse response
      let responseData: any
      const contentType = response.headers.get('content-type') || ''

      try {
        if (contentType.includes('application/json')) {
          responseData = await response.json()
        } else {
          const text = await response.text()
          console.log('Raw response:', text.substring(0, 500))
          try {
            responseData = JSON.parse(text)
          } catch {
            responseData = { error: { message: 'Non-JSON response' } }
          }
        }
      } catch (e) {
        console.error('Failed to parse response:', e)
        responseData = {}
      }

      // Check if successful
      if (!response.ok) {
        console.error('❌ CLOUDINARY ERROR:', {
          status: response.status,
          error: responseData?.error?.message || response.statusText,
          fullResponse: JSON.stringify(responseData).substring(0, 300)
        })

        const msg = responseData?.error?.message || `HTTP ${response.status}`

        if (response.status === 401) {
          throw new Error('Cloudinary no autorizado. Revisa cloud name y upload preset (unsigned).')
        }

        throw new Error(`Cloudinary rejected upload: ${msg}`)
      }

      // Validate response
      if (!responseData?.secure_url || !responseData?.public_id) {
        console.error('❌ INVALID RESPONSE - Missing fields:', responseData)
        throw new Error('Invalid Cloudinary response')
      }

      console.log('✅ Step 8 - SUCCESS!')
      console.log('='.repeat(60))
      console.log('URL:', responseData.secure_url)
      console.log('Public ID:', responseData.public_id)
      console.log('='.repeat(60))

      return {
        url: responseData.secure_url,
        publicId: responseData.public_id,
        timestamp: Date.now()
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ UPLOAD FAILED:', msg)
      console.log('='.repeat(60))
      toast.error(`Upload failed: ${msg}`)
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
 * Validate and ensure proper format for Cloudinary
 * Strategy: Convert everything to JPEG for maximum compatibility
 */
async function validateAndConvertFile(file: File): Promise<File> {
  console.log('🔍 Validating file...')

  // HEIC/HEIF (iPhone) - MUST convert
  const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().match(/\.(heic|heif)$/)
  
  if (isHEIC) {
    console.log('📱 HEIC/HEIF detected - converting to JPEG')
    return await convertImageToJPEG(file)
  }

  // If it's already standard JPEG/PNG/WebP, keep it
  const standardTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (standardTypes.includes(file.type)) {
    console.log(`✅ Standard format: ${file.type}`)
    return file
  }

  // If type is empty, detect from extension
  if (!file.type) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    console.log(`⚠️ No MIME type, detecting from extension: ${ext}`)
    
    const mimeMap: {[key: string]: string} = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/jpeg', // Convert GIF to JPEG
      'heic': 'image/jpeg',
      'heif': 'image/jpeg'
    }
    
    const mime = mimeMap[ext || ''] || 'image/jpeg'
    console.log(`   → Using ${mime}`)
    
    return new File([file], file.name, { type: mime, lastModified: file.lastModified })
  }

  // Any other image type - convert to JPEG
  if (file.type.startsWith('image/')) {
    console.log(`⚠️ Uncommon type ${file.type} - converting to JPEG`)
    return await convertImageToJPEG(file)
  }

  console.log(`✅ File ready`)
  return file
}

/**
 * Convert any image format to JPEG using Canvas
 * Used for HEIC, HEIF, and other uncommon formats
 */
async function convertImageToJPEG(file: File): Promise<File> {
  return new Promise((resolve) => {
    try {
      console.log(`🔄 Converting ${file.name} to JPEG...`)
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = (e: any) => {
        try {
          const img = new Image()
          img.src = e.target.result

          img.onerror = () => {
            console.warn('⚠️ Image conversion failed, using original')
            resolve(file)
          }

          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                console.warn('⚠️ Canvas context failed, using original')
                resolve(file)
                return
              }

              canvas.width = img.width
              canvas.height = img.height
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, 0, 0)

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const converted = new File([blob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    })
                    console.log(`✅ Converted to JPEG: ${(file.size / 1024).toFixed(2)}KB → ${(converted.size / 1024).toFixed(2)}KB`)
                    resolve(converted)
                  } else {
                    resolve(file)
                  }
                },
                'image/jpeg',
                0.85
              )
            } catch (e) {
              console.warn('⚠️ Canvas error:', e)
              resolve(file)
            }
          }
        } catch (e) {
          console.warn('⚠️ Image load error:', e)
          resolve(file)
        }
      }

      reader.onerror = () => {
        console.warn('⚠️ FileReader error')
        resolve(file)
      }
    } catch (e) {
      console.warn('⚠️ Conversion error:', e)
      resolve(file)
    }
  })
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
