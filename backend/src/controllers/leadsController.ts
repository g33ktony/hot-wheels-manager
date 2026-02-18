import { Request, Response } from 'express'
import Lead, { ILead } from '../models/Lead'
import { createStoreFilter } from '../utils/storeAccess'

// Get all leads with filtering and pagination
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit

    // Extract filter parameters
    const searchTerm = req.query.search as string
    const filterEstado = req.query.estado as string
    const filterContactStatus = req.query.contactStatus as string
    const filterRequestType = req.query.requestType as string // 'availability' | 'notify'

    // Build query
    const query: any = {}

    // Estado filter
    if (filterEstado && filterEstado.length > 0) {
      query.estado = filterEstado
    }

    // Contact status filter
    if (filterContactStatus && filterContactStatus.length > 0) {
      query.contactStatus = filterContactStatus
    }

    // Request type filter (interested in specific items)
    if (filterRequestType && filterRequestType.length > 0) {
      query['interestedInItem.requestType'] = filterRequestType
    }

    // Search term (name or email)
    if (searchTerm && searchTerm.length > 0) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { municipio: { $regex: searchTerm, $options: 'i' } }
      ]
    }

    // Get leads with pagination
    const storeFilter = createStoreFilter(req.storeId!, req.userRole!)
    const leads = await Lead.find({ ...query, ...storeFilter })
      .sort({ registeredAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean()

    // Get total count for pagination
    const total = await Lead.countDocuments({ ...query, ...storeFilter })

    res.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener leads'
    })
  }
}

// Get lead statistics
export const getLeadStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Total leads
    const totalLeads = await Lead.countDocuments()

    // Leads by contact status
    const statusStats = await Lead.aggregate([
      {
        $group: {
          _id: '$contactStatus',
          count: { $sum: 1 }
        }
      }
    ])

    // Leads by estado (top 5)
    const estadoStats = await Lead.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    // Leads with interested items
    const withInterestedItem = await Lead.countDocuments({
      'interestedInItem.catalogId': { $exists: true, $ne: null }
    })

    // Leads requesting notifications for out-of-stock items
    const notifyRequests = await Lead.countDocuments({
      'interestedInItem.requestType': 'notify'
    })

    // Recent leads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentLeads = await Lead.countDocuments({
      registeredAt: { $gte: sevenDaysAgo }
    })

    res.json({
      success: true,
      data: {
        totalLeads,
        statusBreakdown: statusStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count
          return acc
        }, {}),
        topEstados: estadoStats,
        withInterestedItem,
        notifyRequests,
        recentLeads
      }
    })
  } catch (error) {
    console.error('Error fetching lead statistics:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de leads'
    })
  }
}

// Get single lead by ID
export const getLeadById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const lead = await Lead.findById(id).lean()

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      })
      return
    }

    // Check ownership: sys_admin can view any store, others only own store
    if (req.userRole !== 'sys_admin' && (lead as any).storeId !== req.storeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      })
      return
    }

    res.json({
      success: true,
      data: lead
    })
  } catch (error) {
    console.error('Error fetching lead:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener lead'
    })
  }
}

// Update lead contact status and notes
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { contactStatus, notes } = req.body

    // Get the lead first to check ownership
    const lead = await Lead.findById(id).lean()
    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      })
      return
    }

    // Check ownership: user can only edit their own store's leads
    if ((lead as any).storeId !== req.storeId) {
      res.status(403).json({
        success: false,
        message: 'You can only edit leads from your own store'
      })
      return
    }

    const updateData: any = {}

    if (contactStatus) {
      updateData.contactStatus = contactStatus
      if (contactStatus === 'contacted') {
        updateData.lastContactedAt = new Date()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean()

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      })
      return
    }

    res.json({
      success: true,
      data: updatedLead,
      message: 'Lead actualizado correctamente'
    })
  } catch (error) {
    console.error('Error updating lead:', error)
    res.status(500).json({
      success: false,
      message: 'Error al actualizar lead'
    })
  }
}

// Delete lead
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const lead = await Lead.findById(id).lean()

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      })
      return
    }

    // Check ownership: user can only delete their own store's leads
    if ((lead as any).storeId !== req.storeId) {
      res.status(403).json({
        success: false,
        message: 'You can only delete leads from your own store'
      })
      return
    }

    await Lead.findByIdAndDelete(id)

    res.json({
      success: true,
      message: 'Lead eliminado correctamente'
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    res.status(500).json({
      success: false,
      message: 'Error al eliminar lead'
    })
  }
}

// Export leads to CSV
export const exportLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all leads (or apply filters from query)
    const filterEstado = req.query.estado as string
    const filterContactStatus = req.query.contactStatus as string

    const query: any = {}
    if (filterEstado) query.estado = filterEstado
    if (filterContactStatus) query.contactStatus = filterContactStatus

    const leads = await Lead.find(query).sort({ registeredAt: -1 }).lean()

    // Create CSV content
    const csvHeaders = [
      'Nombre',
      'Email',
      'Teléfono',
      'Estado',
      'Municipio',
      'Status de Contacto',
      'Fecha de Registro',
      'Item de Interés',
      'Tipo de Solicitud',
      'Mensaje',
      'Notas'
    ].join(',')

    const csvRows = leads.map(lead => {
      return [
        `"${lead.name}"`,
        `"${lead.email}"`,
        `"${lead.phone || ''}"`,
        `"${lead.estado}"`,
        `"${lead.municipio}"`,
        `"${lead.contactStatus}"`,
        `"${new Date(lead.registeredAt).toLocaleDateString('es-MX')}"`,
        `"${lead.interestedInItem?.carModel || ''}"`,
        `"${lead.interestedInItem?.requestType || ''}"`,
        `"${lead.message || ''}"`,
        `"${lead.notes || ''}"`
      ].join(',')
    })

    const csv = [csvHeaders, ...csvRows].join('\n')

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`)

    // Add BOM for Excel compatibility with UTF-8
    res.write('\ufeff')
    res.write(csv)
    res.end()
  } catch (error) {
    console.error('Error exporting leads:', error)
    res.status(500).json({
      success: false,
      message: 'Error al exportar leads'
    })
  }
}
