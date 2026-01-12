import { Request, Response } from 'express';
import { analyzeHotWheelsImage, searchInDatabase } from '../services/geminiService';
import fs from 'fs';
import path from 'path';

// Cargar la base de datos de Hot Wheels
let hotWheelsDatabase: any[] = [];
try {
  const dbPath = path.join(__dirname, '../../data/hotwheels_database.json');
  const dbContent = fs.readFileSync(dbPath, 'utf-8');
  hotWheelsDatabase = JSON.parse(dbContent);
  console.log(`✅ Hot Wheels database loaded: ${hotWheelsDatabase.length} items`);
} catch (error) {
  console.error('❌ Error loading Hot Wheels database:', error);
}

/**
 * POST /api/inventory/analyze-image
 * Analiza una imagen de Hot Wheels y busca coincidencias en la base de datos
 */
export const analyzeImage = async (req: Request, res: Response) => {
  try {
    console.log('📸 Received analyze-image request');
    console.log('📦 Request body keys:', Object.keys(req.body));
    
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      console.log('❌ No image provided');
      return res.status(400).json({
        success: false,
        message: 'Imagen requerida'
      });
    }

    // La imagen debe venir en base64 (sin el prefijo data:image/...)
    const imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    console.log('✅ Image size:', imageBase64.length, 'chars');

    console.log('🔍 Iniciando análisis de imagen...');

    // Analizar la imagen con Gemini
    const analysis = await analyzeHotWheelsImage(imageBase64, mimeType);

    console.log('📊 Análisis completado:', analysis);

    // Buscar coincidencias en la base de datos
    const matches = searchInDatabase(analysis, hotWheelsDatabase, 10);

    console.log(`🎯 Encontradas ${matches.length} coincidencias`);

    res.json({
      success: true,
      data: {
        analysis,
        matches,
        totalMatches: matches.length
      },
      message: 'Análisis completado exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error analyzing image:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    
    // Manejar errores específicos de Gemini
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Servicio de análisis de imágenes no disponible. Contacta al administrador.'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error al analizar la imagen',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
