import express from 'express'
import { login, verifyToken, changePassword, signup } from '../controllers/authController'

const router = express.Router()

// Login
router.post('/login', login)

// Sign up - Registro público (sin autenticación)
router.post('/signup', signup)

// Verificar token (mantener sesión)
router.get('/verify', verifyToken)

// Cambiar contraseña
router.patch('/change-password', changePassword)

export default router
