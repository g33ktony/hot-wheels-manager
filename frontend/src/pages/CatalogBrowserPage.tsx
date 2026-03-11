import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../utils/imageUtils'
import './CatalogBrowserPage.css'

interface CatalogItem {
    _id: string
    toy_num: string
    carModel: string
    series: string
    year: string
    color?: string
    colorGroup?: string
    hwSeriesType?: string
    photo_url?: string
}

interface PaginationInfo {
    total: number
    page: number
    limit: number
    pages: number
}

export default function CatalogBrowserPage() {
    const navigate = useNavigate()
    const [items, setItems] = useState<CatalogItem[]>([])
    const [pagination, setPagination] = useState<PaginationInfo>({
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Filtros
    const [search, setSearch] = useState('')
    const [selectedSeries, setSelectedSeries] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedColor, setSelectedColor] = useState('')
    const [series, setSeries] = useState<string[]>([])
    const [years, setYears] = useState<string[]>([])
    const [colors, setColors] = useState<string[]>([])

    // Cargar filtros disponibles
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const res = await fetch('/api/catalog/filters', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                const json = await res.json()
                if (json.success) {
                    setSeries(json.data.series)
                    setYears(json.data.years)
                    setColors(json.data.colors)
                }
            } catch (err) {
                console.error('Error loading filters:', err)
            }
        }
        loadFilters()
    }, [])

    // Cargar items
    const loadItems = async (page = 1) => {
        setLoading(true)
        setError('')

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
            })

            if (search) params.append('search', search)
            if (selectedSeries) params.append('series', selectedSeries)
            if (selectedYear) params.append('year', selectedYear)
            if (selectedColor) params.append('color', selectedColor)

            const res = await fetch(`/api/catalog/items?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            const json = await res.json()

            if (json.success) {
                setItems(json.data)
                setPagination(json.pagination)
            } else {
                setError(json.error || 'Error loading items')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading items')
        } finally {
            setLoading(false)
        }
    }

    // Buscar
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadItems(1)
    }

    // Limpiar filtros
    const handleClearFilters = () => {
        setSearch('')
        setSelectedSeries('')
        setSelectedYear('')
        setSelectedColor('')
        setPagination({ ...pagination, page: 1 })
        // Cargar items sin filtros
        setTimeout(() => loadItems(1), 0)
    }

    return (
        <div className="catalog-browser-page">
            <div className="catalog-header">
                <h1>📋 Gestión de Catálogo</h1>
                <p>Busca, edita y actualiza items del catálogo</p>
            </div>

            {/* Filtros */}
            <div className="filters-section">
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        placeholder="Buscar por modelo, toy_num, serie..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">
                        🔍 Buscar
                    </button>
                </form>

                <div className="filter-row">
                    <select
                        value={selectedSeries}
                        onChange={(e) => setSelectedSeries(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos los tipos</option>
                        {series.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos los años</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos los colores</option>
                        {colors.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>

                    <button onClick={handleClearFilters} className="clear-btn">
                        🔄 Limpiar
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}
            </div>

            {/* Resultados */}
            <div className="results-section">
                <div className="results-header">
                    <h2>Resultados ({pagination.total})</h2>
                    <div className="pagination-info">
                        Página {pagination.page} de {pagination.pages}
                    </div>
                </div>

                {loading ? (
                    <div className="loading">⏳ Cargando...</div>
                ) : items.length === 0 ? (
                    <div className="no-results">No hay items que coincidan con los filtros</div>
                ) : (
                    <>
                        <div className="items-grid">
                            {items.map((item) => (
                                <div
                                    key={item._id}
                                    className="item-card"
                                    onClick={() => navigate(`/catalog/items/${item._id}`)}
                                >
                                    {item.photo_url && (
                                        <div className="item-photo">
                                            <img
                                                src={getImageUrl(item.photo_url)}
                                                alt={item.carModel}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3C/svg%3E'
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="item-info">
                                        <h3>{item.carModel}</h3>
                                        <p className="toy-num">#{item.toy_num}</p>
                                        {item.series && <p className="series">{item.series}</p>}
                                        <div className="meta">
                                            {item.year && <span className="year">{item.year}</span>}
                                            {item.hwSeriesType && <span className="type">{item.hwSeriesType}</span>}
                                            {item.colorGroup && <span className="color">{item.colorGroup}</span>}
                                        </div>
                                    </div>
                                    <div className="item-action">➜</div>
                                </div>
                            ))}
                        </div>

                        {/* Paginación */}
                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => loadItems(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="page-btn"
                                >
                                    ← Anterior
                                </button>

                                <div className="page-numbers">
                                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => loadItems(p)}
                                            className={`page-num ${p === pagination.page ? 'active' : ''}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => loadItems(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="page-btn"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
