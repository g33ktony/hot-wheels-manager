/**
 * Tipos para el sistema de enriquecimiento maestro de catálogos
 * Compartidos entre backend y frontend
 */

// Tipos de series para Hot Wheels
export type HWSeriesType = 
  | 'mainline'
  | 'sth' // Super Treasure Hunt
  | 'th' // Treasure Hunt
  | 'premium'
  | 'team-transport'
  | 'pop-culture'
  | 'f1'
  | 'boulevard'
  | 'the-hot-ones'
  | 'raceverse'
  | 'acceleracers'
  | 'chase-silver-series'
  | 'unknown';

// Marcas soportadas
export type Brand = 'Hot Wheels' | 'Mini GT' | 'Pop Race' | 'Kaido House' | 'Tomica';

// Grupos de colores normalizados
export type ColorGroup = 
  | 'Red'
  | 'Blue'
  | 'Green'
  | 'Yellow'
  | 'Orange'
  | 'Purple'
  | 'Pink'
  | 'Black'
  | 'White'
  | 'Silver'
  | 'Gold'
  | 'Brown'
  | 'Gray'
  | 'Multi'
  | 'Chrome'
  | 'Unknown';

// Variantes de color
export type ColorVariant = 'Metallic' | 'Pearl' | 'Spectraflame' | 'Matte' | 'Glitter' | 'Standard';

// Item enriquecido
export interface EnrichedCatalogItem {
  // Original fields
  toy_num: string;
  col_num: string;
  carModel: string;
  series: string;
  series_num: string;
  photo_url?: string;
  photo_url_carded?: string;
  photo_gallery?: string[];
  year: string;
  brand: Brand;
  color?: string;
  tampo?: string;
  wheel_type?: string;
  car_make?: string;
  segment?: string;
  country?: string;
  sub_series?: string;

  // Enriquecimiento
  hwSeriesType?: HWSeriesType; // Solo para Hot Wheels
  colorGroup?: ColorGroup;
  colorVariant?: ColorVariant;
  colorHex?: string; // Intenta capturar color en hex si es posible
  yearPosition?: string; // Ej: "245/250" para mainline 2024
  seriesPosition?: string; // Ej: "4/5" para series de 5
  sthDetected?: boolean; // Hot Wheels: detectado como STH
  thDetected?: boolean; // Hot Wheels: detectado como TH
  photoValidation?: {
    hasMainPhoto: boolean;
    hasCardedPhoto: boolean;
    hasGallery: boolean;
    usedPhotoSource: 'main' | 'carded' | 'gallery' | 'none';
    cardedValidated: boolean; // Carded validado como mismo modelo
  };
  enrichmentMetadata?: {
    processedAt: string;
    version: string;
    dataQuality: 'high' | 'medium' | 'low';
  };
}

// Progreso de enriquecimiento
export interface CatalogEnrichmentProgress {
  step: 'loading' | 'classifying' | 'normalizing' | 'validating-photos' | 'enriching' | 'syncing' | 'complete' | 'error';
  message: string;
  percent: number;
  currentBrand: Brand;
  processedItems: number;
  totalItems: number;
  stats?: {
    itemsWithMainPhoto: number;
    itemsWithCardedPhoto: number;
    itemsWithGallery: number;
    itemsClassified: number;
    colorsNormalized: number;
  };
  error?: {
    code: string;
    message: string;
    itemId?: string;
    context?: any;
  };
}

// Estadísticas finales
export interface CatalogEnrichmentStats {
  totalProcessed: number;
  brandBreakdown: Record<Brand, number>;
  photosCoverage: {
    withMainPhoto: number;
    withCardedPhoto: number;
    withGallery: number;
    withoutPhoto: number;
    percentWithMainPhoto: number;
  };
  seriesTypeBreakdown?: Record<HWSeriesType, number>;
  colorNormalization: {
    totalUnique: number;
    groupedInto: number;
    byGroup: Record<ColorGroup, number>;
  };
  enrichmentSuccess: {
    full: number;
    partial: number;
    failed: number;
  };
  processingTime: number; // milliseconds
}
