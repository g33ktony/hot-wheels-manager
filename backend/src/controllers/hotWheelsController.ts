import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { ApiResponse } from '@shared/types'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

/**
 * Función para calcular similitud entre dos strings usando bigramas
 * Útil para búsquedas fuzzy que permiten encontrar coincidencias parciales
 * Ejemplo: "br32" vs "RB32" tendrá una similitud alta
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  // Si una string contiene a la otra, alta similitud
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85
  }
  
  // Calcular caracteres en común
  const chars1 = new Set(s1.split(''))
  const chars2 = new Set(s2.split(''))
  const intersection = new Set([...chars1].filter(x => chars2.has(x)))
  
  // Calcular similitud básica por caracteres comunes
  const charSimilarity = (intersection.size * 2) / (chars1.size + chars2.size)
  
  // Calcular similitud por secuencias (n-gramas de 2 caracteres)
  const bigrams1 = []
  const bigrams2 = []
  
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.push(s1.substring(i, i + 2))
  }
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.push(s2.substring(i, i + 2))
  }
  
  if (bigrams1.length === 0 || bigrams2.length === 0) {
    return charSimilarity
  }
  
  const bigramSet1 = new Set(bigrams1)
  const bigramSet2 = new Set(bigrams2)
  const bigramIntersection = new Set([...bigramSet1].filter(x => bigramSet2.has(x)))
  const bigramSimilarity = (bigramIntersection.size * 2) / (bigramSet1.size + bigramSet2.size)
  
  // Combinar ambas métricas (dar más peso a la similitud de secuencias)
  return (charSimilarity * 0.3 + bigramSimilarity * 0.7)
}

// Función para buscar con fuzzy matching en todos los campos
const fuzzyMatch = (car: any, searchTerm: string, threshold = 0.45): { match: boolean; score: number } => {
  const searchLower = searchTerm.toLowerCase().trim()
  
  // Campos a buscar
  const fields = [
    String(car.model || ''),
    String(car.series || ''),
    String(car.year || ''),
    String(car.toy_num || ''),
    String(car.col_num || ''),
    String(car.series_num || '')
  ]
  
  let maxScore = 0
  
  for (const field of fields) {
    const fieldLower = field.toLowerCase()
    
    // Coincidencia exacta = máxima puntuación
    if (fieldLower === searchLower) {
      return { match: true, score: 1.0 }
    }
    
    // Contiene el término = alta puntuación
    if (fieldLower.includes(searchLower)) {
      maxScore = Math.max(maxScore, 0.9)
      continue
    }
    
    // Calcular similitud
    const similarity = calculateSimilarity(fieldLower, searchLower)
    maxScore = Math.max(maxScore, similarity)
  }
  
  return {
    match: maxScore >= threshold,
    score: maxScore
  }
}

// Buscar en el archivo JSON directamente
export const searchHotWheelsJSON = async (req: Request, res: Response) => {
  try {
    const { search = '', limit = 100, page = 1 } = req.query
    const dbPath = path.join(__dirname, '../../data/hotwheels_database.json')

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        success: false,
        error: 'Base de datos no encontrada'
      })
    }

    const fileContent = fs.readFileSync(dbPath, 'utf-8')
    const allCars = JSON.parse(fileContent)

    let filtered = allCars

    // Buscar en todos los campos con fuzzy matching
    // Busca en: model, series, year, toy_num, col_num, series_num
    // Threshold: 0.45 (45% de similitud mínima para considerar una coincidencia)
    // Los resultados se ordenan por score de mayor a menor
    if (search && search !== '') {
      const searchResults = allCars
        .map((car: any) => {
          const { match, score } = fuzzyMatch(car, search as string)
          return { car, match, score }
        })
        .filter((result: any) => result.match)
        .sort((a: any, b: any) => b.score - a.score) // Ordenar por mejor coincidencia
        .map((result: any) => result.car)
      
      filtered = searchResults
    }

    // Aplicar paginación
    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 100
    const skip = (pageNum - 1) * limitNum
    const paginatedCars = filtered.slice(skip, skip + limitNum)

    const response: ApiResponse<{
      cars: any[]
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
    }> = {
      success: true,
      data: {
        cars: paginatedCars,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filtered.length,
          pages: Math.ceil(filtered.length / limitNum)
        }
      }
    }

    res.json(response)
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export const getHotWheelsCars = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, series, year } = req.query
    
    let query: any = {}
    
    // Búsqueda por texto
    if (search) {
      query.$or = [
        { model: { $regex: search, $options: 'i' } },
        { series: { $regex: search, $options: 'i' } },
        { toy_num: { $regex: search, $options: 'i' } },
        { col_num: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Filtro por series
    if (series) {
      query.series = { $regex: series, $options: 'i' }
    }
    
    // Filtro por año
    if (year) {
      query.year = year
    }
    
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum
    
    const [cars, total] = await Promise.all([
      HotWheelsCarModel.find(query)
        .sort({ year: -1, col_num: 1 })
        .skip(skip)
        .limit(limitNum),
      HotWheelsCarModel.countDocuments(query)
    ])
    
    const response: ApiResponse<{
      cars: typeof cars;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      }
    }> = {
      success: true,
      data: {
        cars,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    }
    
    res.status(200).json(response)
  } catch (error: any) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
    }
    res.status(500).json(errorResponse)
  }
}

export const getHotWheelsCar = async (req: Request, res: Response) => {
  try {
    const { toy_num } = req.params
    const car = await HotWheelsCarModel.findOne({ toy_num })
    
    if (!car) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Car not found',
      }
      return res.status(404).json(response)
    }
    
    const response: ApiResponse<typeof car> = {
      success: true,
      data: car,
    }
    
    res.status(200).json(response)
  } catch (error: any) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
    }
    res.status(500).json(errorResponse)
  }
}

export const getSeries = async (req: Request, res: Response) => {
  try {
    const series = await HotWheelsCarModel.distinct('series')
    
    const response: ApiResponse<string[]> = {
      success: true,
      data: series.sort(),
    }
    
    res.status(200).json(response)
  } catch (error: any) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
    }
    res.status(500).json(errorResponse)
  }
}

export const getYears = async (req: Request, res: Response) => {
  try {
    const years = await HotWheelsCarModel.distinct('year')
    
    const response: ApiResponse<string[]> = {
      success: true,
      data: years.sort().reverse(),
    }
    
    res.status(200).json(response)
  } catch (error: any) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
    }
    res.status(500).json(errorResponse)
  }
}

export const loadDatabase = async (req: Request, res: Response) => {
  try {
    const dataPath = path.join(__dirname, '../../data/hotwheels_database.json')
    
    if (!fs.existsSync(dataPath)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Database file not found',
      }
      return res.status(404).json(response)
    }
    
    // Verificar si ya hay datos en la base de datos
    const existingCount = await HotWheelsCarModel.countDocuments()
    if (existingCount > 0) {
      const response: ApiResponse<{ loaded: number; existing: number }> = {
        success: true,
        data: { loaded: 0, existing: existingCount },
        message: `Database already contains ${existingCount} cars. Use force=true to reload.`,
      }
      
      if (req.query.force !== 'true') {
        return res.status(200).json(response)
      }
      
      // Si force=true, eliminar datos existentes
      await HotWheelsCarModel.deleteMany({})
    }
    
    // Leer y cargar datos
    const jsonData = fs.readFileSync(dataPath, 'utf8')
    const carsData = JSON.parse(jsonData)
    
    let loadedCount = 0
    let errors = 0
    
    // Cargar datos en lotes para mejor rendimiento
    const batchSize = 100
    for (let i = 0; i < carsData.length; i += batchSize) {
      const batch = carsData.slice(i, i + batchSize)
      
      try {
        await HotWheelsCarModel.insertMany(batch, { ordered: false })
        loadedCount += batch.length
      } catch (error: any) {
        // Algunos documentos pueden fallar por duplicados
        if (error.code === 11000) {
          // Contar los que sí se insertaron
          const insertedCount = error.result?.insertedCount || 0
          loadedCount += insertedCount
          errors += batch.length - insertedCount
        } else {
          errors += batch.length
        }
      }
    }
    
    const response: ApiResponse<{ loaded: number; errors: number; total: number }> = {
      success: true,
      data: { 
        loaded: loadedCount, 
        errors, 
        total: carsData.length 
      },
      message: `Successfully loaded ${loadedCount} cars from ${carsData.length} total records`,
    }
    
    res.status(200).json(response)
  } catch (error: any) {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error.message,
    }
    res.status(500).json(errorResponse)
  }
}

export const downloadDatabase = async (req: Request, res: Response) => {
  try {
    const dbPath = path.join(__dirname, '../../data/hotwheels_database.json')
    
    // Verificar que el archivo existe
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        success: false,
        error: 'Base de datos no encontrada'
      })
    }
    
    // Leer el archivo
    const fileContent = fs.readFileSync(dbPath, 'utf-8')
    
    // Enviar como descarga
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="hotwheels_database_${new Date().toISOString().split('T')[0]}.json"`)
    res.send(fileContent)
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export const proxyImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.query
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      })
    }

    // Validar que sea una URL de Wikia, Fandom o CDN
    if (!url.includes('wikia') && !url.includes('fandom') && !url.includes('vcdn') && !url.includes('static.')) {
      return res.status(403).json({
        success: false,
        error: 'Solo URLs de Wikia/Fandom permitidas'
      })
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://hotwheels.fandom.com/',
        'Accept': 'image/*,*/*',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Allow 3xx, 4xx to be handled
    })

    // Check if response is valid
    if (response.status >= 400) {
      console.warn(`Image fetch returned ${response.status} for URL: ${url}`)
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch image: ${response.status}`
      })
    }

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=604800') // Cache for 1 week
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(response.data)
  } catch (error: any) {
    console.error('Error proxying image:', {
      message: error.message,
      code: error.code,
      url: req.query.url
    })
    res.status(500).json({
      success: false,
      error: 'Error al cargar imagen desde Fandom'
    })
  }
}
