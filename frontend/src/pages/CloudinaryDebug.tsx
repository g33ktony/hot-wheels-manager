import { useEffect, useState } from 'react'
import Button from '@/components/common/Button'

export default function CloudinaryDebug() {
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])
  }

  useEffect(() => {
    addLog(`Configuration loaded:`)
    addLog(`  Cloud Name: ${cloudName || '(not set)'}`)
    addLog(`  Upload Preset: ${uploadPreset || '(not set)'}`)
  }, [cloudName, uploadPreset])

  const testUploadWithTestImage = async () => {
    try {
      setLoading(true)
      setError('')
      setLogs([])
      setUploadResult(null)

      addLog('Creating test image...')
      // Create a simple test image
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#FF5733'
      ctx.fillRect(0, 0, 200, 200)
      ctx.fillStyle = 'white'
      ctx.font = '20px Arial'
      ctx.fillText('TEST', 70, 110)

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg')
      })

      const testFile = new File([blob], 'test.jpg', { type: 'image/jpeg' })

      addLog(`Test image created: ${testFile.size} bytes`)
      await performUpload(testFile)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const testUploadWithSelectedFile = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    try {
      setLoading(true)
      setError('')
      setLogs([])
      setUploadResult(null)

      addLog(`Uploading selected file: ${selectedFile.name}`)
      addLog(`  Size: ${(selectedFile.size / 1024).toFixed(2)} KB`)
      addLog(`  Type: ${selectedFile.type}`)

      await performUpload(selectedFile)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${errorMsg}`)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const performUpload = async (file: File) => {
    addLog('Building FormData...')
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('upload_preset', uploadPreset)

    addLog('Sending request to Cloudinary...')
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    addLog(`  URL: ${uploadUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      addLog(`Response received: ${response.status} ${response.statusText}`)

      const contentType = response.headers.get('content-type')
      addLog(`  Content-Type: ${contentType}`)

      let data: any
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        addLog(`  Response body (${text.length} chars): ${text.substring(0, 200)}`)
        try {
          data = JSON.parse(text)
        } catch {
          addLog('  (Response is not JSON)')
          data = null
        }
      }

      if (!response.ok) {
        addLog(`❌ Upload failed`)
        if (data?.error) {
          addLog(`  Error message: ${data.error.message}`)
        }
        setError(`Upload failed: ${response.status} - ${data?.error?.message || JSON.stringify(data)}`)
      } else {
        addLog(`✅ Upload successful!`)
        if (data?.secure_url) {
          addLog(`  URL: ${data.secure_url}`)
        }
        setUploadResult(data)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog(`❌ Network error: ${errorMsg}`)
      throw err
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Cloudinary Debug Console</h1>

      {/* Configuration */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
        <h2 className="font-bold text-blue-900 mb-3">Configuration:</h2>
        <div className="bg-white p-3 rounded text-sm font-mono">
          <div>Cloud Name: <strong>{cloudName || '❌ NOT SET'}</strong></div>
          <div>Upload Preset: <strong>{uploadPreset || '❌ NOT SET'}</strong></div>
        </div>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <h2 className="font-bold mb-3">Select File to Upload:</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setSelectedFile(file)
              addLog(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB, ${file.type})`)
            }
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Button
          onClick={testUploadWithTestImage}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '⏳ Testing...' : '🧪 Test with Generated Image'}
        </Button>
        <Button
          onClick={testUploadWithSelectedFile}
          disabled={loading || !selectedFile}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? '⏳ Uploading...' : '📤 Upload Selected File'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          <h3 className="font-bold text-lg mb-2">❌ Error:</h3>
          <pre className="bg-white p-3 rounded text-sm overflow-auto border border-red-100">{error}</pre>
        </div>
      )}

      {/* Logs */}
      <div className="mb-6">
        <h2 className="font-bold mb-3">📋 Logs:</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs overflow-auto max-h-64 border border-gray-700">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click a test button above.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">{log}</div>
            ))
          )}
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear logs
          </button>
        )}
      </div>

      {/* Success Result */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <h3 className="font-bold text-lg mb-2">✅ Upload Successful!</h3>
          <pre className="bg-white p-3 rounded text-sm overflow-auto border border-green-100">
            {JSON.stringify(uploadResult, null, 2)}
          </pre>
          {uploadResult?.secure_url && (
            <div className="mt-4">
              <img
                src={uploadResult.secure_url}
                alt="Uploaded"
                className="max-w-xs rounded border border-green-300"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
