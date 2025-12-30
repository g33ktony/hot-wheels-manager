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

      // Check for Safari/iOS to apply special handling
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

      console.log(`🎬 Starting upload process:`, {
        originalFileName: file.name,
        originalSize: `${(file.size / 1024).toFixed(2)}KB`,
        originalType: file.type,
        isSafari,
        isIOS,
        userAgent: navigator.userAgent.substring(0, 100)
      })

      // Step 1: Validate and normalize file
      const validFile = await validateAndConvertFile(file)
      console.log(`✅ Step 1 - File validated:`, {
        name: validFile.name,
        type: validFile.type,
        size: `${(validFile.size / 1024).toFixed(2)}KB`
      })

      // Step 2: Compress if needed
      let fileToUpload = validFile
      if (validFile.size > 1024 * 500) {
        console.log(`🗜️ Step 2 - File is large, attempting compression...`)
        const compressed = await compressImageSafariCompatible(validFile)
        if (compressed && compressed.size < validFile.size) {
          fileToUpload = compressed
          console.log(`✅ Step 2 - Compression successful:`, {
            before: `${(validFile.size / 1024).toFixed(2)}KB`,
            after: `${(compressed.size / 1024).toFixed(2)}KB`,
            saved: `${((1 - compressed.size / validFile.size) * 100).toFixed(1)}%`
          })
        } else {
          console.log(`⏭️ Step 2 - Compression failed or not beneficial, using original`)
        }
      } else {
        console.log(`✅ Step 2 - File size OK (${(validFile.size / 1024).toFixed(2)}KB), skipping compression`)
      }

      // Step 3: Ensure proper file format
      let finalType = fileToUpload.type
      if (!finalType || finalType === 'application/octet-stream') {
        finalType = 'image/jpeg'
        console.log(`⚠️ Step 3 - Empty/unknown type detected, using image/jpeg`)
      }

      const finalFile = new File([fileToUpload], fileToUpload.name, { 
        type: finalType,
        lastModified: Date.now()
      })

      console.log(`📤 Step 4 - Preparing FormData:`, {
        fileName: finalFile.name,
        fileSize: `${(finalFile.size / 1024).toFixed(2)}KB`,
        fileType: finalFile.type,
        cloudName: CLOUDINARY_CLOUD_NAME,
        preset: CLOUDINARY_UPLOAD_PRESET
      })

      // Step 4: Build FormData - Safari/iOS may be picky about this
      const formData = new FormData()
      formData.append('file', finalFile)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      
      // For Safari iOS, try to add an explicit timestamp to prevent caching issues
      if (isIOS || isSafari) {
        formData.append('timestamp', String(Math.floor(Date.now() / 1000)))
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      console.log('🌐 Step 5 - Sending request to Cloudinary')

      // Step 5: Execute upload with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Upload timeout after 60 seconds')
        controller.abort()
      }, 60000)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
        // Don't set Content-Type - let browser set it with multipart boundary
      })

      clearTimeout(timeoutId)

      console.log(`📊 Step 6 - Received response:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      })

      // Step 6: Parse response safely
      let responseData: any
      const contentType = response.headers.get('content-type') || ''
      
      try {
        if (contentType.includes('application/json')) {
          responseData = await response.json()
        } else {
          const text = await response.text()
          responseData = JSON.parse(text)
        }
      } catch (parseError) {
        console.error('⚠️ Could not parse response as JSON')
        const text = await response.text()
        console.log('Response body:', text.substring(0, 500))
        responseData = { error: { message: 'Invalid response format' } }
      }

      // Step 7: Check for errors
      if (!response.ok) {
        console.error('❌ Step 7 - Cloudinary error:')
        console.error('  Status:', response.status)
        console.error('  Response:', JSON.stringify(responseData, null, 2).substring(0, 500))
        console.error('  File info:', {
          name: finalFile.name,
          size: `${(finalFile.size / 1024).toFixed(2)}KB`,
          type: finalFile.type
        })

        if (response.status === 400) {
          const errorDetail = responseData?.error?.message || 'Invalid file format'
          throw new Error(`400 Bad Request - ${errorDetail}. Intenta convertir a JPG.`)
        } else if (response.status === 413) {
          throw new Error(`413 File too large - La imagen es demasiado grande`)
        } else if (response.status === 415) {
          throw new Error(`415 Unsupported media type - Formato no soportado`)
        }

        const errorMsg = responseData?.error?.message || response.statusText || 'Unknown error'
        throw new Error(`Cloudinary error (${response.status}): ${errorMsg}`)
      }

      // Step 8: Validate response structure
      if (!responseData?.secure_url || !responseData?.public_id) {
        console.error('❌ Step 8 - Invalid response structure:', responseData)
        throw new Error('Invalid Cloudinary response - missing secure_url or public_id')
      }

      console.log('✅ Step 8 - Upload successful!', {
        url: responseData.secure_url,
        publicId: responseData.public_id,
        bytes: responseData.bytes,
        width: responseData.width,
        height: responseData.height
      })

      return {
        url: responseData.secure_url,
        publicId: responseData.public_id,
        timestamp: Date.now()
      } as UploadResponse

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Upload failed:', errorMsg)
      toast.error(`Upload failed: ${errorMsg}`)
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
 * Validate file type and convert if needed for better compatibility with Safari/iOS
 */
async function validateAndConvertFile(file: File): Promise<File> {
  console.log(`🔍 File Validation:`)
  console.log(`   Name: ${file.name}`)
  console.log(`   Type: ${file.type || '(empty - CRITICAL)'}`)
  console.log(`   Size: ${(file.size / 1024).toFixed(2)}KB`)
  console.log(`   Last modified: ${new Date(file.lastModified).toISOString()}`)

  // For Safari iOS, HEIC/HEIF MUST be converted - they may not be supported
  const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif')
  
  if (isHEIC) {
    console.log('📱 Detected HEIC/HEIF file - will convert to JPEG')
    // Convert HEIC to JPEG via canvas
    return await convertImageToJPEG(file)
  }

  // If it's already a standard supported type, return as-is
  const standardTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (standardTypes.includes(file.type)) {
    console.log(`✅ File type is standard: ${file.type}`)
    return file
  }

  // If type is empty, detect from extension
  const fileName = file.name.toLowerCase()
  if (!file.type) {
    console.warn(`⚠️ CRITICAL: Empty MIME type - detecting from extension`)
    
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      console.log('   → Detected JPEG extension')
      return new File([file], file.name, { type: 'image/jpeg', lastModified: file.lastModified })
    } else if (fileName.endsWith('.png')) {
      console.log('   → Detected PNG extension')
      return new File([file], file.name, { type: 'image/png', lastModified: file.lastModified })
    } else if (fileName.endsWith('.webp')) {
      console.log('   → Detected WebP extension')
      return new File([file], file.name, { type: 'image/webp', lastModified: file.lastModified })
    } else {
      console.log('   → Unknown extension, defaulting to JPEG')
      return new File([file], file.name, { type: 'image/jpeg', lastModified: file.lastModified })
    }
  }

  // If type is something unexpected, convert to JPEG
  if (file.type.startsWith('image/')) {
    console.warn(`⚠️ Uncommon type: ${file.type}, converting to JPEG`)
    return await convertImageToJPEG(file)
  }

  console.log(`✅ File validation complete`)
  return file
}

/**
 * Convert image to JPEG format via canvas
 */
async function convertImageToJPEG(file: File): Promise<File> {
  console.log(`🔄 Converting to JPEG: ${file.name}`)
  
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = (event: any) => {
        try {
          const img = new Image()
          img.src = event.target.result
          
          img.onerror = () => {
            console.warn('⚠️ Conversion failed, keeping original')
            resolve(file)
          }
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              
              if (!ctx) {
                console.warn('⚠️ No canvas context, keeping original')
                resolve(file)
                return
              }
              
              canvas.width = img.width
              canvas.height = img.height
              
              // White background for proper JPEG rendering
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0)
              
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    console.warn('⚠️ toBlob failed, keeping original')
                    resolve(file)
                    return
                  }
                  
                  const jpegName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
                  const jpegFile = new File([blob], jpegName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  })
                  
                  console.log(`✅ Converted to JPEG: ${(blob.size / 1024).toFixed(2)}KB`)
                  resolve(jpegFile)
                },
                'image/jpeg',
                0.85
              )
            } catch (canvasError) {
              console.warn('⚠️ Canvas error, keeping original:', canvasError)
              resolve(file)
            }
          }
        } catch (imageError) {
          console.warn('⚠️ Image creation failed, keeping original:', imageError)
          resolve(file)
        }
      }
      
      reader.onerror = () => {
        console.warn('⚠️ FileReader failed, keeping original')
        resolve(file)
      }
    } catch (error) {
      console.warn('⚠️ Unexpected error in conversion:', error)
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
