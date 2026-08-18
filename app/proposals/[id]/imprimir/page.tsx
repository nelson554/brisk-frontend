'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function fmtMoney(v: number, symbol = '') {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${symbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim()
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function ProposalPrintPage() {
  const params = useParams()
  const proposalId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [proposal, setProposal] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [terms, setTerms] = useState<{ title: string; body: string } | null>(null)

  useEffect(() => {
    if (proposalId) load()
  }, [proposalId])

  async function load() {
    setLoading(true)
    setLoadError('')

    const { data: prop, error: propError } = await supabase
      .from('proposals')
      .select(`
        *,
        client:clients!proposals_client_id_fkey(nickname, company_name, address_street, address_number, address_district, address_city, address_state, email, phone),
        incoterm:incoterms(code, name),
        shipment_type:shipment_types(label_pt)
      `)
      .eq('id', proposalId)
      .single()

    if (propError) {
      console.error('Erro ao carregar proposta para impressão:', propError)
      setLoadError(propError.message)
      setLoading(false)
      return
    }
    setProposal(prop)

    // Termos e Condições: usa texto específico da proposta se houver,
    // senão busca o modelo fixo pelo idioma da proposta (padrão 'pt')
    if (prop?.terms_text && prop.terms_text.trim() !== '') {
      setTerms({ title: prop.language === 'en' ? 'Terms and Conditions' : 'Termos e Condições', body: prop.terms_text })
    } else {
      const { data: termsRow, error: termsError } = await supabase
        .from('proposal_terms')
        .select('title, body')
        .eq('language', prop?.language || 'pt')
        .maybeSingle()

      if (termsError) {
        console.error('Erro ao carregar termos e condições:', termsError)
      } else if (termsRow) {
        setTerms(termsRow)
      }
    }

    const { data: prods, error: prodsError } = await supabase
      .from('proposal_products')
      .select(`
        *,
        incoterms(code, name),
        operation_types(label_pt),
        cargo_types(label_pt),
        proposal_routes(
          *,
          origin:ports_airports!proposal_routes_origin_id_fkey(name, un_locode, iata_code),
          destination:ports_airports!proposal_routes_destination_id_fkey(name, un_locode, iata_code),
          currencies(code, symbol),
          proposal_freight_items(
            *,
            equipment_types(label_pt),
            billing_units(label_pt)
          )
        ),
        proposal_expenses(
          *,
          chart_of_accounts(description_pt),
          currencies(code, symbol)
        )
      `)
      .eq('proposal_id', proposalId)
      .eq('is_active', true)
      .order('created_at')

    if (prodsError) console.error('Erro ao carregar produtos da proposta para impressão:', prodsError)
    setProducts(prods || [])

    setLoading(false)
  }

  function formatAddress(c: any) {
    if (!c) return ''
    const line1 = [c.address_street, c.address_number].filter(Boolean).join(', ')
    const line2 = [c.address_district, c.address_city, c.address_state].filter(Boolean).join(' - ')
    return [line1, line2].filter(Boolean).join(' · ')
  }

  // totais por moeda, somente lado de venda (documento é para o cliente)
  const totals: Record<string, { code: string; symbol: string; sale: number }> = {}
  products.forEach((product: any) => {
    ;(product.proposal_routes || []).filter((r: any) => r.is_active).forEach((route: any) => {
      ;(route.proposal_freight_items || []).filter((f: any) => f.is_active).forEach((item: any) => {
        const qty = Number(item.quantity) || 0
        const key = route.currencies?.code || 'N/D'
        if (!totals[key]) totals[key] = { code: key, symbol: route.currencies?.symbol || '', sale: 0 }
        totals[key].sale += (Number(item.sale_rate) || 0) * qty
      })
    })
    ;(product.proposal_expenses || []).filter((x: any) => x.is_active).forEach((exp: any) => {
      const key = exp.currencies?.code || 'N/D'
      if (!totals[key]) totals[key] = { code: key, symbol: exp.currencies?.symbol || '', sale: 0 }
      totals[key].sale += Number(exp.sale_amount) || 0
    })
  })
  const totalRows = Object.values(totals)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
  }

  if (loadError || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-red-600 text-sm font-medium mb-2">Não foi possível carregar esta proposta para impressão.</p>
          {loadError && <p className="text-gray-400 text-xs">{loadError}</p>}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 18mm 14mm; }
        }
        .terms-block { page-break-before: always; }
      `}</style>

      <div className="no-print sticky top-0 bg-gray-900 text-white px-6 py-3 flex justify-between items-center z-10">
        <span className="text-sm">Pré-visualização da proposta {proposal.reference_number}</span>
        <button onClick={() => window.print()} className="bg-white text-gray-900 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-100 transition">
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-brisk.png" alt="Brisk Logistics" className="h-12 w-auto mb-2" />
            <p className="text-sm text-gray-500 mt-1">Proposta Comercial</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-mono font-medium text-gray-900">{proposal.reference_number}</p>
            <p>Data: {fmtDate(proposal.opening_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
            <p className="text-gray-900 font-medium">{proposal.client?.nickname || proposal.client?.company_name}</p>
            {formatAddress(proposal.client) && <p className="text-gray-500">{formatAddress(proposal.client)}</p>}
            {proposal.client?.email && <p className="text-gray-500">{proposal.client.email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detalhes</p>
            <p className="text-gray-700">Incoterm: {proposal.incoterm ? `${proposal.incoterm.code} — ${proposal.incoterm.name}` : '—'}</p>
            <p className="text-gray-700">Tipo de Embarque: {proposal.shipment_type?.label_pt || '—'}</p>
            <p className="text-gray-700">Natureza da Carga: {proposal.cargo_nature || '—'}</p>
          </div>
        </div>

        {products.map((product: any, idx: number) => (
          <div key={product.id} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">
              Produto {idx + 1} — {product.operation_types?.label_pt || ''} {product.cargo_types?.label_pt ? `· ${product.cargo_types.label_pt}` : ''}
            </h3>

            {(product.proposal_routes || []).filter((r: any) => r.is_active).map((route: any) => (
              <div key={route.id} className="mb-4">
                <p className="text-sm text-gray-900 font-medium mb-2">
                  {route.origin?.iata_code || route.origin?.un_locode || route.origin?.name || '—'}
                  {' → '}
                  {route.destination?.iata_code || route.destination?.un_locode || route.destination?.name || '—'}
                  {route.transit_time && <span className="text-gray-500 font-normal"> · Trânsito: {route.transit_time}</span>}
                </p>
                {(route.proposal_freight_items || []).filter((f: any) => f.is_active).length > 0 && (
                  <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden mb-2">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-3 py-2">Equipamento</th>
                        <th className="px-3 py-2">Qtd</th>
                        <th className="px-3 py-2">Unidade</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(route.proposal_freight_items || []).filter((f: any) => f.is_active).map((item: any) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-3 py-2">{item.equipment_types?.label_pt || '—'}</td>
                          <td className="px-3 py-2">{item.quantity || '—'}</td>
                          <td className="px-3 py-2">{item.billing_units?.label_pt || '—'}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(item.sale_rate, route.currencies?.symbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {(product.proposal_expenses || []).filter((x: any) => x.is_active).length > 0 && (
              <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-3 py-2">Despesa</th>
                    <th className="px-3 py-2">Local</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(product.proposal_expenses || []).filter((x: any) => x.is_active).map((exp: any) => (
                    <tr key={exp.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{exp.chart_of_accounts?.description_pt || '—'}</td>
                      <td className="px-3 py-2">{exp.location || '—'}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(exp.sale_amount, exp.currencies?.symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {totalRows.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Total</h3>
            {totalRows.map(r => (
              <p key={r.code} className="text-sm text-gray-900 flex justify-between max-w-xs">
                <span>{r.code}</span>
                <span className="font-medium">{fmtMoney(r.sale, r.symbol)}</span>
              </p>
            ))}
          </div>
        )}

        {proposal.client_notes && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Observações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{proposal.client_notes}</p>
          </div>
        )}

        {terms && (
          <div className="terms-block border-t border-gray-200 pt-6 mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{terms.title}</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{terms.body}</p>
          </div>
        )}
      </div>
    </main>
  )
}
