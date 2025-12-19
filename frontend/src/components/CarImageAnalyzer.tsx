import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AIAnalysisResult {
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  series?: string;
  castingId?: string;
  vehicleType?: string;
  confidence: number;
}

interface Match {
  car_name: string;
  casting_id: string;
  year: number;
  color: string;
  series: string;
  vehicle_type: string;
  brand: string;
  matchScore: number;
  matchConfidence: number;
}

interface CarImageAnalyzerProps {
  onSelectMatch: (match: any) => void;
  onAnalysisComplete?: (analysis: AIAnalysisResult) => void;
}

const CarImageAnalyzer: React.FC<CarImageAnalyzerProps> = ({ 
  onSelectMatch,
  onAnalysisComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      analyzeImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    setMatches([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/inventory/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          image: imageData,
          mimeType: imageData.match(/data:(image\/\w+);/)?.[1] || 'image/jpeg'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al analizar la imagen');
      }

      const result = await response.json();
      
      setAnalysis(result.data.analysis);
      setMatches(result.data.matches);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result.data.analysis);
      }

      if (result.data.matches.length === 0) {
        toast('No se encontraron coincidencias exactas', { icon: '🤔' });
      } else {
        toast.success(`Se encontraron ${result.data.matches.length} coincidencias`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectMatch = (match: Match) => {
    onSelectMatch(match);
    toast.success('Datos cargados del catálogo');
    setIsOpen(false);
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setMatches([]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Camera size={20} />
        Identificar con IA
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">🤖 Identificar Hot Wheels con IA</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          {!image && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  Sube una foto del Hot Wheels
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Para mejores resultados, toma fotos claras de:
                </p>
                <ul className="text-sm text-gray-600 mb-6 text-left max-w-md mx-auto">
                  <li>• La base del auto (contiene el casting ID)</li>
                  <li>• El empaque completo (si está en caja)</li>
                  <li>• El auto desde varios ángulos</li>
                </ul>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Seleccionar Imagen
                </button>
              </div>
            </div>
          )}

          {/* Image Preview & Analysis */}
          {image && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <img
                  src={image}
                  alt="Preview"
                  className="w-64 h-64 object-contain border rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Análisis de IA</h3>
                  
                  {analyzing && (
                    <div className="flex items-center gap-2 text-purple-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      <span>Analizando imagen con Gemini...</span>
                    </div>
                  )}

                  {analysis && !analyzing && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Análisis completado</span>
                      </div>
                      {analysis.model && (
                        <p><strong>Modelo:</strong> {analysis.model}</p>
                      )}
                      {analysis.brand && (
                        <p><strong>Marca:</strong> {analysis.brand}</p>
                      )}
                      {analysis.year && (
                        <p><strong>Año:</strong> {analysis.year}</p>
                      )}
                      {analysis.color && (
                        <p><strong>Color:</strong> {analysis.color}</p>
                      )}
                      {analysis.series && (
                        <p><strong>Serie:</strong> {analysis.series}</p>
                      )}
                      {analysis.castingId && (
                        <p><strong>Casting ID:</strong> {analysis.castingId}</p>
                      )}
                      <p className="text-gray-600">
                        <strong>Confianza:</strong> {(analysis.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}

                  <button
                    onClick={reset}
                    className="mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Subir otra imagen
                  </button>
                </div>
              </div>

              {/* Matches */}
              {matches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    Coincidencias encontradas ({matches.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {matches.map((match, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleSelectMatch(match)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{match.car_name}</h4>
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                              <p><strong>Casting:</strong> {match.casting_id}</p>
                              <p><strong>Año:</strong> {match.year}</p>
                              <p><strong>Color:</strong> {match.color}</p>
                              <p><strong>Serie:</strong> {match.series}</p>
                              <p><strong>Tipo:</strong> {match.vehicle_type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-purple-600">
                              {(match.matchConfidence * 100).toFixed(0)}% match
                            </div>
                            <button
                              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                            >
                              Usar este
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis && matches.length === 0 && !analyzing && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        No se encontraron coincidencias en el catálogo
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Puedes ingresar los datos manualmente usando la información detectada arriba.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarImageAnalyzer;
