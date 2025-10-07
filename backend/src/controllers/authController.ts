import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/User'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'
const JWT_EXPIRES_IN = '1d' // Token válido por 1 día

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    // Buscar usuario
    const user = await UserModel.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Actualizar último login
    user.lastLogin = new Date()
    await user.save()

    // Generar token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // DEBUG: Log token info
    const decoded = jwt.decode(token) as any
    console.log('🔐 TOKEN GENERADO:')
    console.log('  - Expira en:', JWT_EXPIRES_IN)
    console.log('  - iat (issued at):', new Date(decoded.iat * 1000).toISOString())
    console.log('  - exp (expires at):', new Date(decoded.exp * 1000).toISOString())
    console.log('  - Tiempo hasta expiración:', Math.floor((decoded.exp - decoded.iat) / 3600), 'horas')

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Error during login'
    })
  }
}

// Verificar token (para mantener sesión)
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    console.log('🔍 VERIFICANDO TOKEN:')
    console.log('  - Token recibido:', token.substring(0, 20) + '...')
    
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
      iat: number
      exp: number
    }

    console.log('  - Token válido')
    console.log('  - Usuario:', decoded.email)
    console.log('  - Emitido:', new Date(decoded.iat * 1000).toISOString())
    console.log('  - Expira:', new Date(decoded.exp * 1000).toISOString())
    console.log('  - Tiempo restante:', Math.floor((decoded.exp - Date.now() / 1000) / 3600), 'horas')

    // Buscar usuario
    const user = await UserModel.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('❌ ERROR VERIFICANDO TOKEN:')
    if (error instanceof jwt.TokenExpiredError) {
      console.error('  - Token expirado')
      console.error('  - Expiró en:', error.expiredAt)
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('  - Error JWT:', error.message)
    } else {
      console.error('  - Error desconocido:', error)
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    })
  }
}

// Cambiar contraseña
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const user = await UserModel.findById(decoded.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    })
  }
}
