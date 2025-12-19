import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY no está configurado. El análisis de imágenes no estará disponible.');
} else {
  console.log('✅ GEMINI_API_KEY configurado correctamente - modelo gemini-1.5-flash');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface CarAnalysisResult {
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  series?: string;
  castingId?: string;
  vehicleType?: string;
  confidence: number;
  rawText: string;
}

/**
 * Analiza una imagen de Hot Wheels usando Gemini Vision
 * @param imageBase64 Imagen en formato base64
 * @param mimeType Tipo MIME de la imagen (image/jpeg, image/png, etc.)
 * @returns Información extraída del Hot Wheels
 */
export async function analyzeHotWheelsImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<CarAnalysisResult> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurado');
    }

    // Usar Gemini 1.5 Pro - disponible en free tier v1beta
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `Analiza esta imagen de un Hot Wheels o auto de colección y extrae la siguiente información:

1. **Marca**: (Hot Wheels, Matchbox, etc.)
2. **Modelo/Nombre**: El nombre del vehículo específico
3. **Año**: Si es visible en el empaque o base
4. **Color principal**: Color dominante del auto
5. **Serie**: Si menciona alguna serie o colección
6. **Casting ID**: Si hay un número de casting visible en la base
7. **Tipo de vehículo**: (deportivo, camión, policía, etc.)

Por favor lee cuidadosamente cualquier texto visible en:
- El empaque (si está en caja)
- La base del auto
- Los costados del auto

Responde SOLO en formato JSON válido, sin markdown ni explicaciones adicionales:
{
  "brand": "marca",
  "model": "nombre del modelo",
  "year": año_numérico,
  "color": "color",
  "series": "nombre de la serie",
  "castingId": "ID si es visible",
  "vehicleType": "tipo",
  "confidence": 0.0-1.0
}

Si algún campo no es visible o no estás seguro, usa null.`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    };

    console.log('🔍 Analizando imagen con Gemini Flash...');
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Respuesta de Gemini:', text);

    // Intentar parsear la respuesta JSON
    try {
      // Limpiar markdown si existe
      const jsonText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(jsonText);
      
      return {
        brand: parsed.brand || undefined,
        model: parsed.model || undefined,
        year: parsed.year ? parseInt(parsed.year) : undefined,
        color: parsed.color || undefined,
        series: parsed.series || undefined,
        castingId: parsed.castingId || undefined,
        vehicleType: parsed.vehicleType || undefined,
        confidence: parsed.confidence || 0.7,
        rawText: text
      };
    } catch (parseError) {
      console.error('Error parseando JSON de Gemini:', parseError);
      
      // Retornar el texto raw si no se puede parsear
      return {
        confidence: 0.5,
        rawText: text
      };
    }
  } catch (error) {
    console.error('Error en análisis de imagen con Gemini:', error);
    throw error;
  }
}

/**
 * Busca coincidencias en la base de datos de Hot Wheels
 * @param analysis Resultado del análisis de Gemini
 * @param hotWheelsDatabase Base de datos completa
 * @param limit Número máximo de resultados
 * @returns Array de coincidencias ordenadas por relevancia
 */
export function searchInDatabase(
  analysis: CarAnalysisResult,
  hotWheelsDatabase: any[],
  limit: number = 5
): any[] {
  const matches: Array<{ car: any; score: number }> = [];

  for (const car of hotWheelsDatabase) {
    let score = 0;

    // Matching por nombre/modelo (más peso)
    if (analysis.model && car.car_name) {
      const modelLower = analysis.model.toLowerCase();
      const carNameLower = car.car_name.toLowerCase();
      
      if (carNameLower.includes(modelLower) || modelLower.includes(carNameLower)) {
        score += 50;
      }
    }

    // Matching por casting ID (muy importante)
    if (analysis.castingId && car.casting_id) {
      if (car.casting_id.toLowerCase() === analysis.castingId.toLowerCase()) {
        score += 100; // Match perfecto
      }
    }

    // Matching por año
    if (analysis.year && car.year) {
      if (car.year === analysis.year) {
        score += 20;
      } else if (Math.abs(car.year - analysis.year) <= 2) {
        score += 10; // Año cercano
      }
    }

    // Matching por color
    if (analysis.color && car.color) {
      const colorLower = analysis.color.toLowerCase();
      const carColorLower = car.color.toLowerCase();
      
      if (carColorLower.includes(colorLower) || colorLower.includes(carColorLower)) {
        score += 15;
      }
    }

    // Matching por serie
    if (analysis.series && car.series) {
      const seriesLower = analysis.series.toLowerCase();
      const carSeriesLower = car.series.toLowerCase();
      
      if (carSeriesLower.includes(seriesLower) || seriesLower.includes(carSeriesLower)) {
        score += 25;
      }
    }

    // Matching por tipo de vehículo
    if (analysis.vehicleType && car.vehicle_type) {
      const typeLower = analysis.vehicleType.toLowerCase();
      const carTypeLower = car.vehicle_type.toLowerCase();
      
      if (carTypeLower.includes(typeLower) || typeLower.includes(carTypeLower)) {
        score += 10;
      }
    }

    // Solo incluir si tiene al menos algún match
    if (score > 0) {
      matches.push({ car, score });
    }
  }

  // Ordenar por score y retornar top N
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(m => ({
      ...m.car,
      matchScore: m.score,
      matchConfidence: (m.score / 200) * analysis.confidence // Score normalizado
    }));
}
