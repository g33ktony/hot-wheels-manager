import { useEffect, useState } from 'react'
import Button from '@/components/common/Button'

export default function CloudinaryDebug() {
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  useEffect(() => {
    console.log('Cloudinary Debug Info:', {
      cloudName,
      uploadPreset,
      allEnv: import.meta.env
    })
  }, [cloudName, uploadPreset])

  const testUpload = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Create a simple test image
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 100, 100)
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg')
      })

      const testFile = new File([blob], 'test.jpg', { type: 'image/jpeg' })
      
      console.log('Testing upload with:', {
        cloudName,
        uploadPreset,
        file: testFile,
        fileSize: testFile.size,
        fileType: testFile.type
      })

      const formData = new FormData()
      formData.append('file', testFile)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'test')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()
      console.log('Response:', { status: response.status, data })
      
      if (!response.ok) {
        setError(`Upload failed: ${response.status} - ${data.error?.message || JSON.stringify(data)}`)
      } else {
        setUploadResult(data)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Cloudinary Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Environment Variables:</h2>
        <pre className="bg-white p-2 rounded text-sm overflow-auto">
{JSON.stringify({ cloudName, uploadPreset }, null, 2)}
        </pre>
      </div>

      <Button onClick={testUpload} disabled={loading}>
        {loading ? 'Testing...' : 'Test Cloudinary Upload'}
      </Button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          <h3 className="font-bold">Error:</h3>
          <pre className="bg-white p-2 rounded text-sm overflow-auto mt-2">{error}</pre>
        </div>
      )}

      {uploadResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
          <h3 className="font-bold">Success!</h3>
          <pre className="bg-white p-2 rounded text-sm overflow-auto mt-2">
{JSON.stringify(uploadResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
