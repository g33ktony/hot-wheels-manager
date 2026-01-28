import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSearch } from '@/contexts/SearchContext';
import { useInventorySyncInBackground } from '@/hooks/useInventoryCache';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setInventoryItems, setLoading, setError } from '@/store/slices/inventorySlice';
import { addToCart as addToCartAction, removeFromCart as removeFromCartAction, updateCartQuantity as updateCartQuantityAction, updateCartPrice, clearCart } from '@/store/slices/cartSlice';
import { calculateSimilarity } from '@/utils/searchUtils';
import { inventoryService } from '@/services/inventory';
import type { InventoryItem as ReduxInventoryItem } from '@/store/slices/inventorySlice';

// Helper para formatear el tipo de pieza
const formatPieceType = (pieceType: string | undefined): string => {
  if (!pieceType) return '';
  const typeMap: Record<string, string> = {
    'basic': 'Básico',
    'premium': 'Premium',
    'rlc': 'RLC',
    'silver_series': 'Silver Series',
    'elite_64': 'Elite 64'
  };
  return typeMap[pieceType] || pieceType;
};

const POS: React.FC = () => {
  // Sync inventory in background (keeps Redux cache fresh)
  useInventorySyncInBackground();

  // Use global search context
  const { filters, updateFilter, currentPage } = useSearch();
  const {
    searchTerm,
    filterCondition,
    filterBrand,
    filterPieceType,
    filterLocation,
    filterLowStock,
    filterTreasureHunt,
    filterChase,
    filterFantasy,
    filterMoto,
    filterCamioneta
  } = filters;

  // Get inventory from Redux cache
  const reduxInventory = useAppSelector(state => state.inventory);
  const reduxCart = useAppSelector(state => state.cart);
  const dispatch = useAppDispatch();

  const inventoryItems = useMemo(() => reduxInventory.items || [], [reduxInventory.items]);
  const cart = useMemo(() => reduxCart.items || [], [reduxCart.items]);

  console.log('🔍 POS Redux State:', {
    itemsCount: inventoryItems.length,
    isLoading: reduxInventory.isLoading,
    error: reduxInventory.error,
    hasItems: inventoryItems.length > 0
  });

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

        // Debug: verificar si los items tienen brand
        console.log('🔍 Debug first batch brands:', firstBatch.items.slice(0, 10).map((item: any) => ({
          id: item._id,
          name: typeof item.carId === 'object' ? item.carId?.name : item.carId,
          brand: item.brand,
          hasBrand: !!item.brand
        })));

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

  // When navigating to POS page, reload full inventory to avoid filtered/cached inventory from other pages
  useEffect(() => {
    if (currentPage === 'pos' && initialLoadDone) {
      console.log('📍 POS Page Detected - Reloading full inventory to clear any previous filters');

      const reloadFullInventory = async () => {
        try {
          dispatch(setLoading(true));
          const INITIAL_BATCH_SIZE = 100;
          const allItems = [];
          let totalItems = 0;
          let totalPages = 0;

          const firstBatch = await inventoryService.getAll(1, INITIAL_BATCH_SIZE, {});

          if (!firstBatch || !firstBatch.items) {
            throw new Error('Respuesta inválida del servidor');
          }

          allItems.push(...firstBatch.items);
          totalItems = firstBatch.pagination?.totalItems || firstBatch.items.length;
          totalPages = Math.ceil(totalItems / INITIAL_BATCH_SIZE);

          console.log('✅ POS Reload: First batch loaded -', firstBatch.items.length, 'of', totalItems);

          dispatch(setInventoryItems({
            items: firstBatch.items,
            totalItems: totalItems,
            currentPage: 1,
            totalPages: totalPages,
            itemsPerPage: INITIAL_BATCH_SIZE
          }));

          // Load remaining batches in background
          if (totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
              try {
                const batch = await inventoryService.getAll(page, INITIAL_BATCH_SIZE, {});
                allItems.push(...(batch.items || []));
              } catch (pageError) {
                console.warn('⚠️ Error loading page', page);
              }
            }

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
          console.error('❌ Error reloading inventory for POS:', error?.message);
          dispatch(setError(`Error al recargar inventario: ${error?.message}`));
        } finally {
          dispatch(setLoading(false));
        }
      };

      reloadFullInventory();
    }
  }, [currentPage, initialLoadDone]);

  // Smart search con scoring multi-criterio + filtros
  const filteredInventory = useMemo(() => {
    let items = inventoryItems;

    // Aplicar filtros primero
    items = items.filter(item => {
      const quantity = item.quantity || 0;
      const reserved = item.reservedQuantity || 0;
      const available = quantity - reserved;

      // Stock disponible (siempre requerido)
      if (available <= 0) return false;

      // Filtro de condición
      if (filterCondition && item.condition !== filterCondition) return false;

      // Filtro de marca
      if (filterBrand && item.brand !== filterBrand) return false;

      // Filtro de tipo de pieza
      if (filterPieceType && item.pieceType !== filterPieceType) return false;

      // Filtro de ubicación
      if (filterLocation) {
        const itemLocation = (item.location || '').toLowerCase();
        if (!itemLocation.includes(filterLocation.toLowerCase())) return false;
      }

      // Filtro de stock bajo (≤ 3 unidades disponibles)
      if (filterLowStock && available > 3) return false;

      // Filtro Treasure Hunt (solo para Hot Wheels Basic)
      if (filterTreasureHunt !== 'all' && item.brand === 'Hot Wheels' && item.pieceType === 'basic') {
        if (filterTreasureHunt === 'th' && !item.isTreasureHunt) return false;
        if (filterTreasureHunt === 'sth' && !item.isSuperTreasureHunt) return false;
      }

      // Filtro Chase
      if (filterChase && !item.isChase) return false;

      // Filtro Fantasy (solo para Hot Wheels)
      if (filterFantasy && item.brand === 'Hot Wheels' && !item.isFantasy) return false;

      // Filtro Moto
      if (filterMoto && !item.isMoto) return false;

      // Filtro Camioneta
      if (filterCamioneta && !item.isCamioneta) return false;

      return true;
    });

    if (!searchTerm.trim()) {
      // Sin búsqueda: mostrar items filtrados
      const available = items;
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

    const query = searchTerm.toLowerCase().trim();
    const queryWords = query.split(/\s+/); // Dividir en palabras

    // Sistema de scoring para ordenar resultados (sobre items ya filtrados)
    const scoredItems = items
      .map(item => {

        // Extraer datos del item
        const carData = typeof item.carId === 'object' ? item.carId : null;
        const carName = (carData?.name || '').toLowerCase();
        const carIdStr = (typeof item.carId === 'string' ? item.carId : carData?._id || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const pieceType = (item.pieceType || '').toLowerCase();
        const location = (item.location || '').toLowerCase();
        const condition = (item.condition || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();

        let score = 0;

        // 1. Coincidencia exacta completa (máxima prioridad)
        if (carName === query) score += 1000;
        if (brand === query) score += 900;
        if (pieceType === query) score += 800;

        // 2. Contiene la frase completa
        if (carName.includes(query)) score += 500;
        if (brand.includes(query)) score += 400;
        if (pieceType.includes(query)) score += 300;
        if (location.includes(query)) score += 200;
        if (condition.includes(query)) score += 150;
        if (notes.includes(query)) score += 100;
        if (carIdStr.includes(query)) score += 50;

        // 3. Empieza con la búsqueda (muy relevante)
        if (carName.startsWith(query)) score += 400;
        if (brand.startsWith(query)) score += 350;
        if (pieceType.startsWith(query)) score += 250;

        // 4. Búsqueda por palabras individuales
        queryWords.forEach(word => {
          if (word.length < 2) return; // Ignorar palabras muy cortas

          // Palabras completas encontradas
          const carNameWords = carName.split(/\s+/);
          const brandWords = brand.split(/\s+/);

          if (carNameWords.some(w => w === word)) score += 200;
          if (brandWords.some(w => w === word)) score += 180;
          if (carNameWords.some(w => w.startsWith(word))) score += 150;
          if (brandWords.some(w => w.startsWith(word))) score += 130;

          // Contiene la palabra
          if (carName.includes(word)) score += 80;
          if (brand.includes(word)) score += 70;
          if (pieceType.includes(word)) score += 60;
          if (location.includes(word)) score += 40;
          if (notes.includes(word)) score += 30;
        });

        // 5. Similitud fuzzy (umbral bajo para ser flexible)
        const FUZZY_THRESHOLD = 60; // Reducido de 75 a 60

        const carNameSimilarity = calculateSimilarity(query, carName);
        const brandSimilarity = calculateSimilarity(query, brand);
        const pieceTypeSimilarity = calculateSimilarity(query, pieceType);

        if (carNameSimilarity >= FUZZY_THRESHOLD) score += carNameSimilarity * 2;
        if (brandSimilarity >= FUZZY_THRESHOLD) score += brandSimilarity * 1.5;
        if (pieceTypeSimilarity >= FUZZY_THRESHOLD) score += pieceTypeSimilarity;

        // 6. Bonus por palabras individuales con fuzzy
        queryWords.forEach(word => {
          if (word.length >= 3) {
            const wordCarSimilarity = calculateSimilarity(word, carName);
            const wordBrandSimilarity = calculateSimilarity(word, brand);

            if (wordCarSimilarity >= 70) score += 100;
            if (wordBrandSimilarity >= 70) score += 80;
          }
        });

        return score > 0 ? { item, score } : null;
      })
      .filter((result): result is { item: ReduxInventoryItem; score: number } => result !== null)
      .sort((a, b) => b.score - a.score) // Ordenar por score descendente
      .map(result => result.item);

    console.log('🔍 Smart Search:', {
      query,
      queryWords,
      filtersApplied: { filterCondition, filterBrand, filterPieceType, filterLocation, filterLowStock, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta },
      itemsAfterFilters: items.length,
      resultsFound: scoredItems.length,
      availableStockOnly: true, // POS solo muestra items con stock disponible
      topResults: scoredItems.slice(0, 3).map(i => ({
        name: typeof i.carId === 'object' ? i.carId?.name : i.carId,
        brand: i.brand,
        available: (i.quantity || 0) - (i.reservedQuantity || 0)
      }))
    });

    return scoredItems;
  }, [inventoryItems, searchTerm, filterCondition, filterBrand, filterPieceType, filterLocation, filterLowStock, filterTreasureHunt, filterChase, filterFantasy, filterMoto, filterCamioneta]);

  // Extraer marcas únicas para el filtro
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    inventoryItems.forEach(item => {
      if (item.brand) brands.add(item.brand);
    });
    const brandsArray = Array.from(brands).sort();
    console.log('🏷️ POS Unique Brands:', {
      totalItems: inventoryItems.length,
      uniqueBrands: brandsArray,
      sampleItems: inventoryItems.slice(0, 5).map(i => ({
        name: typeof i.carId === 'object' ? i.carId?.name : 'N/A',
        brand: i.brand
      }))
    });
    return brandsArray;
  }, [inventoryItems]);

  // Extraer ubicaciones únicas para el filtro
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    inventoryItems.forEach(item => {
      if (item.location) locations.add(item.location);
    });
    return Array.from(locations).sort();
  }, [inventoryItems]);

  // Agregar item al carrito
  const addToCart = (item: ReduxInventoryItem, quantity: number = 1) => {
    if (!item._id) {
      toast.error('Item inválido');
      return;
    }

    const existingItem = cart.find(c => c._id === item._id);
    const totalQuantity = item.quantity || 0;
    const reservedQuantity = item.reservedQuantity || 0;
    const availableQty = totalQuantity - reservedQuantity;

    // Extraer nombre del carId para mensaje más claro
    const carData = typeof item.carId === 'object' ? item.carId : null;
    const carIdStr = typeof item.carId === 'string' ? item.carId : carData?._id || '';
    const displayName = carData?.name || carIdStr || 'Sin nombre';

    if (existingItem) {
      const newQuantity = existingItem.cartQuantity + quantity;
      if (newQuantity > availableQty) {
        const available = Math.max(0, availableQty - existingItem.cartQuantity);
        toast.error(`Solo hay ${available} unidad(es) disponible(s) para agregar`);
        return;
      }
      dispatch(updateCartQuantityAction({ itemId: item._id, quantity: newQuantity }));
      toast.success(`Cantidad actualizada a ${newQuantity}`);
      return;
    }

    if (quantity > availableQty) {
      if (availableQty <= 0) {
        toast.error(`${displayName} está agotado (Total: ${totalQuantity}, Reservado: ${reservedQuantity})`);
      } else {
        toast.error(`Solo hay ${availableQty} unidad(es) disponible(s) de ${displayName}`);
      }
      return;
    }

    // Extraer nombre del carId
    const price = item.actualPrice || item.suggestedPrice || 0;

    dispatch(addToCartAction({ item, quantity, customPrice: price }));
    toast.success(`${displayName} agregado al carrito (${availableQty - quantity} disponibles)`);
  };

  // Remover item del carrito
  const removeFromCart = (itemId: string | undefined) => {
    if (!itemId) return;
    dispatch(removeFromCartAction(itemId));
  };

  // Actualizar precio personalizado
  const updatePrice = (itemId: string | undefined, newPrice: number) => {
    if (!itemId) return;
    dispatch(updateCartPrice({ itemId, price: newPrice }));
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

    dispatch(updateCartQuantityAction({ itemId, quantity: newQuantity }));
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
      dispatch(clearCart());

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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-emerald-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold mb-2 text-white">Cargando inventario...</div>
          <p className="text-sm text-slate-400">Sincronizando datos desde el servidor</p>
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
          <p className="text-sm text-slate-400 mb-4">{reduxInventory.error}</p>
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
          <div className="text-lg font-semibold text-slate-400 mb-2">No hay inventario disponible</div>
          <p className="text-sm text-slate-400">Agrega items al inventario para comenzar a vender</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🛒 Punto de Venta (POS)</h1>
        <p className="text-slate-400">Búsqueda inteligente con Levenshtein • Datos en tiempo real desde caché</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Inventario */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg shadow p-4">
            {/* Barra de búsqueda */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre, marca, tipo... (búsqueda inteligente)"
                value={searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-slate-500"
              />
            </div>

            {/* Filtros */}
            <div className="mb-4 space-y-3">
              {/* Primera fila de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={filterCondition}
                  onChange={(e) => updateFilter('filterCondition', e.target.value)}
                  className="px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm focus:border-slate-500"
                >
                  <option value="">Todas las condiciones</option>
                  <option value="mint">Mint</option>
                  <option value="good">Bueno</option>
                  <option value="fair">Regular</option>
                  <option value="poor">Malo</option>
                </select>

                <select
                  value={filterBrand}
                  onChange={(e) => {
                    updateFilter('filterBrand', e.target.value);
                    if (!e.target.value) updateFilter('filterPieceType', ''); // Reset tipo al cambiar marca
                  }}
                  className="px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm focus:border-slate-500"
                >
                  <option value="">Todas las marcas</option>
                  {uniqueBrands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>

                <select
                  value={filterPieceType}
                  onChange={(e) => updateFilter('filterPieceType', e.target.value)}
                  className="px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm focus:border-slate-500 disabled:opacity-50"
                  disabled={!filterBrand}
                >
                  <option value="">Todos los tipos</option>
                  <option value="basic">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="rlc">RLC</option>
                  <option value="silver_series">Silver Series</option>
                  <option value="elite_64">Elite 64</option>
                </select>
              </div>

              {/* Segunda fila de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={filterLocation}
                  onChange={(e) => updateFilter('filterLocation', e.target.value)}
                  className="px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm focus:border-slate-500"
                >
                  <option value="">Todas las ubicaciones</option>
                  {uniqueLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>

                {/* Filtro TH/STH solo para Hot Wheels Basic */}
                {filterBrand === 'Hot Wheels' && filterPieceType === 'basic' && (
                  <select
                    value={filterTreasureHunt}
                    onChange={(e) => updateFilter('filterTreasureHunt', e.target.value)}
                    className="px-3 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm focus:border-slate-500"
                  >
                    <option value="">Todos (TH/STH/Normal)</option>
                    <option value="th">Solo Treasure Hunt (TH)</option>
                    <option value="sth">Solo Super TH (STH)</option>
                  </select>
                )}

                <label className="flex items-center gap-2 px-3 py-2 border border-slate-600 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50">
                  <input
                    type="checkbox"
                    checked={filterLowStock}
                    onChange={(e) => updateFilter('filterLowStock', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Solo stock bajo (≤3)
                  </span>
                </label>
              </div>

              {/* Tercera fila de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Filtro Chase */}
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-600 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50">
                  <input
                    type="checkbox"
                    checked={filterChase}
                    onChange={(e) => updateFilter('filterChase', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Solo Chase
                  </span>
                </label>

                {/* Filtro Fantasy solo para Hot Wheels */}
                {filterBrand === 'Hot Wheels' && (
                  <label className="flex items-center gap-2 px-3 py-2 border border-purple-600 bg-purple-900/50 rounded-lg cursor-pointer hover:bg-purple-800/50">
                    <input
                      type="checkbox"
                      checked={filterFantasy}
                      onChange={(e) => updateFilter('filterFantasy', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-purple-300">
                      Solo Fantasías
                    </span>
                  </label>
                )}

                {/* Filtro Moto */}
                <label className="flex items-center gap-2 px-3 py-2 border border-orange-600 bg-orange-900/50 rounded-lg cursor-pointer hover:bg-orange-800/50">
                  <input
                    type="checkbox"
                    checked={filterMoto}
                    onChange={(e) => updateFilter('filterMoto', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-orange-300">
                    Solo Motos 🏍️
                  </span>
                </label>

                {/* Filtro Camioneta */}
                <label className="flex items-center gap-2 px-3 py-2 border border-blue-600 bg-blue-900/50 rounded-lg cursor-pointer hover:bg-blue-800/50">
                  <input
                    type="checkbox"
                    checked={filterCamioneta}
                    onChange={(e) => updateFilter('filterCamioneta', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-blue-300">
                    Solo Camionetas 🚚
                  </span>
                </label>

                {(searchTerm || filterCondition || filterBrand || filterPieceType || filterLocation || filterLowStock || filterTreasureHunt !== 'all' || filterChase || filterFantasy || filterMoto || filterCamioneta) && (
                  <button
                    onClick={() => {
                      updateFilter('searchTerm', '');
                      updateFilter('filterCondition', '');
                      updateFilter('filterBrand', '');
                      updateFilter('filterPieceType', '');
                      updateFilter('filterLocation', '');
                      updateFilter('filterLowStock', false);
                      updateFilter('filterTreasureHunt', 'all');
                      updateFilter('filterChase', false);
                      updateFilter('filterFantasy', false);
                      updateFilter('filterMoto', false);
                      updateFilter('filterCamioneta', false);
                    }}
                    className="px-3 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 text-sm font-medium border border-slate-600"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Contador de resultados */}
            {(searchTerm || filterCondition || filterBrand || filterPieceType || filterLocation || filterLowStock || filterTreasureHunt !== 'all' || filterChase || filterFantasy || filterMoto || filterCamioneta) && (
              <div className="mb-3 text-sm text-slate-400">
                {filteredInventory.length} resultado(s) encontrado(s)
              </div>
            )}

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
                        className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-slate-800"
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
                              <p className="text-xs text-slate-400">🎨 {item.color}</p>
                            )}
                            {item.series && (
                              <p className="text-xs text-slate-400">📦 {item.series}</p>
                            )}
                            <p className="text-xs text-slate-400">🏷️ {formatPieceType(item.pieceType)}</p>
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
          <div className="bg-slate-800 rounded-lg shadow p-4 sticky top-4">
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
                    <div key={item._id} className="border rounded-lg overflow-hidden bg-slate-800 hover:shadow-md transition-shadow">
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
                onClick={() => dispatch(clearCart())}
                disabled={cart.length === 0}
                className="w-full mt-2 py-2 border border-slate-600 rounded-lg hover:bg-slate-700/30"
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
