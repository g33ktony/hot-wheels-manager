import { Request, Response } from 'express'
import facebookService from '../services/facebookService'
import { InventoryItemModel, IInventoryItem } from '../models/InventoryItem'

/**
 * Controller for Facebook publishing operations
 */
export class FacebookController {
    /**
     * Publish selected inventory items to Facebook
     */
    async publishToFacebook(req: Request, res: Response) {
        try {
            const { itemIds, message, includePrice = true } = req.body

            // Validate input
            if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere al menos un item para publicar'
                })
            }

            if (!message || message.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un mensaje para la publicación'
                })
            }

            // Get Facebook credentials from environment
            const pageId = process.env.FACEBOOK_PAGE_ID
            const accessToken = process.env.FACEBOOK_ACCESS_TOKEN

            if (!pageId || !accessToken) {
                return res.status(500).json({
                    success: false,
                    message: 'Configuración de Facebook no encontrada. Contacta al administrador.'
                })
            }

            // Fetch items from database
            const items = await InventoryItemModel.find({
                _id: { $in: itemIds }
            }).populate('hotWheelsCar')

            if (items.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron items para publicar'
                })
            }

            // Build post message
            let postMessage = message.trim() + '\n\n'

            // Add items info
            items.forEach((item: IInventoryItem, index: number) => {
                const carName = item.hotWheelsCar?.model || item.carId || 'Hot Wheels'
                const series = item.hotWheelsCar?.series || ''
                const year = item.hotWheelsCar?.year || ''
                
                postMessage += `${index + 1}. ${carName}`
                if (series) postMessage += ` - ${series}`
                if (year) postMessage += ` (${year})`
                
                // Add condition
                const conditionMap: Record<string, string> = {
                    mint: 'Mint',
                    good: 'Bueno',
                    fair: 'Regular',
                    poor: 'Malo'
                }
                postMessage += ` | ${conditionMap[item.condition] || item.condition}`
                
                // Add price if requested
                if (includePrice) {
                    postMessage += ` | $${item.suggestedPrice.toFixed(2)}`
                }
                
                // Add special badges
                const badges: string[] = []
                if (item.isSuperTreasureHunt) badges.push('$TH')
                else if (item.isTreasureHunt) badges.push('TH')
                if (item.isChase) badges.push('CHASE')
                if (badges.length > 0) {
                    postMessage += ` ${badges.join(' ')}`
                }
                
                postMessage += '\n'
            })

            postMessage += '\n📱 Envíame mensaje para más información'

            // Get image URLs (first photo of each item)
            const imageUrls = items
                .filter((item: IInventoryItem) => item.photos && item.photos.length > 0)
                .map((item: IInventoryItem) => item.photos![0])

            if (imageUrls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Ninguno de los items seleccionados tiene fotos'
                })
            }

            // Publish to Facebook
            const result = await facebookService.publishPost({
                message: postMessage,
                imageUrls,
                pageId,
                accessToken
            })

            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: 'Publicación exitosa en Facebook',
                    postId: result.postId,
                    itemsPublished: items.length
                })
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Error al publicar en Facebook',
                    error: result.error
                })
            }

        } catch (error: any) {
            console.error('Error in publishToFacebook:', error)
            return res.status(500).json({
                success: false,
                message: 'Error al procesar la publicación',
                error: error.message
            })
        }
    }

    /**
     * Verify Facebook configuration
     */
    async verifyConfiguration(req: Request, res: Response) {
        try {
            const pageId = process.env.FACEBOOK_PAGE_ID
            const accessToken = process.env.FACEBOOK_ACCESS_TOKEN

            if (!pageId || !accessToken) {
                return res.status(200).json({
                    configured: false,
                    message: 'Facebook no está configurado'
                })
            }

            // Verify token is valid
            const isValid = await facebookService.verifyAccessToken(accessToken)
            
            if (!isValid) {
                return res.status(200).json({
                    configured: false,
                    message: 'Token de acceso inválido'
                })
            }

            // Get page info
            const pageInfo = await facebookService.getPageInfo(pageId, accessToken)

            return res.status(200).json({
                configured: true,
                page: pageInfo
            })

        } catch (error: any) {
            console.error('Error in verifyConfiguration:', error)
            return res.status(500).json({
                configured: false,
                message: 'Error al verificar configuración',
                error: error.message
            })
        }
    }
}

export default new FacebookController()
