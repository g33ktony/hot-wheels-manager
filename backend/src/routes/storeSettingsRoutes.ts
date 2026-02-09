import { Router } from 'express'
import * as storeSettingsController from '../controllers/storeSettingsController'

const router = Router()

// GET /api/store-settings - Get store settings
router.get('/', storeSettingsController.getStoreSettings)

// PUT /api/store-settings - Update store settings
router.put('/', storeSettingsController.updateStoreSettings)

// PUT /api/store-settings/logo - Update store logo
router.put('/logo', storeSettingsController.updateStoreLogo)

// POST /api/store-settings/messages - Add custom message
router.post('/messages', storeSettingsController.addCustomMessage)

// DELETE /api/store-settings/messages/:index - Delete custom message
router.delete('/messages/:index', storeSettingsController.deleteCustomMessage)

export default router
