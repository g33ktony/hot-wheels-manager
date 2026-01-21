import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { ApiResponse } from '@shared/types'
import fs from 'fs'
import path from 'path'

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

    // Buscar solo por model si hay search term
    if (search && search !== '') {
      const searchLower = (search as string).toLowerCase()
      filtered = allCars.filter((car: any) =>
        car.model.toLowerCase().includes(searchLower)
      )
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

    // Validar que sea una URL de Wikia
    if (!url.includes('static.wikia.nocookie.net')) {
      return res.status(403).json({
        success: false,
        error: 'Solo URLs de Wikia permitidas'
      })
    }

    const axios = require('axios')
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    })

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(response.data)
  } catch (error: any) {
    console.error('Error proxying image:', error.message)
    res.status(500).json({
      success: false,
      error: 'Error al cargar imagen'
    })
  }
}
