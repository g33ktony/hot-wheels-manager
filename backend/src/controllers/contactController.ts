import { Request, Response } from 'express'
import nodemailer from 'nodemailer'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

const getTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      subject,
      message,
      phone,
      language,
      acceptedPrivacy,
    } = req.body || {}

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Nombre, email y mensaje son obligatorios' })
    }

    if (!acceptedPrivacy) {
      return res.status(400).json({ success: false, message: 'Debes aceptar el aviso de privacidad' })
    }

    const cleanName = String(name).trim()
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanSubject = String(subject || 'Nuevo mensaje de contacto').trim()
    const cleanMessage = String(message).trim()
    const cleanPhone = String(phone || '').trim()
    const cleanLanguage = String(language || 'es').trim().toLowerCase()

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Email invalido' })
    }

    if (cleanName.length < 2 || cleanName.length > 120) {
      return res.status(400).json({ success: false, message: 'El nombre debe tener entre 2 y 120 caracteres' })
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
      return res.status(400).json({ success: false, message: 'El mensaje debe tener entre 10 y 2000 caracteres' })
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Servicio de contacto no disponible temporalmente',
      })
    }

    const transporter = getTransporter()
    const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@evstoremx.com'
    const toEmail = process.env.CONTACT_TO_EMAIL || 'josanmaes@gmail.com'

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 12px">Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${cleanName}</p>
        <p><strong>Email:</strong> ${cleanEmail}</p>
        <p><strong>Telefono:</strong> ${cleanPhone || 'No proporcionado'}</p>
        <p><strong>Idioma:</strong> ${cleanLanguage}</p>
        <p><strong>Asunto:</strong> ${cleanSubject}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;">${cleanMessage}</div>
      </div>
    `

    await transporter.sendMail({
      from: `evstoremx Contacto <${fromEmail}>`,
      replyTo: cleanEmail,
      to: toEmail,
      subject: `[Contacto Web] ${cleanSubject}`,
      text: `Nombre: ${cleanName}\nEmail: ${cleanEmail}\nTelefono: ${cleanPhone || 'No proporcionado'}\nIdioma: ${cleanLanguage}\n\n${cleanMessage}`,
      html,
    })

    return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' })
  } catch (error) {
    console.error('Error submitting contact form:', error)
    return res.status(500).json({ success: false, message: 'No se pudo enviar el mensaje' })
  }
}
