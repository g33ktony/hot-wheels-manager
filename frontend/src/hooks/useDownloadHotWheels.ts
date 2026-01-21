import api from '@/services/api'

export const useDownloadHotWheelsDatabase = () => {
  const download = async () => {
    try {
      const response = await api.get('/hotwheels/download', {
        responseType: 'blob'
      })

      // Crear un blob URL y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `hotwheels_database_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      throw new Error(error.message || 'Error al descargar la base de datos')
    }
  }

  return { download }
}
