import { Schema, model, Document } from 'mongoose'
import { HotWheelsCar } from '@shared/types'

export interface IHotWheelsCar extends Document {
  toy_num: string;
  col_num: string;
  carModel: string;
  series: string;
  series_num: string;
  photo_url?: string;
  year: string;
  color?: string;
  tampo?: string;
  wheel_type?: string;
  car_make?: string;
  segment?: string;
  country?: string;
}

const hotWheelsCarSchema = new Schema<IHotWheelsCar>({
  toy_num: { type: String, required: true, unique: true },
  col_num: { type: String, required: true },
  carModel: { type: String, required: true },
  series: { type: String, required: true },
  series_num: { type: String, required: true },
  photo_url: { type: String },
  year: { type: String, required: true },
  // Campos opcionales adicionales
  color: { type: String },
  tampo: { type: String },
  wheel_type: { type: String },
  car_make: { type: String },
  segment: { type: String },
  country: { type: String },
}, {
  timestamps: true,
})

// Índices para mejorar las búsquedas
hotWheelsCarSchema.index({ carModel: 'text', series: 'text', car_make: 'text' })
hotWheelsCarSchema.index({ series: 1 })
hotWheelsCarSchema.index({ year: 1 })
// toy_num ya tiene unique: true, no necesita índice adicional
hotWheelsCarSchema.index({ col_num: 1 })

export const HotWheelsCarModel = model<IHotWheelsCar>('HotWheelsCar', hotWheelsCarSchema)
