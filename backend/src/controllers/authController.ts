import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/User'
import Store from '../models/Store'

const JWT_EXPIRES_IN = '1d' // Token válido por 1 día

// Helper to get JWT_SECRET safely
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET
  // En producción, JWT_SECRET DEBE estar configurado
  // En desarrollo, usamos un fallback seguro
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production!')
    }
    console.warn('⚠️  JWT_SECRET not configured, using development fallback')
    return 'your-secret-key-change-this-in-development'
  }
  return secret
}

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const JWT_SECRET = getJWTSecret()
    
    const { email, password } = req.body

    // DEBUG: Log datos recibidos
    console.log('🔐 LOGIN ATTEMPT:')
    console.log('  - Email recibido:', email)
    console.log('  - Password recibido (length):', password?.length || 0)
    console.log('  - Email type:', typeof email)
    console.log('  - Password type:', typeof password)

    // Validar campos
    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password')
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    // Buscar usuario
    const emailLower = email.toLowerCase().trim()
    console.log('  - Buscando email:', emailLower)
    const user = await UserModel.findOne({ email: emailLower })

    if (!user) {
      console.log('❌ Login failed: User not found for email:', emailLower)
      // Verificar todos los emails en la BD para debug
      const allUsers = await UserModel.find({}).select('email')
      console.log('  - Emails en BD:', allUsers.map(u => u.email))
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    console.log('✅ User found:', user.email)
    console.log('  - User ID:', user._id)
    console.log('  - User status:', (user as any).status || 'not set')
    console.log('  - Password hash (first 20):', user.password.substring(0, 20))

    // Verificar que usuario esté aprobado
    if ((user as any).status && (user as any).status !== 'approved') {
      console.log('❌ Login failed: User not approved. Status:', (user as any).status)
      return res.status(403).json({
        success: false,
        message: (user as any).status === 'pending' 
          ? 'Tu cuenta está pendiente de aprobación por el administrador'
          : 'Tu cuenta ha sido rechazada'
      })
    }

    // Verificar contraseña
    console.log('  - Comparing passwords...')
    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('  - Password valid:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('❌ Login failed: Invalid password')
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Actualizar último login (usar update en lugar de save para evitar problemas de validación)
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    )

    // If sys_admin, ensure they have their system store and sync storeId
    if (user.role === 'sys_admin') {
      try {
        let sysAdminStore = await Store.findOne({ storeAdminId: user.email })
        
        if (!sysAdminStore) {
          // Create sys_admin's personal store if it doesn't exist
          sysAdminStore = new Store({
            name: 'Tienda de Coleccionables - Sistema',
            description: 'Tienda personal del administrador del sistema',
            storeAdminId: user.email
          })
          await sysAdminStore.save()
          console.log(`✅ Created sys_admin store during login: ${sysAdminStore._id}`)
        }
        
        // Update user's storeId to match the store's _id if different
        if (user.storeId !== sysAdminStore._id.toString()) {
          await UserModel.updateOne(
            { _id: user._id },
            { storeId: sysAdminStore._id.toString() }
          )
          console.log(`✅ Synced sys_admin storeId to: ${sysAdminStore._id}`)
          // Update the user object so we use the correct storeId in the token
          user.storeId = sysAdminStore._id.toString()
        }
      } catch (error) {
        console.error('Error ensuring sys_admin store during login:', error)
        // Continue anyway, don't block login
      }
    }

    // Generar token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        storeId: user.storeId
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

    console.log('✅ Login successful for:', user.email)

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
          storeId: user.storeId
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
    const JWT_SECRET = getJWTSecret()
    
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
    const JWT_SECRET = getJWTSecret()
    
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
    
    // Usar updateOne para evitar problemas de validación
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    )

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

// Sign up - Registro público (usuario pendiente de aprobación)
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, storeId } = req.body

    // Validar campos
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password y nombre son requeridos'
      })
    }

    // Validar formato de email
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      })
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      })
    }

    // Verificar si el usuario ya existe
    const existingUser = await UserModel.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Este email ya está registrado'
      })
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear nuevo usuario con estado 'pending'
    // El storeId será generado si no se proporciona, o usar uno existente
    const finalStoreId = storeId || email.split('@')[0] // email prefix como store ID
    
    const newUser = new UserModel({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      phone: phone?.trim(),
      storeId: finalStoreId,
      role: 'admin', // Default role para nuevos usuarios
      status: 'pending', // Requiere aprobación
      createdAt: new Date()
    })

    const savedUser = await newUser.save()

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Tu cuenta está pendiente de aprobación del administrador.',
      data: {
        user: {
          id: savedUser._id,
          email: savedUser.email,
          name: savedUser.name,
          storeId: savedUser.storeId,
          status: savedUser.status
        }
      }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Este email ya está registrado'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Error durante el registro'
    })
  }
}
