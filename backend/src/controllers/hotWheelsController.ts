import { Request, Response } from 'express'
import { HotWheelsCarModel } from '../models/HotWheelsCar'
import { ApiResponse } from '@shared/types'
import fs from 'fs'
import path from 'path'

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
