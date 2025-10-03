import express from 'express'
import { login, verifyToken, changePassword } from '../controllers/authController'

const router = express.Router()

// Login
router.post('/login', login)

// Verificar token (mantener sesión)
router.get('/verify', verifyToken)

// Cambiar contraseña
router.post('/change-password', changePassword)

export default router
