import { TrendingUp } from 'lucide-react'

export default function PreSaleReports() {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-green-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">
                    Reportes de Rentabilidad
                </h2>
            </div>
            <p className="text-gray-600">
                Análisis de profit y márgenes - En construcción (Fase 4)
            </p>
        </div>
    )
}
