/**
 * Componente: Diálogo de Enriquecimiento de Catálogo
 * Muestra progreso en tiempo real del enriquecimiento con SSE
 */

import React, { useEffect } from 'react'
import { useCatalogEnrichment } from '../hooks/useCatalogEnrichment'
import './CatalogEnrichmentDialog.css'

interface CatalogEnrichmentDialogProps {
    isOpen: boolean
    onClose: () => void
    onComplete?: () => void
}

export const CatalogEnrichmentDialog: React.FC<CatalogEnrichmentDialogProps> = ({
    isOpen,
    onClose,
    onComplete,
}) => {
    const { progress, isLoading, error, startEnrichment, cancelEnrichment, isComplete } =
        useCatalogEnrichment()

    useEffect(() => {
        if (isOpen && !isLoading && !progress) {
            startEnrichment()
        }
    }, [isOpen, isLoading, progress, startEnrichment])

    useEffect(() => {
        if (isComplete && onComplete) {
            onComplete()
        }
    }, [isComplete, onComplete])

    if (!isOpen) return null

    const getStepIcon = (step: string) => {
        switch (step) {
            case 'loading':
                return '📥'
            case 'classifying':
                return '🔍'
            case 'normalizing':
                return '🎨'
            case 'validating-photos':
                return '📸'
            case 'enriching':
                return '✨'
            case 'syncing':
                return '💾'
            case 'complete':
                return '✅'
            case 'error':
                return '❌'
            default:
                return '⏳'
        }
    }

    return (
        <div className="modal-overlay">
            <div className="enrichment-dialog">
                <div className="dialog-header">
                    <h2>🛠️ Actualizar Catálogo Maestro</h2>
                    {!isComplete && (
                        <button className="close-btn" onClick={cancelEnrichment} disabled={!isLoading}>
                            ✕
                        </button>
                    )}
                </div>

                <div className="dialog-content">
                    {/* Progress Bar */}
                    <div className="progress-section">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress?.percent || 0}%` }}
                            ></div>
                        </div>
                        <div className="progress-text">
                            {progress?.percent || 0}%
                            {progress && progress.processedItems && progress.totalItems && (
                                <span className="progress-items">
                                    ({progress.processedItems} / {progress.totalItems})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Current Step */}
                    {progress && (
                        <div className="current-step">
                            <span className="step-icon">{getStepIcon(progress.step)}</span>
                            <div className="step-details">
                                <p className="step-message">{progress.message}</p>
                                {progress.currentBrand && (
                                    <p className="step-brand">Procesando: {progress.currentBrand}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Statistics */}
                    {progress?.stats && (
                        <div className="stats-section">
                            <h3>📊 Estadísticas</h3>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-label">Foto Principal</span>
                                    <span className="stat-value">{progress.stats.itemsWithMainPhoto}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Foto Carded</span>
                                    <span className="stat-value">{progress.stats.itemsWithCardedPhoto}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Galerías</span>
                                    <span className="stat-value">{progress.stats.itemsWithGallery}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Colores</span>
                                    <span className="stat-value">{progress.stats.colorsNormalized}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-section">
                            <p className="error-text">{error}</p>
                        </div>
                    )}

                    {/* Complete Message */}
                    {isComplete && !error && (
                        <div className="complete-section">
                            <p className="success-text">✅ ¡Catálogo actualizado correctamente!</p>
                            {progress?.stats && (
                                <div className="final-stats">
                                    <p>
                                        Se procesaron <strong>{progress.stats.itemsClassified || 0}</strong> items
                                    </p>
                                    <p>
                                        Cobertura de foto principal:{' '}
                                        <strong>
                                            {progress.stats.itemsWithMainPhoto
                                                ? Math.round(
                                                    (progress.stats.itemsWithMainPhoto / progress.totalItems) * 100
                                                )
                                                : 0}
                                            %
                                        </strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="dialog-footer">
                    {isLoading ? (
                        <>
                            <button className="btn btn-secondary" onClick={cancelEnrichment}>
                                Cancelar
                            </button>
                        </>
                    ) : (
                        <>
                            {isComplete || error ? (
                                <button className="btn btn-primary" onClick={onClose}>
                                    Cerrar
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={startEnrichment}>
                                    Reintentar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CatalogEnrichmentDialog
