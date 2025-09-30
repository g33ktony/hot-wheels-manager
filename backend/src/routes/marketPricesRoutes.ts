import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Market prices routes - Coming soon' })
})

export default router
