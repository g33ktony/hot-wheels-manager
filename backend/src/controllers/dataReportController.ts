import { Request, Response } from 'express'
import DataReport from '../models/DataReport'

// ===== PUBLIC =====

// POST /api/public/reports - Submit a data report (no auth)
export const createDataReport = async (req: Request, res: Response) => {
  try {
    const { catalogItemId, carModel, series, year, reportType, note } = req.body

    if (!catalogItemId || !carModel || !reportType) {
      return res.status(400).json({ error: 'catalogItemId, carModel y reportType son requeridos' })
    }

    const validTypes = ['error_info', 'missing_photo', 'wrong_photo', 'other']
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido' })
    }

    const report = new DataReport({
      catalogItemId,
      carModel,
      series: series || '',
      year: year || '',
      reportType,
      note: note?.substring(0, 500) || '',
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent')
      }
    })

    await report.save()

    res.status(201).json({ message: 'Reporte enviado correctamente', reportId: report._id })
  } catch (error) {
    console.error('Error creating data report:', error)
    res.status(500).json({ error: 'Error al enviar el reporte' })
  }
}

// ===== ADMIN =====

// GET /api/data-reports - Get all reports (admin, with filters)
export const getDataReports = async (req: Request, res: Response) => {
  try {
    const { status, reportType, page = 1, limit = 20 } = req.query

    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (reportType) filter.reportType = reportType

    const skip = (Number(page) - 1) * Number(limit)

    const [reports, total] = await Promise.all([
      DataReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DataReport.countDocuments(filter)
    ])

    // Count by status for summary
    const [pendingCount, reviewedCount, resolvedCount] = await Promise.all([
      DataReport.countDocuments({ status: 'pending' }),
      DataReport.countDocuments({ status: 'reviewed' }),
      DataReport.countDocuments({ status: 'resolved' })
    ])

    res.json({
      reports,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        pending: pendingCount,
        reviewed: reviewedCount,
        resolved: resolvedCount
      }
    })
  } catch (error) {
    console.error('Error fetching data reports:', error)
    res.status(500).json({ error: 'Error al obtener reportes' })
  }
}

// PUT /api/data-reports/:id - Update report status (admin)
export const updateDataReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, adminNotes } = req.body

    const update: Record<string, unknown> = {}
    if (status) {
      const validStatuses = ['pending', 'reviewed', 'resolved']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' })
      }
      update.status = status
      if (status === 'reviewed' || status === 'resolved') {
        update.reviewedAt = new Date()
      }
    }
    if (adminNotes !== undefined) {
      update.adminNotes = adminNotes
    }

    const report = await DataReport.findByIdAndUpdate(id, update, { new: true })
    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' })
    }

    res.json(report)
  } catch (error) {
    console.error('Error updating data report:', error)
    res.status(500).json({ error: 'Error al actualizar reporte' })
  }
}

// DELETE /api/data-reports/:id - Delete a report (admin)
export const deleteDataReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const report = await DataReport.findByIdAndDelete(id)
    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' })
    }

    res.json({ message: 'Reporte eliminado' })
  } catch (error) {
    console.error('Error deleting data report:', error)
    res.status(500).json({ error: 'Error al eliminar reporte' })
  }
}
