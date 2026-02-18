import { Schema, model, Document } from 'mongoose'

export interface IStoreSettings extends Document {
  storeName: string
  logo?: string
  description?: string
  customMessages: {
    welcome?: string
    closing?: string
    invoice?: string
    delivery?: string
    custom: string[]
  }
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  publicCatalog?: {
    showCustomInventory?: boolean  // Control para mostrar/ocultar inventario personalizado en búsqueda pública
  }
  storeId: string
  createdAt: Date
  updatedAt: Date
}

const storeSettingsSchema = new Schema<IStoreSettings>({
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  customMessages: {
    welcome: {
      type: String,
      default: '¡Bienvenido a nuestra tienda!'
    },
    closing: {
      type: String,
      default: '¡Gracias por su compra!'
    },
    invoice: {
      type: String,
      default: 'Factura de Venta'
    },
    delivery: {
      type: String,
      default: 'Entrega'
    },
    custom: [{
      type: String
    }]
  },
  colors: {
    primary: {
      type: String,
      default: '#10b981'
    },
    secondary: {
      type: String,
      default: '#3b82f6'
    },
    accent: {
      type: String,
      default: '#f59e0b'
    }
  },
  contact: {
    phone: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    address: {
      type: String,
      default: null
    }
  },
  publicCatalog: {
    showCustomInventory: {
      type: Boolean,
      default: false  // Por defecto, NO mostrar inventario personalizado en búsqueda pública
    }
  },
  // Multi-tenancy field
  storeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
}, {
  timestamps: true
})

// Índices para garantizar que solo exista una configuración por tienda
storeSettingsSchema.index({ _id: 1 }, { unique: true })
storeSettingsSchema.index({ storeId: 1 }, { unique: true })

export const StoreSettingsModel = model<IStoreSettings>('StoreSettings', storeSettingsSchema)
