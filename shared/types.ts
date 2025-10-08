// Tipos compartidos entre frontend y backend

// User types
export interface User {
  _id?: string;
  email: string;
  name: string;
  businessName?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionType?: 'monthly' | 'annual';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
  lastLogin?: Date;
}

export interface HotWheelsCar {
  toy_num: string;
  col_num: string;
  model: string;
  series: string;
  series_num: string;
  photo_url?: string;
  year: string;
  // Campos adicionales que se pueden agregar
  color?: string;
  tampo?: string;
  wheel_type?: string;
  car_make?: string;
  segment?: string;
  country?: string;
}

export interface RecentActivity {
  id: string;
  type: 'delivery' | 'purchase' | 'inventory' | 'system' | 'sale';
  description: string;
  date: Date;
  amount?: number;
}

export interface InventoryItem {
  _id?: string;
  userId: string; // Multi-tenant: Owner of this inventory item
  carId: string; // Referencia al HotWheelsCar
  quantity: number;
  reservedQuantity?: number; // Cantidad reservada para entregas pendientes
  purchasePrice: number;
  suggestedPrice: number;
  actualPrice?: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  photos: string[];
  location?: string;
  notes?: string;
  dateAdded: Date;
  lastUpdated: Date;
  // Brand and type fields
  brand?: string; // Hot Wheels, Kaido House, Mini GT, M2, etc.
  pieceType?: 'basic' | 'premium' | 'rlc'; // Basic, Premium, RLC
  isTreasureHunt?: boolean; // Only for Hot Wheels basic
  isSuperTreasureHunt?: boolean; // Only for Hot Wheels basic
  isChase?: boolean; // Only for Mini GT, Kaido House, M2
  // Series fields for selling items as a complete series
  seriesId?: string; // Unique identifier (e.g., "MARVEL-2024-001")
  seriesName?: string; // Display name (e.g., "Marvel Series 2024")
  seriesSize?: number; // Total pieces in series (e.g., 5)
  seriesPosition?: number; // Position in series (1-5)
  seriesPrice?: number; // Price for complete series (editable)
  seriesDefaultPrice?: number; // Auto-calculated (85% of individual total)
  // Box fields (for sealed boxes like 72-piece cases)
  isBox?: boolean; // true if this is a sealed box
  boxName?: string; // Display name (e.g., "Caja P", "Caja J")
  boxSize?: number; // Total pieces in box (e.g., 24, 72)
  boxPrice?: number; // Total price paid for the box
  boxStatus?: 'sealed' | 'unpacking' | 'completed'; // Box unpacking status
  registeredPieces?: number; // Number of pieces already registered (0 at start)
  // Source box tracking (for pieces that came from a box)
  sourceBox?: string; // Name of source box (e.g., "Caja P")
  sourceBoxId?: string; // ID of source box for tracking
  // Relación poblada con el Hot Wheels
  hotWheelsCar?: HotWheelsCar;
}

export interface Purchase {
  _id?: string;
  userId: string; // Multi-tenant: Owner of this purchase
  items: PurchaseItem[];
  supplierId: string | Supplier; // Reference to Supplier or populated Supplier object
  supplier?: Supplier; // Alternative field for populated supplier data
  totalCost: number;
  shippingCost: number;
  trackingNumber?: string;
  purchaseDate: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  status: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled';
  notes?: string;
  isReceived: boolean;
  receivedDate?: Date;
  // Pending items tracking
  hasPendingItems?: boolean;
  pendingItemsCount?: number;
}

export interface PurchaseItem {
  carId: string;
  quantity: number;
  unitPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  // Brand and type fields
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  isTreasureHunt?: boolean;
  isSuperTreasureHunt?: boolean;
  isChase?: boolean;
  // Series fields
  seriesId?: string;
  seriesName?: string;
  seriesSize?: number;
  seriesPosition?: number;
  seriesPrice?: number;
  // Box fields (for purchasing sealed boxes)
  isBox?: boolean; // true if this purchase item is a sealed box
  boxName?: string; // Display name (e.g., "Caja P", "Caja J")
  boxSize?: number; // Total pieces in box (e.g., 24, 72)
  boxPrice?: number; // Total price for the box
  // Photos and location
  photos?: string[];
  location?: string;
  notes?: string;
}

export interface PendingItem {
  _id?: string;
  originalPurchaseId: string;
  originalPurchase?: Purchase;
  
  // Detalles del item
  carId: string;
  quantity: number;
  unitPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  isTreasureHunt?: boolean;
  isSuperTreasureHunt?: boolean;
  isChase?: boolean;
  photos?: string[];
  
  // Tracking
  status: 'pending-reshipment' | 'requesting-refund' | 'refunded' | 'cancelled';
  reportedDate: Date;
  notes?: string;
  
  // Reenvío
  linkedToPurchaseId?: string;
  linkedToPurchase?: Purchase;
  
