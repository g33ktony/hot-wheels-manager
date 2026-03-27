import { useMemo } from 'react'
import { calculateSimilarity } from '@/utils/searchUtils'

interface UseInventoryFilteringParams {
    inventoryItems: any[]
    searchTerm: string
    filterLocation: string
    filterLowStock: boolean
    filterPriceMin: string
    filterPriceMax: string
}

/**
 * Filters and scores inventory items based on search term and active filters.
 * Applies fuzzy matching with weighted scoring for intelligent search results.
 */
export const useInventoryFiltering = ({
    inventoryItems,
    searchTerm,
    filterLocation,
    filterLowStock,
    filterPriceMin,
    filterPriceMax
}: UseInventoryFilteringParams): any[] => {
    const filteredItems = useMemo(() => {
        let items = inventoryItems.filter((item: any) => {
            const quantity = item.quantity || 0;
            const reserved = item.reservedQuantity || 0;
            // Mostrar items con stock disponible O con reservas (pero al menos algo de stock)
            // Ocultar solo los items completamente vacíos (0/0)
            return !(quantity === 0 && reserved === 0);
        });

        // Aplicar filtros adicionales localmente
        items = items.filter((item: any) => {
            const quantity = item.quantity || 0;
            const reserved = item.reservedQuantity || 0;
            const available = quantity - reserved;

            // Filtro de ubicación
            if (filterLocation) {
                const itemLocation = (item.location || '').toLowerCase();
                if (!itemLocation.includes(filterLocation.toLowerCase())) return false;
            }

            // Filtro de stock bajo (≤3 disponibles - solo cuenta stock disponible no reservado)
            if (filterLowStock && available > 3) return false;

            // Filtro de rango de precio (actualPrice o suggestedPrice)
            const price = item.actualPrice || item.suggestedPrice || 0;
            if (filterPriceMin && price < parseFloat(filterPriceMin)) return false;
            if (filterPriceMax && price > parseFloat(filterPriceMax)) return false;

            return true;
        });

        // Si hay búsqueda con término, aplicar scoring inteligente
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase().trim();
            const queryWords = query.split(/\s+/);

            const scoredItems = items
                .map((item: any) => {
                    const carData = typeof item.carId === 'object' ? item.carId : null;
                    const carName = (carData?.name || '').toLowerCase();
                    const carIdStr = (typeof item.carId === 'string' ? item.carId : carData?._id || '').toLowerCase();
                    const brand = (item.brand || '').toLowerCase();
                    const pieceType = (item.pieceType || '').toLowerCase();
                    const location = (item.location || '').toLowerCase();
                    const condition = (item.condition || '').toLowerCase();
                    const notes = (item.notes || '').toLowerCase();

                    let score = 0;

                    // 1. Coincidencia exacta completa
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

                    // 3. Empieza con la búsqueda
                    if (carName.startsWith(query)) score += 400;
                    if (brand.startsWith(query)) score += 350;
                    if (pieceType.startsWith(query)) score += 250;

                    // 4. Búsqueda por palabras individuales
                    queryWords.forEach(word => {
                        if (word.length < 2) return;

                        const carNameWords = carName.split(/\s+/);
                        const brandWords = brand.split(/\s+/);

                        if (carNameWords.some((w: string) => w === word)) score += 200;
                        if (brandWords.some((w: string) => w === word)) score += 180;
                        if (carNameWords.some((w: string) => w.startsWith(word))) score += 150;
                        if (brandWords.some((w: string) => w.startsWith(word))) score += 130;

                        if (carName.includes(word)) score += 80;
                        if (brand.includes(word)) score += 70;
                        if (pieceType.includes(word)) score += 60;
                        if (location.includes(word)) score += 40;
                        if (notes.includes(word)) score += 30;
                    });

                    // 5. Similitud fuzzy (umbral bajo)
                    const FUZZY_THRESHOLD = 60;

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
                .filter((result: any): result is { item: any; score: number } => result !== null)
                .sort((a: any, b: any) => b.score - a.score)
                .map((result: any) => result.item);

            console.log('🔍 Inventory Smart Search:', {
                query,
                queryWords,
                includesReservedItems: true, // Inventory muestra items con reservas también
                resultsFound: scoredItems.length,
                topResults: scoredItems.slice(0, 3).map((i: any) => ({
                    name: typeof i.carId === 'object' ? i.carId?.name : i.carId,
                    brand: i.brand,
                    total: i.quantity || 0,
                    reserved: i.reservedQuantity || 0,
                    available: (i.quantity || 0) - (i.reservedQuantity || 0)
                }))
            });

            return scoredItems;
        }

        return items;
    }, [inventoryItems, searchTerm, filterLocation, filterLowStock, filterPriceMin, filterPriceMax]);

    return filteredItems;
};
