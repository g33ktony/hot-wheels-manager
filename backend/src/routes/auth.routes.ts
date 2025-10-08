import express from 'express'
import { login, verifyToken, changePassword, register } from '../controllers/authController'

const router = express.Router()

// Rutas públicas (sin autenticación)
router.post('/login', login)
router.post('/register', register)

// Rutas protegidas (requieren autenticación)
router.get('/verify', verifyToken)
router.post('/change-password', changePassword)

export default router
