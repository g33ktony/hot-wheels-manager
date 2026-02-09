import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { StoreSettingsModal } from '@/components/StoreSettingsModal'
import { useNavigate } from 'react-router-dom'

export default function StoreSettings() {
    const { mode } = useTheme()
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(true)

    const handleCloseModal = () => {
        setIsModalOpen(false)
        // Regresar al dashboard después de cerrar el modal
        navigate('/dashboard')
    }

    return (
        <div className={`min-h-screen ${mode === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
            {/* El modal se abre automáticamente al cargar la página */}
            <StoreSettingsModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={() => {
                    // Opcional: hacer algo después de guardar
                }}
            />
        </div>
    )
}
