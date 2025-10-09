import express from 'express'
import { login, verifyToken, changePassword, register } from '../controllers/authController'

const router = express.Router()

// Rutas públicas (sin autenticación)
router.post('/login', login)
router.post('/register', register)
router.get('/verify', verifyToken) // Este endpoint verifica el token enviado en el header

// Rutas protegidas (requieren autenticación)
router.post('/change-password', changePassword)

export default router
