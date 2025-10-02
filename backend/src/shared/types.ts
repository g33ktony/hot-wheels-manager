// Tipos compartidos entre frontend y backend

export interface HotWheelsCar {
  toy_num: string;
  col_num: string;
  model: string;
  series: string;
  series_num: string;
  photo_url?: string;
  year: string;
  //export interface UpdateDeliveryDto {
  status?: 'scheduled' | 'prepared' | 'completed' | 'cancelled' | 'rescheduled';
  scheduledDate?: Date;
  scheduledTime?: string;
  location?: string;
  notes?: string;
  completedDate?: Date;
  // Campos adicionales que se pueden agregar
  color?: string;
  tampo?: string;
  wheel_type?: string;
  car_make?: string;
  segment?: string;
  country?: string;
}

export interface InventoryItem {
  _id?: string;
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
  // Relación poblada con el Hot Wheels
  hotWheelsCar?: HotWheelsCar;
}

export interface Purchase {
  _id?: string;
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
}

export interface PurchaseItem {
  carId: string;
  quantity: number;
  unitPrice: number;
  condition: 'mint' | 'good' | 'fair' | 'poor';
}

export interface Customer {
  _id?: string;
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
  saleId?: string;
  customerId: string;
  customer: Customer;
  items: DeliveryItem[];
  scheduledDate: Date;
  scheduledTime?: string;
  location: string;
  totalAmount: number;
  notes?: string;
  status: 'scheduled' | 'prepared' | 'completed' | 'cancelled' | 'rescheduled';
  completedDate?: Date;
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
  recentActivity: ActivityItem[];
  todaysDeliveries: TodaysDelivery[];
}

export interface TodaysDelivery {
  id: string;
  customerName: string;
  location: string;
  scheduledTime: string;
  totalAmount: number;
  itemCount: number;
}

export interface ActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'delivery' | 'inventory';
  description: string;
  date: Date;
  amount?: number;
}