  // Reembolso
  refundAmount?: number;
  refundDate?: Date;
  refundMethod?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Customer {
  _id?: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'facebook' | 'other';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  totalPurchases?: number;
  lastPurchaseDate?: Date;
}

export interface Supplier {
  _id?: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'other';
  website?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  totalPurchases?: number;
  lastPurchaseDate?: Date;
}

export interface Sale {
  _id?: string;
  userId: string; // Multi-tenant: Owner of this sale
  customerId?: string;
  customer?: Customer;
  items: SaleItem[];
  totalAmount: number;
  saleDate: Date;
  deliveryId?: string;
  delivery?: Delivery;
  paymentMethod: 'cash' | 'transfer' | 'paypal' | 'mercadopago' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Populated inventory item when needed
  inventoryItem?: InventoryItem;
}

export interface CreateSaleDto {
  items: SaleItem[];
  customerId?: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'transfer' | 'paypal' | 'mercadopago' | 'other';
  deliveryId?: string;
  notes?: string;
}

// Legacy Sale interface for complex sales with multiple items (future feature)  
export interface ComplexSale {
  _id?: string;
  items: SaleItem[];
  buyer: BuyerInfo;
  totalAmount: number;
  profit: number;
  saleDate: Date;
  paymentMethod: 'cash' | 'transfer' | 'paypal' | 'mercadopago' | 'other';
  status: 'pending' | 'paid' | 'delivered' | 'completed' | 'cancelled';
  notes?: string;
  deliveryId?: string;
}

export interface SaleItem {
  inventoryItemId?: string;
  hotWheelsCarId?: string;
  carId: string;
  carName: string;
  quantity: number;
  unitPrice: number;
}

export interface BuyerInfo {
  name: string;
  contact: string;
  contactType: 'phone' | 'facebook' | 'email' | 'whatsapp';
  location?: string;
}

export interface Delivery {
  _id?: string;
  userId: string;
  saleId?: string;
  customerId: string;
  customer: Customer;
  items: DeliveryItem[];
  scheduledDate: Date;
  scheduledTime?: string;
  location: string;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  payments?: Payment[];
  notes?: string;
  status: 'scheduled' | 'prepared' | 'completed' | 'cancelled' | 'rescheduled';
  completedDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Payment {
  _id?: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeliveryItem {
  inventoryItemId?: string; // Optional for catalog items
  hotWheelsCarId?: string; // For catalog items
  carId: string;
  carName: string;
  quantity: number;
  unitPrice: number;
}

export interface MarketPrice {
  _id?: string;
  carId: string;
  currentPrice: number;
  lastUpdated: Date;
  source: 'manual' | 'ebay' | 'mercadolibre' | 'other';
  url?: string;
  notes?: string;
}

// DTOs para requests
export interface CreateInventoryItemDto {
  carId: string;
  quantity: number;
  purchasePrice: number;
  suggestedPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
  photos: string[];
  location?: string;
  notes?: string;
  // Brand and type fields
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  isTreasureHunt?: boolean;
  isSuperTreasureHunt?: boolean;
  isChase?: boolean;
  // Series fields
  seriesId?: string;
  seriesName?: string;
  seriesSize?: number;
  seriesPosition?: number;
  seriesPrice?: number;
}

export interface CreatePurchaseDto {
  items: PurchaseItem[];
  supplierId: string;
  totalCost: number;
  shippingCost: number;
  trackingNumber?: string;
  purchaseDate: Date;
  estimatedDelivery?: Date;
  notes?: string;
}

export interface CreateDeliveryDto {
  customerId: string;
  items: DeliveryItem[];
  scheduledDate: Date;
  scheduledTime?: string;
  location: string;
  totalAmount: number;
  notes?: string;
}

export interface UpdateDeliveryDto {
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  scheduledDate?: Date;
  location?: string;
  notes?: string;
  completedDate?: Date;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'facebook' | 'other';
  notes?: string;
}

export interface CreateSupplierDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'other';
  website?: string;
  notes?: string;
}

export interface UpdatePurchaseDto {
  status?: 'pending' | 'paid' | 'shipped' | 'received' | 'cancelled';
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
}

export interface UpdateMarketPriceDto {
  carId: string;
  currentPrice: number;
  source: 'manual' | 'ebay' | 'mercadolibre' | 'other';
  url?: string;
  notes?: string;
}

// Respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardMetrics {
  totalInventoryValue: number;
  totalInventoryItems: number;
  totalQuantity: number;
  totalCatalogCars: number;
  uniqueSeries: number;
  pendingSales: number;
  pendingDeliveries: number;
  pendingPurchases: number;
  monthlyProfit: number;
  totalProfit: number;
  totalSales: number;
  monthlySales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentActivity: RecentActivity[];
  todaysDeliveries: TodaysDelivery[];
}

export interface TodaysDelivery {
  id: string;
  customerName: string;
  location: string;
  scheduledTime: string;
}

// Custom brands saved by users
export interface CustomBrand {
  _id?: string;
  userId: string;
  name: string;
  createdAt?: Date;
}

// Delivery locations saved by users
export interface DeliveryLocation {
  _id?: string;
  userId: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'delivery' | 'inventory';
  description: string;
  date: Date;
  amount?: number;
}
