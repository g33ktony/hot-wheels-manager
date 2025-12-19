import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  _id: string;
  carId: string;
  carName: string;
  brand: string;
  year: number;
  color: string;
  series: string;
  pieceType: string;
  salePrice: number;
  purchasePrice: number;
  status: string;
  quantity?: number;
  reservedQuantity?: number;
  imageUrl?: string;
}

interface CartItem extends InventoryItem {
  customPrice: number;
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
      console.log('📦 Inventario recibido:', data.data?.length, 'items');
      console.log('📦 Primer item:', data.data?.[0]);
      
      // Filtrar items que tengan cantidad disponible (quantity - reservedQuantity > 0)
      const availableItems = Array.isArray(data.data) 
        ? data.data.filter((item: InventoryItem) => {
            const quantity = item.quantity || 0;
            const reserved = item.reservedQuantity || 0;
            const available = quantity - reserved;
            console.log(`  - ${item.carName}: qty=${quantity}, reserved=${reserved}, available=${available}`);
            return available > 0;
          })
        : [];
      
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
  const addToCart = (item: InventoryItem) => {
    const existsInCart = cart.find(cartItem => cartItem._id === item._id);
    if (existsInCart) {
      toast.error('Este artículo ya está en el carrito');
      return;
    }

    const cartItem: CartItem = {
      ...item,
      customPrice: item.salePrice
    };

    setCart([...cart, cartItem]);
    toast.success(`${item.carName} agregado al carrito`);
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

  // Calcular total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.customPrice, 0);
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

      await response.json();
      
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

  // Filtrar inventario
  const filteredInventory = inventory.filter(item => {
    if (!searchTerm) return true; // Si no hay búsqueda, mostrar todo
    
    const search = searchTerm.toLowerCase();
    return (
      item.carName?.toLowerCase().includes(search) ||
      item.carId?.toLowerCase().includes(search) ||
      item.brand?.toLowerCase().includes(search) ||
      item.series?.toLowerCase().includes(search) ||
      item.color?.toLowerCase().includes(search) ||
      item.pieceType?.toLowerCase().includes(search) ||
      item.year?.toString().includes(search)
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
                  {filteredInventory.map(item => (
                    <div
                      key={item._id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.carName}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <h3 className="font-semibold text-lg">{item.carName}</h3>
                      <p className="text-sm text-gray-600">{item.carId}</p>
                      <p className="text-sm text-gray-600">{item.brand} • {item.year}</p>
                      <p className="text-sm text-gray-600">{item.pieceType}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xl font-bold text-green-600">
                          ${item.salePrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={cart.some(cartItem => cartItem._id === item._id)}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            cart.some(cartItem => cartItem._id === item._id)
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {cart.some(cartItem => cartItem._id === item._id) ? 'En carrito' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  ))}
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
                cart.map(item => (
                  <div key={item._id} className="border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.carName}</p>
                        <p className="text-xs text-gray-600">{item.carId}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Precio:</span>
                      <span className="text-xs text-gray-400 line-through">
                        ${item.salePrice.toFixed(2)}
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
                  </div>
                ))
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
                className={`w-full py-3 rounded-lg font-bold text-lg ${
                  cart.length === 0 || processing
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
