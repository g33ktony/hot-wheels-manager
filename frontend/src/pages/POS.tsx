import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  _id: string;
  carId: string | {
    _id: string;
    name: string;
    year?: number;
    color?: string;
    series?: string;
  }; // Puede ser string (ID) o objeto poblado
  carName?: string; // Puede venir del populate
  brand: string;
  year?: number; // Puede venir del populate
  color?: string; // Puede venir del populate
  series?: string; // Puede venir del populate
  pieceType: string;
  salePrice?: number; // Campo calculado
  suggestedPrice: number;
  actualPrice?: number;
  purchasePrice: number;
  status?: string;
  quantity?: number;
  reservedQuantity?: number;
  notes?: string;
  location?: string;
  imageUrl?: string;
}

interface CartItem extends InventoryItem {
  customPrice: number;
  cartQuantity: number; // Cantidad en el carrito
}

const POS: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  // Cargar inventario disponible
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar inventario');

      const data = await response.json();
      console.log('📦 Respuesta completa del API:', JSON.stringify(data, null, 2));
      console.log('📦 data.data:', data.data);
      console.log('📦 data.data.items:', data.data?.items);
      console.log('📦 Es array data.data?:', Array.isArray(data.data));
      console.log('📦 Es array data.data.items?:', Array.isArray(data.data?.items));

      // Detectar estructura correcta
      let items = [];
      if (data.success && data.data) {
        if (Array.isArray(data.data)) {
          items = data.data;
        } else if (data.data.items && Array.isArray(data.data.items)) {
          items = data.data.items;
        }
      }

      console.log('📦 Items extraídos:', items.length);
      console.log('📦 Primer item completo:', JSON.stringify(items[0], null, 2));
      console.log('🔍 carId es objeto?:', typeof items[0]?.carId === 'object');
      console.log('🔍 carId tiene name?:', items[0]?.carId?.name);

      // Filtrar items que tengan cantidad disponible (quantity - reservedQuantity > 0)
      const availableItems = items.filter((item: InventoryItem) => {
        const quantity = item.quantity || 0;
        const reserved = item.reservedQuantity || 0;
        const available = quantity - reserved;
        console.log(`  - Item: qty=${quantity}, reserved=${reserved}, available=${available}, carId type:${typeof item.carId}`);
        return available > 0;
      });

      console.log('✅ Items disponibles para POS:', availableItems.length);
      setInventory(availableItems);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar el inventario');
      setInventory([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  // Agregar item al carrito
  const addToCart = (item: InventoryItem, quantity: number = 1) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);

    if (existingItem) {
      // Si ya existe, incrementar cantidad
      const newQuantity = existingItem.cartQuantity + quantity;
      if (newQuantity > availableQty) {
        toast.error('No hay suficiente inventario disponible');
        return;
      }
      updateCartQuantity(item._id, newQuantity);
      return;
    }

    // Extraer datos del carId si está poblado
    const carData = typeof item.carId === 'object' ? item.carId : null;
    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
    const displayName = carData?.name || item.carName || carIdStr || 'Sin nombre';
    const price = item.actualPrice || item.suggestedPrice || 0;

    const cartItem: CartItem = {
      ...item,
      customPrice: price,
      cartQuantity: quantity
    };

    setCart([...cart, cartItem]);
    toast.success(`${displayName} agregado al carrito`);
  };

  // Remover item del carrito
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  // Actualizar precio personalizado
  const updatePrice = (itemId: string, newPrice: number) => {
    setCart(cart.map(item =>
      item._id === itemId ? { ...item, customPrice: newPrice } : item
    ));
  };

  // Actualizar cantidad en el carrito
  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.find(c => c._id === itemId);
    if (!item) return;

    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);

    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    if (newQuantity > availableQty) {
      toast.error('No hay suficiente inventario disponible');
      return;
    }

    setCart(cart.map(cartItem =>
      cartItem._id === itemId ? { ...cartItem, cartQuantity: newQuantity } : cartItem
    ));
  };

  // Calcular total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.customPrice * item.cartQuantity), 0);
  };

  // Procesar venta
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setProcessing(true);

    try {
      const token = localStorage.getItem('token');

      const saleData = {
        items: cart.map(item => ({
          inventoryItemId: item._id,
          quantity: item.cartQuantity,
          customPrice: item.customPrice
        })),
        paymentMethod,
        notes: `Venta POS - ${cart.length} artículo(s)`
      };

      console.log('📤 Enviando venta POS:', saleData);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/pos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error del servidor:', error);
        console.error('❌ Status:', response.status);
        throw new Error(error.message || 'Error al procesar la venta');
      }

      const result = await response.json();
      console.log('✅ Venta creada:', result);

      toast.success(`¡Venta completada! Total: $${calculateTotal().toFixed(2)}`);

      // Limpiar carrito y recargar inventario
      setCart([]);
      await fetchInventory();

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar inventario - buscar solo en campos que existen en el modelo
  const filteredInventory = inventory.filter(item => {
    // First filter: only show items with available quantity
    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);
    if (availableQty <= 0) return false;

    // Second filter: search term
    if (!searchTerm) return true; // Si no hay búsqueda, mostrar todos los disponibles

    const search = searchTerm.toLowerCase();

    // Extraer datos del carId si está poblado
    const carData = typeof item.carId === 'object' ? item.carId : null;
    const carName = carData?.name || item.carName || '';
    const carYear = carData?.year || item.year;
    const carColor = carData?.color || item.color || '';
    const carSeries = carData?.series || item.series || '';
    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';

    return (
      carIdStr.toLowerCase().includes(search) ||
      carName.toLowerCase().includes(search) ||
      item.brand?.toLowerCase().includes(search) ||
      item.pieceType?.toLowerCase().includes(search) ||
      item.notes?.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      carSeries.toLowerCase().includes(search) ||
      carColor.toLowerCase().includes(search) ||
      carYear?.toString().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🛒 Punto de Venta (POS)</h1>
        <p className="text-gray-600">Selecciona artículos para crear una venta rápida</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Inventario */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre, ID o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {filteredInventory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay artículos disponibles
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredInventory.map(item => {
                    // Extraer datos del carId si está poblado
                    const carData = typeof item.carId === 'object' ? item.carId : null;
                    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
                    const displayName = carData?.name || item.carName || carIdStr || 'Sin nombre';
                    const displayYear = carData?.year || item.year || '';
                    const displayColor = carData?.color || item.color || '';
                    const displaySeries = carData?.series || item.series || '';
                    const price = item.actualPrice || item.suggestedPrice || 0;
                    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);
                    const cartItem = cart.find(c => c._id === item._id);
                    const cartQty = cartItem?.cartQuantity || 0;
                    const isInCart = !!cartItem;
                    const isSingleItem = availableQty === 1;

                    return (
                      <div
                        key={item._id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={displayName}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
                        <h3 className="font-semibold text-lg">{displayName}</h3>
                        <p className="text-sm text-gray-600">{carIdStr}</p>
                        <p className="text-sm text-gray-600">
                          {item.brand} {displayYear && `• ${displayYear}`}
                        </p>
                        {displayColor && (
                          <p className="text-sm text-gray-600">Color: {displayColor}</p>
                        )}
                        {displaySeries && (
                          <p className="text-sm text-gray-600">Serie: {displaySeries}</p>
                        )}
                        <p className="text-sm text-gray-600">{item.pieceType}</p>
                        <p className="text-sm text-gray-500">Disponible: {availableQty}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xl font-bold text-green-600">
                            ${price.toFixed(2)}
                          </span>
                          {isSingleItem ? (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={isInCart}
                              className={`px-4 py-2 rounded-lg font-medium ${isInCart
                                  ? 'bg-gray-300 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                              {isInCart ? 'En carrito' : 'Agregar'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {isInCart && (
                                <>
                                  <button
                                    onClick={() => updateCartQuantity(item._id, cartQty - 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold"
                                  >
                                    −
                                  </button>
                                  <span className="font-semibold min-w-[2rem] text-center">{cartQty}</span>
                                </>
                              )}
                              <button
                                onClick={() => addToCart(item, 1)}
                                disabled={cartQty >= availableQty}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${cartQty >= availableQty
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Carrito ({cart.length})</h2>

            <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Carrito vacío
                </p>
              ) : (
                cart.map(item => {
                  // Extraer datos del carId si está poblado
                  const carData = typeof item.carId === 'object' ? item.carId : null;
                  const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
                  const displayName = carData?.name || item.carName || carIdStr || 'Sin nombre';
                  const originalPrice = item.actualPrice || item.suggestedPrice || 0;
                  const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);

                  return (
                    <div key={item._id} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{displayName}</p>
                          <p className="text-xs text-gray-600">{carIdStr}</p>
                          {item.cartQuantity > 1 && (
                            <p className="text-xs text-blue-600 font-semibold">Cantidad: {item.cartQuantity}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600">Precio:</span>
                        <span className="text-xs text-gray-400 line-through">
                          ${originalPrice.toFixed(2)}
                        </span>
                        <input
                          type="number"
                          value={item.customPrice}
                          onChange={(e) => updatePrice(item._id, parseFloat(e.target.value) || 0)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {availableQty > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item._id, item.cartQuantity - 1)}
                            className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded font-bold text-sm"
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold min-w-[2rem] text-center">{item.cartQuantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item._id, item.cartQuantity + 1)}
                            disabled={item.cartQuantity >= availableQty}
                            className={`w-7 h-7 flex items-center justify-center rounded font-bold text-sm ${item.cartQuantity >= availableQty
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                          >
                            +
                          </button>
                          <span className="text-xs text-gray-500 ml-auto">Subtotal: ${(item.customPrice * item.cartQuantity).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="paypal">PayPal</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold">Total:</span>
                <span className="text-3xl font-bold text-green-600">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || processing}
                className={`w-full py-3 rounded-lg font-bold text-lg ${cart.length === 0 || processing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                {processing ? 'Procesando...' : 'Completar Venta'}
              </button>

              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="w-full mt-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar Carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
