import React from 'react';
import CarImageAnalyzer from '../components/CarImageAnalyzer';

const GeminiTest: React.FC = () => {
  const handleSelectMatch = (match: any) => {
    console.log('🎯 Match seleccionado:', match);
    alert(`Seleccionaste: ${match.car_name}\nCasting ID: ${match.casting_id}`);
  };

  const handleAnalysisComplete = (analysis: any) => {
    console.log('🤖 Análisis completado:', analysis);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🤖 Prueba Gemini Vision AI</h1>
          <p className="text-slate-400">
            Sube una foto de un Hot Wheels para identificarlo automáticamente
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Cómo usar:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Haz clic en "Analizar con IA" abajo</li>
              <li>Sube una foto clara del Hot Wheels</li>
              <li>Espera el análisis de Gemini Flash</li>
              <li>Revisa los resultados y coincidencias</li>
              <li>Selecciona el match correcto si hay opciones</li>
            </ol>
          </div>

          <div className="border-t pt-6">
            <CarImageAnalyzer 
              onSelectMatch={handleSelectMatch}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Consejos:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>Toma fotos con buena iluminación</li>
              <li>Enfoca el carro completo</li>
              <li>Evita sombras o reflejos fuertes</li>
              <li>Muestra la base del carro si es posible</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Nota sobre API Key:</h3>
          <p className="text-yellow-800 text-sm">
            Asegúrate de tener configurada la variable de entorno <code className="bg-yellow-200 px-2 py-1 rounded">GEMINI_API_KEY</code> en Railway.
            Límite gratuito: 1,500 requests/día, 15/minuto.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeminiTest;
