import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { CustomThemeConfig } from '@/config/theme.config'
import { RotateCcw, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ThemeSettings() {
  const { customTheme, updateCustomTheme, resetToDefault, mode } = useTheme()
  const [colors, setColors] = useState<CustomThemeConfig>(customTheme)
  const [hasChanges, setHasChanges] = useState(false)

  const handleColorChange = (key: keyof CustomThemeConfig, value: string) => {
    setColors(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateCustomTheme(colors)
    setHasChanges(false)
    toast.success('Colores guardados correctamente')
  }

  const handleReset = () => {
    resetToDefault()
    setColors(customTheme)
    setHasChanges(false)
    toast.success('Colores restaurados a los valores por defecto')
  }

  const handleCancel = () => {
    setColors(customTheme)
    setHasChanges(false)
  }

  const colorGroups = [
    {
      name: 'Colores de Texto',
      colors: [
        { key: 'textPrimary', label: 'Texto Principal' },
        { key: 'textSecondary', label: 'Texto Secundario' },
        { key: 'textTertiary', label: 'Texto Terciario' },
        { key: 'textMuted', label: 'Texto Silenciado' },
        { key: 'textDanger', label: 'Texto Peligro' },
        { key: 'textSuccess', label: 'Texto Éxito' },
        { key: 'textWarning', label: 'Texto Advertencia' },
        { key: 'textInfo', label: 'Texto Información' },
      ]
    },
    {
      name: 'Colores de Bordes',
      colors: [
        { key: 'borderPrimary', label: 'Borde Principal' },
        { key: 'borderSecondary', label: 'Borde Secundario' },
        { key: 'borderInput', label: 'Borde Input' },
      ]
    },
    {
      name: 'Colores Acentuados',
      colors: [
        { key: 'accentEmerald', label: 'Acento Esmeralda' },
        { key: 'accentBlue', label: 'Acento Azul' },
        { key: 'accentRed', label: 'Acento Rojo' },
        { key: 'accentGreen', label: 'Acento Verde' },
        { key: 'accentOrange', label: 'Acento Naranja' },
        { key: 'accentPurple', label: 'Acento Púrpura' },
      ]
    }
  ]

  return (
    <div className={`min-h-screen p-6 ${mode === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className={`max-w-6xl mx-auto p-6 rounded-lg ${mode === 'dark' ? 'bg-slate-800' : 'bg-white'} ${mode === 'dark' ? 'border-slate-700' : 'border-gray-200'} border`}>
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ⚙️ Configuración de Tema
          </h1>
          <p className={`${mode === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Personaliza los colores de tu aplicación. Los cambios se aplican inmediatamente.
          </p>
        </div>

        <div className="space-y-8">
          {colorGroups.map((group) => (
            <div key={group.name}>
              <h2 className={`text-xl font-semibold mb-4 ${mode === 'dark' ? 'text-slate-300' : 'text-gray-800'}`}>
                {group.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.colors.map((item) => (
                  <div key={item.key} className={`p-4 rounded-lg ${mode === 'dark' ? 'bg-slate-700' : 'bg-gray-50'} border ${mode === 'dark' ? 'border-slate-600' : 'border-gray-200'}`}>
                    <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {item.label}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={colors[item.key as keyof CustomThemeConfig]}
                        onChange={(e) => handleColorChange(item.key as keyof CustomThemeConfig, e.target.value)}
                        className={`h-10 w-20 rounded cursor-pointer border ${mode === 'dark' ? 'border-slate-500' : 'border-gray-300'}`}
                      />
                      <input
                        type="text"
                        value={colors[item.key as keyof CustomThemeConfig]}
                        onChange={(e) => handleColorChange(item.key as keyof CustomThemeConfig, e.target.value)}
                        className={`flex-1 px-3 py-2 rounded text-sm border ${mode === 'dark' ? 'bg-slate-800 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="#000000"
                      />
                    </div>
                    <div
                      className="mt-2 h-8 rounded border"
                      style={{ backgroundColor: colors[item.key as keyof CustomThemeConfig] }}
                      title="Vista previa del color"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-8 p-4 rounded-lg ${mode === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
          <p className={`text-sm ${mode === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
            💡 <strong>Consejo:</strong> Los cambios se guardan automáticamente en tu navegador. El fondo de la aplicación seguirá siendo blanco (light) o gris oscuro (dark) según el modo seleccionado.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? mode === 'dark'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : mode === 'dark'
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check size={18} />
            Guardar Cambios
          </button>

          <button
            onClick={handleCancel}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? mode === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : mode === 'dark'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <X size={18} />
            Cancelar
          </button>

          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ml-auto ${
              mode === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <RotateCcw size={18} />
            Restaurar Valores por Defecto
          </button>
        </div>
      </div>
    </div>
  )
}
