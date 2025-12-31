import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useInventorySyncInBackground } from '@/hooks/useInventoryCache';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setInventoryItems, setLoading, setError } from '@/store/slices/inventorySlice';
import { calculateSimilarity } from '@/utils/searchUtils';
import { inventoryService } from '@/services/inventory';
import type { InventoryItem as ReduxInventoryItem } from '@/store/slices/inventorySlice';

interface CartItem extends ReduxInventoryItem {
  customPrice: number;
  cartQuantity: number;
}

const POS: React.FC = () => {
  // Sync inventory in background (keeps Redux cache fresh)
  useInventorySyncInBackground();

  // Get inventory from Redux cache
  const reduxInventory = useAppSelector(state => state.inventory);
  const dispatch = useAppDispatch();

  const inventoryItems = useMemo(() => reduxInventory.items || [], [reduxInventory.items]);

  console.log('🔍 POS Redux State:', {
    itemsCount: inventoryItems.length,
    isLoading: reduxInventory.isLoading,
    error: reduxInventory.error,
    hasItems: inventoryItems.length > 0
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [processing, setProcessing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Initial load: fetch inventory on component mount if Redux is empty
  useEffect(() => {
    const loadInitialInventory = async () => {
      if (inventoryItems.length > 0) {
        console.log('✅ POS: Usando inventario en caché (ya cargado)');
        setInitialLoadDone(true);
        return;
      }

      try {
        dispatch(setLoading(true));
        console.log('🔄 POS: Cargando inventario inicial desde API...');

        // Load items in batches to prevent timeout on large inventories
        const INITIAL_BATCH_SIZE = 100;
        const allItems = [];
        let totalItems = 0;
        let totalPages = 0;

        // Load first batch
        const firstBatch = await inventoryService.getAll(1, INITIAL_BATCH_SIZE, {});

        if (!firstBatch || !firstBatch.items) {
          throw new Error('Respuesta inválida del servidor: no hay datos');
        }

        allItems.push(...firstBatch.items);
        totalItems = firstBatch.pagination?.totalItems || firstBatch.items.length;
        totalPages = Math.ceil(totalItems / INITIAL_BATCH_SIZE);

        console.log('✅ POS: Cargó primer lote -', firstBatch.items.length, 'items de', totalItems, 'total');

        // Update Redux with first batch
        dispatch(setInventoryItems({
          items: firstBatch.items,
          totalItems: totalItems,
          currentPage: 1,
          totalPages: totalPages,
          itemsPerPage: INITIAL_BATCH_SIZE
        }));

        // Load remaining batches in background if there are more pages
        if (totalPages > 1) {
          console.log('🔄 POS: Cargando lotes restantes en background (' + (totalPages - 1) + ' pages más)...');

          for (let page = 2; page <= totalPages; page++) {
            try {
              const batch = await inventoryService.getAll(page, INITIAL_BATCH_SIZE, {});
              allItems.push(...(batch.items || []));
              console.log('✅ POS: Página', page, '/', totalPages, 'cargada');
            } catch (pageError) {
              console.warn('⚠️ POS: Error cargando página', page, '-', pageError);
            }
          }

          console.log('✅ POS: Todos los lotes cargados -', allItems.length, 'items total');
          dispatch(setInventoryItems({
            items: allItems,
            totalItems: totalItems,
            currentPage: 1,
            totalPages: totalPages,
            itemsPerPage: INITIAL_BATCH_SIZE
          }));
        }

        dispatch(setError(null));
      } catch (error: any) {
        const errorMsg = error?.message || 'Error desconocido';
        const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('30000');
        console.error('❌ Error loading inventory for POS:', errorMsg);
        console.error('Full error:', error);

        if (isTimeout) {
          dispatch(setError('Tiempo de carga agotado - el servidor tardó demasiado'));
          toast.error('⏱️ Timeout: Intenta de nuevo en unos momentos');
        } else {
          dispatch(setError(`Error al cargar inventario: ${errorMsg}`));
          toast.error(`Error: ${errorMsg}`);
        }
      } finally {
        dispatch(setLoading(false));
        setInitialLoadDone(true);
      }
    };

    loadInitialInventory();
  }, []);

  // Fuzzy search en caché (instant search - sin API calls)
  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) {
      // Sin búsqueda: mostrar todos los items con stock disponible
      const available = inventoryItems.filter(item => {
        const quantity = item.quantity || 0;
        const reserved = item.reservedQuantity || 0;
        return quantity - reserved > 0;
      });
      console.log('📦 POS Inventory Stats (No Search):', {
        total: inventoryItems.length,
        available: available.length,
        firstItems: inventoryItems.slice(0, 3).map(i => ({
          name: typeof i.carId === 'object' ? i.carId?.name : i.carId,
          qty: i.quantity,
          reserved: i.reservedQuantity,
          avail: (i.quantity || 0) - (i.reservedQuantity || 0)
        }))
      });
      return available;
    }

    const query = searchTerm.toLowerCase();
    const SIMILARITY_THRESHOLD = 75;

    return inventoryItems
      .filter(item => {
        const quantity = item.quantity || 0;
        const reserved = item.reservedQuantity || 0;

        // Skip items sin stock
        if (quantity - reserved <= 0) return false;

        // Extraer datos del carId si está poblado
        const carData = typeof item.carId === 'object' ? item.carId : null;
        const carName = carData?.name || '';
        const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';

        // Búsqueda exacta (contiene substring)
        if (
          carName.toLowerCase().includes(query) ||
          carIdStr.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.pieceType?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
        ) {
          return true;
        }

        // Búsqueda fuzzy con Levenshtein
        const carNameSimilarity = calculateSimilarity(query, carName);
        const brandSimilarity = calculateSimilarity(query, item.brand || '');
        const pieceTypeSimilarity = calculateSimilarity(query, item.pieceType || '');

        return (
          carNameSimilarity >= SIMILARITY_THRESHOLD ||
          brandSimilarity >= SIMILARITY_THRESHOLD ||
          pieceTypeSimilarity >= SIMILARITY_THRESHOLD
        );
      })
      .sort((a, b) => {
        // Priorizar resultados exactos
        const getCarName = (item: any) => {
          const carData = typeof item.carId === 'object' ? item.carId : null;
          return carData?.name || '';
        };

        const aExact =
          getCarName(a).toLowerCase().includes(query) ||
          a.brand?.toLowerCase().includes(query);
        const bExact =
          getCarName(b).toLowerCase().includes(query) ||
          b.brand?.toLowerCase().includes(query);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
  }, [inventoryItems, searchTerm]);

  // Agregar item al carrito
  const addToCart = (item: ReduxInventoryItem, quantity: number = 1) => {
    if (!item._id) {
      toast.error('Item inválido');
      return;
    }

    const existingItem = cart.find(c => c._id === item._id);
    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);

    if (existingItem) {
      const newQuantity = existingItem.cartQuantity + quantity;
      if (newQuantity > availableQty) {
        toast.error('No hay suficiente inventario disponible');
        return;
      }
      updateCartQuantity(item._id, newQuantity);
      return;
    }

    // Extraer nombre del carId
    const carData = typeof item.carId === 'object' ? item.carId : null;
    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
    const displayName = carData?.name || carIdStr || 'Sin nombre';

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
  const removeFromCart = (itemId: string | undefined) => {
    if (!itemId) return;
    setCart(cart.filter(item => item._id !== itemId));
  };

  // Actualizar precio personalizado
  const updatePrice = (itemId: string | undefined, newPrice: number) => {
    if (!itemId) return;
    setCart(cart.map(item =>
      item._id === itemId ? { ...item, customPrice: newPrice } : item
    ));
  };

  // Actualizar cantidad en carrito
  const updateCartQuantity = (itemId: string | undefined, newQuantity: number) => {
    if (!itemId) return;

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
        throw new Error(error.message || 'Error al procesar la venta');
      }

      toast.success(`¡Venta completada! Total: $${calculateTotal().toFixed(2)}`);
      setCart([]);

      // Redux sync en background refrescará automáticamente el inventario
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (!initialLoadDone || reduxInventory.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Cargando inventario...</div>
          <p className="text-sm text-gray-600">Sincronizando datos desde el servidor</p>
        </div>
      </div>
    );
  }

  // Error state
  if (reduxInventory.error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">Error al cargar inventario</div>
          <p className="text-sm text-gray-600 mb-4">{reduxInventory.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!inventoryItems || inventoryItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600 mb-2">No hay inventario disponible</div>
          <p className="text-sm text-gray-600">Agrega items al inventario para comenzar a vender</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🛒 Punto de Venta (POS)</h1>
        <p className="text-gray-600">Búsqueda inteligente con Levenshtein • Datos en tiempo real desde caché</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Inventario */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre, marca, tipo... (búsqueda inteligente 75%+)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-2">
                  {filteredInventory.length} resultado(s) encontrado(s)
                </p>
              )}
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {filteredInventory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? 'No se encontraron artículos' : 'No hay artículos disponibles'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredInventory.map(item => {
                    if (!item._id) return null;

                    // Extraer datos del carId si está poblado
                    const carData = typeof item.carId === 'object' ? item.carId : null;
                    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
                    const displayName = carData?.name || carIdStr || 'Sin nombre';
                    const price = item.actualPrice || item.suggestedPrice || 0;
                    const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);
                    const cartItem = cart.find(c => c._id === item._id);
                    const cartQty = cartItem?.cartQuantity || 0;
                    const isInCart = !!cartItem;

                    return (
                      <div
                        key={item._id}
                        className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                      >
                        {/* Item Image */}
                        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100">
                          {item.photos && item.photos.length > 0 ? (
                            <img
                              src={item.photos[0]}
                              alt={displayName}
                              className="w-full h-48 object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center">
                              <svg className="w-20 h-20 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {isInCart && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              En carrito
                            </div>
                          )}
                          {availableQty <= 3 && (
                            <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                              Solo {availableQty}
                            </div>
                          )}
                        </div>
                        
                        {/* Item Details */}
                        <div className="p-4">
                          <h3 className="font-bold text-lg mb-1 line-clamp-2">{displayName}</h3>
                          <p className="text-xs text-gray-500 mb-2">{carIdStr}</p>
                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-gray-700 font-medium">
                              {item.brand} {item.year && `• ${item.year}`}
                            </p>
                            {item.color && (
                              <p className="text-xs text-gray-600">🎨 {item.color}</p>
                            )}
                            {item.series && (
                              <p className="text-xs text-gray-600">📦 {item.series}</p>
                            )}
                            <p className="text-xs text-gray-600">🏷️ {item.pieceType}</p>
                            <p className="text-xs text-gray-500">📍 Disponible: {availableQty}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-2xl font-bold text-green-600">
                              ${price.toFixed(2)}
                            </span>
                            {availableQty <= 1 ? (
                              <button
                                onClick={() => addToCart(item)}
                                disabled={isInCart}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isInCart
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                              >
                                {isInCart ? '✓ Agregado' : '+ Agregar'}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isInCart && (
                                  <>
                                    <button
                                      onClick={() => updateCartQuantity(item._id, cartQty - 1)}
                                      className="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                                    >
                                      −
                                    </button>
                                    <span className="font-bold text-lg min-w-[2.5rem] text-center">{cartQty}</span>
                                  </>
                                )}
                                <button
                                  onClick={() => addToCart(item, 1)}
                                  disabled={cartQty >= availableQty}
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold transition-colors ${cartQty >= availableQty
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

            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Carrito vacío</p>
              ) : (
                cart.map(item => {
                  if (!item._id) return null;

                  const carData = typeof item.carId === 'object' ? item.carId : null;
                  const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
                  const displayName = carData?.name || carIdStr || 'Sin nombre';
                  const originalPrice = item.actualPrice || item.suggestedPrice || 0;
                  const availableQty = (item.quantity || 0) - (item.reservedQuantity || 0);

                  return (
                    <div key={item._id} className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
                      <div className="flex gap-2 p-2">
                        {/* Cart Item Image */}
                        <div className="flex-shrink-0">
                          {item.photos && item.photos.length > 0 ? (
                            <img
                              src={item.photos[0]}
                              alt={displayName}
                              className="w-16 h-16 object-cover rounded border"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded border flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Cart Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{displayName}</p>
                              <p className="text-xs text-gray-500 truncate">{carIdStr}</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item._id)}
                              className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                          
                          {/* Price Input */}
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs text-gray-400 line-through">
                              ${originalPrice.toFixed(2)}
                            </span>
                            <input
                              type="number"
                              value={item.customPrice}
                              onChange={(e) =>
                                updatePrice(item._id, parseFloat(e.target.value) || 0)
                              }
                              className="flex-1 px-2 py-1 border rounded text-sm font-semibold text-green-600"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          
                          {/* Quantity Controls */}
                          {availableQty > 1 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    updateCartQuantity(item._id, item.cartQuantity - 1)
                                  }
                                  className="w-6 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded font-bold text-xs"
                                >
                                  −
                                </button>
                                <span className="text-sm font-bold min-w-[2rem] text-center">
                                  {item.cartQuantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCartQuantity(item._id, item.cartQuantity + 1)
                                  }
                                  disabled={item.cartQuantity >= availableQty}
                                  className={`w-6 h-6 flex items-center justify-center rounded font-bold text-xs ${item.cartQuantity >= availableQty
                                      ? 'bg-gray-300 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs font-semibold text-gray-700">
                                ${(item.customPrice * item.cartQuantity).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
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
