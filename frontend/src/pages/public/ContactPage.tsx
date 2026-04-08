import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail, MapPin, Phone } from 'lucide-react'
import PublicLayout from '@/components/public/PublicLayout'
import { publicService } from '@/services/public'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

type Lang = 'es' | 'en'

const content = {
    es: {
        title: 'Contacto',
        subtitle: 'Estamos para ayudarte con tu busqueda de autos a escala.',
        formTitle: 'Escribenos',
        infoTitle: 'Informacion',
        name: 'Nombre',
        email: 'Email',
        phone: 'Telefono (opcional)',
        subject: 'Asunto',
        message: 'Mensaje',
        privacy: 'Acepto el aviso de privacidad',
        submit: 'Enviar mensaje',
        success: 'Mensaje enviado correctamente',
        error: 'No se pudo enviar el mensaje',
        country: 'Mexico',
        privacyLink: 'Ver privacidad',
    },
    en: {
        title: 'Contact',
        subtitle: 'We are here to help with your collectible die-cast search.',
        formTitle: 'Send us a message',
        infoTitle: 'Info',
        name: 'Name',
        email: 'Email',
        phone: 'Phone (optional)',
        subject: 'Subject',
        message: 'Message',
        privacy: 'I accept the privacy policy',
        submit: 'Send message',
        success: 'Message sent successfully',
        error: 'Message could not be sent',
        country: 'Mexico',
        privacyLink: 'View privacy policy',
    },
}

export default function ContactPage() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'

    const [language, setLanguage] = useState<Lang>('es')
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        acceptedPrivacy: false,
    })

    const t = useMemo(() => content[language], [language])

    const pageBackdropClass = isDark
        ? 'bg-[radial-gradient(circle_at_15%_20%,rgba(14,116,144,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.14),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]'
        : 'bg-[radial-gradient(circle_at_10%_15%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_90%_5%,rgba(14,165,233,0.14),transparent_35%),linear-gradient(180deg,#f4f8ff_0%,#e9eff8_100%)]'

    const neumorphSurfaceClass = isDark
        ? 'bg-slate-800/85 border border-slate-700/70 shadow-[12px_12px_24px_rgba(2,6,23,0.55),-10px_-10px_22px_rgba(51,65,85,0.2)]'
        : 'bg-[#eaf0f8] border border-white/80 shadow-[12px_12px_24px_rgba(148,163,184,0.38),-12px_-12px_24px_rgba(255,255,255,0.96)]'

    const neumorphInsetClass = isDark
        ? 'bg-slate-900/70 border border-slate-700/70 shadow-[inset_5px_5px_10px_rgba(2,6,23,0.65),inset_-4px_-4px_10px_rgba(51,65,85,0.2)]'
        : 'bg-[#edf3fa] border border-white/90 shadow-[inset_5px_5px_10px_rgba(148,163,184,0.26),inset_-5px_-5px_10px_rgba(255,255,255,0.92)]'

    const pillClass = isDark
        ? 'bg-slate-800 text-slate-200 border border-slate-700/70 shadow-[7px_7px_14px_rgba(2,6,23,0.45),-6px_-6px_12px_rgba(51,65,85,0.2)] hover:brightness-110'
        : 'bg-[#eef3fa] text-slate-700 border border-white/85 shadow-[7px_7px_14px_rgba(148,163,184,0.3),-7px_-7px_14px_rgba(255,255,255,0.9)] hover:brightness-95'

    const pillActiveClass = isDark
        ? 'bg-primary-600 text-white border border-primary-500/70 shadow-[8px_8px_16px_rgba(2,6,23,0.5),-6px_-6px_12px_rgba(56,189,248,0.2)]'
        : 'bg-primary-500 text-white border border-primary-300 shadow-[8px_8px_16px_rgba(14,116,144,0.24),-6px_-6px_12px_rgba(255,255,255,0.7)]'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.acceptedPrivacy) {
            toast.error(language === 'es' ? 'Debes aceptar privacidad' : 'You must accept privacy policy')
            return
        }

        setSubmitting(true)
        try {
            await publicService.submitContactMessage({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                subject: form.subject.trim(),
                message: form.message.trim(),
                acceptedPrivacy: form.acceptedPrivacy,
                language,
            })
            toast.success(t.success)
            setForm({ name: '', email: '', phone: '', subject: '', message: '', acceptedPrivacy: false })
        } catch (_error) {
            toast.error(t.error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <PublicLayout>
            <div className={`relative rounded-3xl px-4 py-6 sm:px-6 sm:py-8 ${pageBackdropClass}`}>
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-end gap-2 mb-4">
                        <button type="button" onClick={() => setLanguage('es')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${language === 'es' ? pillActiveClass : pillClass}`}>ES</button>
                        <button type="button" onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${language === 'en' ? pillActiveClass : pillClass}`}>EN</button>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
                        <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <form onSubmit={handleSubmit} className={`lg:col-span-2 rounded-2xl p-5 space-y-4 ${neumorphSurfaceClass}`}>
                            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.formTitle}</h2>

                            <input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t.name} className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`} />
                            <input required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder={t.email} className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`} />
                            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder={t.phone} className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`} />
                            <input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder={t.subject} className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`} />
                            <textarea required rows={5} value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder={t.message} className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 ${neumorphInsetClass} ${isDark ? 'text-white' : 'text-slate-900'}`} />

                            <label className={`flex items-start gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={form.acceptedPrivacy}
                                    onChange={(e) => setForm((prev) => ({ ...prev, acceptedPrivacy: e.target.checked }))}
                                    className="mt-1"
                                />
                                <span>
                                    {t.privacy}{' '}
                                    <Link to="/privacidad" className="text-primary-500 underline">{t.privacyLink}</Link>
                                </span>
                            </label>

                            <button disabled={submitting} type="submit" className={`w-full px-4 py-3 rounded-xl font-semibold ${pillActiveClass}`}>
                                {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />...</span> : t.submit}
                            </button>
                        </form>

                        <aside className={`rounded-2xl p-5 space-y-4 ${neumorphSurfaceClass}`}>
                            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.infoTitle}</h2>

                            <div className={`p-4 rounded-xl ${neumorphInsetClass} ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                <p className="font-semibold mb-2">evstoremx</p>
                                <p className="inline-flex items-center gap-2 text-sm"><Mail size={14} /> josanmaes@gmail.com</p>
                                <p className="inline-flex items-center gap-2 text-sm"><MapPin size={14} /> {t.country}</p>
                                <p className="inline-flex items-center gap-2 text-sm"><Phone size={14} /> +52</p>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </PublicLayout>
    )
}
