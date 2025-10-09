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

    // Verificar estado del usuario
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin authorization.'
      })
    }

    if (user.status === 'inactive' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.'
      })
    }

    // Verificar suscripción (solo para usuarios no-admin)
    if (user.role !== 'admin' && user.subscriptionEndDate) {
      if (new Date() > user.subscriptionEndDate) {
        return res.status(403).json({
          success: false,
          message: 'Your subscription has expired. Please renew to continue.'
        })
      }
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

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          businessName: user.businessName,
          subscriptionEndDate: user.subscriptionEndDate
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

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
      iat: number
      exp: number
    }

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

// Register - Public endpoint for new users
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName } = req.body

    // Validar campos requeridos
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and name are required'
      })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      })
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      })
    }

    // Verificar si el email ya existe
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario con estado 'pending'
    const newUser = new UserModel({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      businessName: businessName || undefined,
      role: 'user',
      status: 'pending' // Requiere aprobación del admin
    })

    await newUser.save()

    console.log('✅ New user registered:', {
      email: newUser.email,
      name: newUser.name,
      status: newUser.status
    })

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          businessName: newUser.businessName,
          status: newUser.status
        }
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Error during registration'
    })
  }
}
