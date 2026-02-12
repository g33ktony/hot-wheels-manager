import { Schema, model, Document } from 'mongoose'
import { HotWheelsCar } from '@shared/types'

export interface IHotWheelsCar extends Document {
  toy_num: string;
  col_num: string;
  carModel: string;
  series: string;
  series_num: string;
  sub_series?: string;
  photo_url?: string;
  photo_url_carded?: string;
  year: string;
  color?: string;
  tampo?: string;
  wheel_type?: string;
  car_make?: string;
  segment?: string;
  country?: string;
  pack_contents?: Array<{
    casting_name: string;
    body_color?: string;
    tampo?: string;
    wheel_type?: string;
    notes?: string;
    photo_url?: string;
    photo_url_carded?: string;
  }>;
}

const hotWheelsCarSchema = new Schema<IHotWheelsCar>({
  toy_num: { type: String, default: '' },
  col_num: { type: String, default: '' },
  carModel: { type: String, required: true },
  series: { type: String, default: '' },
  series_num: { type: String, default: '' },
  sub_series: { type: String, default: '' },
  photo_url: { type: String },
  photo_url_carded: { type: String },
  year: { type: String, default: '' },
  // Campos opcionales adicionales
  color: { type: String },
  tampo: { type: String },
  wheel_type: { type: String },
  car_make: { type: String },
  segment: { type: String },
  country: { type: String },
  // Contenido del pack (para multi-packs)
  pack_contents: {
    type: [{
      casting_name: { type: String },
      body_color: { type: String },
      tampo: { type: String },
      wheel_type: { type: String },
      notes: { type: String },
      photo_url: { type: String }
    }],
    default: undefined
  }
}, {
  timestamps: true,
})

// Índices para mejorar las búsquedas
hotWheelsCarSchema.index({ carModel: 'text', series: 'text', car_make: 'text' })
hotWheelsCarSchema.index({ series: 1 })
hotWheelsCarSchema.index({ year: 1 })
// toy_num ya tiene unique: true, no necesita índice adicional
hotWheelsCarSchema.index({ col_num: 1 })
// Partial unique on toy_num: unique when non-empty, allows multiple empty/null
hotWheelsCarSchema.index({ toy_num: 1 }, { unique: true, partialFilterExpression: { toy_num: { $type: 'string', $gt: '' } } })
// Compound index for cars without toy_num (dedup by name+year+series)
hotWheelsCarSchema.index({ carModel: 1, year: 1, series: 1 })

export const HotWheelsCarModel = model<IHotWheelsCar>('HotWheelsCar', hotWheelsCarSchema)
