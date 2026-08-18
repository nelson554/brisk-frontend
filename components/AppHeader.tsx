'use client'

import { useRouter } from 'next/navigation'
import { LogOut, ChevronLeft, LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/**
 * Cabeçalho em gradiente usado nas telas "hub" (Dashboard, Cadastros, Comercial).
 * Se `backHref` for informado, mostra um botão de voltar ao lado do "Sair".
 */
export function HubHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  showSignOut = true,
}: {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  showSignOut?: boolean
}) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header
      style={{
        background: 'linear-gradient(160deg, #074F71 0%, #1A658F 55%, #05A9C7 100%)',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'rgba(5,195,221,0.1)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, right: 100, width: 130, height: 130, borderRadius: '50%', background: 'rgba(5,195,221,0.07)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', fontFamily: SYSTEM_FONT }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '8px 18px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-brisk.png" alt="Brisk Logistics" style={{ height: 40, objectFit: 'contain', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.3 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{subtitle}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {backHref && (
            <button
              onClick={() => router.push(backHref)}
              style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 500 }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} /> {backLabel}
            </button>
          )}
          {showSignOut && (
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 500 }}
            >
              <LogOut style={{ width: 14, height: 14 }} /> Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Cabeçalho azul compacto e fixo usado nas telas internas (listas, cadastros, detalhes).
 * Só tem o botão de voltar para a tela "hub" pai — mesmo padrão do Brisk Connect.
 */
export function PageHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const router = useRouter()
  return (
    <header
      style={{
        height: 52,
        background: '#003DA6',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <button
        onClick={() => router.push(backHref)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 500, fontFamily: SYSTEM_FONT, padding: '4px 0' }}
      >
        <ChevronLeft style={{ width: 20, height: 20 }} />
        {backLabel}
      </button>
    </header>
  )
}

export type ModuleItem = {
  key: string
  label: string
  description?: string
  icon: LucideIcon
  color: string
  href: string
}

/** Grade de cards coloridos (ícone + título + descrição) usada nas telas hub. */
export function ModuleGrid({ modules }: { modules: ModuleItem[] }) {
  const router = useRouter()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
      {modules.map(m => (
        <button
          key={m.key}
          onClick={() => router.push(m.href)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
            background: '#fff', border: 'none', borderRadius: 20, padding: 20, cursor: 'pointer',
            textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s',
            fontFamily: SYSTEM_FONT,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 16, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${m.color}66` }}>
            <m.icon style={{ width: 26, height: 26, color: '#fff', strokeWidth: 1.8 }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>{m.label}</p>
            {m.description && <p style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.4 }}>{m.description}</p>}
          </div>
        </button>
      ))}
    </div>
  )
}
