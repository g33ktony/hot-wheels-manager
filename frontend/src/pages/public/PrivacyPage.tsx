import { useMemo, useState } from 'react'
import PublicLayout from '@/components/public/PublicLayout'
import { useTheme } from '@/contexts/ThemeContext'

type Lang = 'es' | 'en'

const content = {
    es: {
        title: 'Privacidad',
        subtitle: 'Resumen breve de como tratamos tus datos.',
        sections: [
            {
                title: '1. Datos que recopilamos',
                body: 'Podemos recopilar nombre, email, telefono opcional y contenido de mensajes enviados desde el formulario de contacto.',
            },
            {
                title: '2. Para que usamos tus datos',
                body: 'Usamos tu informacion para responder consultas, soporte y mejora del servicio. No vendemos datos personales.',
            },
            {
                title: '3. Conservacion y seguridad',
                body: 'Aplicamos medidas razonables de seguridad y conservamos la informacion solo el tiempo necesario para atencion y seguimiento.',
            },
            {
                title: '4. Tus derechos',
                body: 'Puedes solicitar acceso, correccion o eliminacion de tus datos escribiendo a josanmaes@gmail.com.',
            },
            {
                title: '5. Contacto legal',
                body: 'Responsable: evstoremx. Pais: Mexico. Email: josanmaes@gmail.com.',
            },
        ],
        updated: 'Ultima actualizacion',
    },
    en: {
        title: 'Privacy',
        subtitle: 'Short summary of how we handle your data.',
        sections: [
            {
                title: '1. Data we collect',
                body: 'We may collect name, email, optional phone, and message content submitted through the contact form.',
            },
            {
                title: '2. How we use data',
                body: 'We use your data to reply to inquiries, provide support, and improve the service. We do not sell personal data.',
            },
            {
                title: '3. Retention and security',
                body: 'We apply reasonable security measures and retain information only as needed for support and follow-up.',
            },
            {
                title: '4. Your rights',
                body: 'You can request access, correction, or deletion of your data by emailing josanmaes@gmail.com.',
            },
            {
                title: '5. Legal contact',
                body: 'Controller: evstoremx. Country: Mexico. Email: josanmaes@gmail.com.',
            },
        ],
        updated: 'Last updated',
    },
}

export default function PrivacyPage() {
    const { mode } = useTheme()
    const isDark = mode === 'dark'
    const [language, setLanguage] = useState<Lang>('es')
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

    return (
        <PublicLayout>
            <div className={`relative rounded-3xl px-4 py-6 sm:px-6 sm:py-8 ${pageBackdropClass}`}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-end gap-2 mb-4">
                        <button type="button" onClick={() => setLanguage('es')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${language === 'es' ? pillActiveClass : pillClass}`}>ES</button>
                        <button type="button" onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${language === 'en' ? pillActiveClass : pillClass}`}>EN</button>
                    </div>

                    <div className={`rounded-2xl p-6 ${neumorphSurfaceClass}`}>
                        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
                        <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'} mb-6`}>{t.subtitle}</p>

                        <div className="space-y-4">
                            {t.sections.map((section) => (
                                <section key={section.title} className={`rounded-xl p-4 ${neumorphInsetClass}`}>
                                    <h2 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{section.title}</h2>
                                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{section.body}</p>
                                </section>
                            ))}
                        </div>

                        <p className={`text-xs mt-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {t.updated}: 8 de abril de 2026
                        </p>
                    </div>
                </div>
            </div>
        </PublicLayout>
    )
}
