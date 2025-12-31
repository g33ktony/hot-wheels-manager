/**
 * Cloudinary Service
 * 
 * Handles image uploads directly to Cloudinary from the frontend
 * Replaces base64 storage in MongoDB with CDN URLs
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes: number
  created_at: string
}

/**
 * Upload an image file to Cloudinary
 * @param file - The image file to upload (can be File or Blob)
 * @param folder - Optional folder name in Cloudinary (default: 'hot-wheels-manager/inventory')
 * @returns Promise with the Cloudinary URL
 */
export async function uploadImageToCloudinary(
  file: File | Blob,
  folder: string = 'hot-wheels-manager/inventory'
): Promise<string> {
  // Validate configuration
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env')
  }

  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', folder)

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloudinary upload error:', errorText)
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data: CloudinaryUploadResponse = await response.json()
    
    console.log('✅ Image uploaded to Cloudinary:', {
      url: data.secure_url,
      size: `${(data.bytes / 1024).toFixed(0)}KB`,
      dimensions: `${data.width}x${data.height}`
    })

    return data.secure_url
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error)
    throw error
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of image files to upload
 * @param folder - Optional folder name in Cloudinary
 * @param onProgress - Optional callback for progress updates (current, total)
 * @returns Promise with array of Cloudinary URLs
 */
export async function uploadMultipleImagesToCloudinary(
  files: File[] | Blob[],
  folder: string = 'hot-wheels-manager/inventory',
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = []
  
  for (let i = 0; i < files.length; i++) {
    try {
      const url = await uploadImageToCloudinary(files[i], folder)
      urls.push(url)
      
      if (onProgress) {
        onProgress(i + 1, files.length)
      }
    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error)
      // Continue with other uploads even if one fails
    }
  }
  
  return urls
}

/**
 * Check if a string is a Cloudinary URL
 * @param url - The string to check
 * @returns true if it's a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.startsWith('http://res.cloudinary.com/') || 
         url.startsWith('https://res.cloudinary.com/')
}

/**
 * Check if a string is a base64 image
 * @param str - The string to check
 * @returns true if it's a base64 image
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/') || str.includes('base64')
}

/**
 * Get configuration status
 * @returns Object with configuration status
 */
export function getCloudinaryConfig() {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    isConfigured: !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET)
  }
}
