import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useAppSelector } from '@/store/hooks'

type NodeOption = {
  id: string
  label: string
  next?: string
}

type Node = {
  id: string
  text: string
  options?: NodeOption[]
  requiresInput?: 'area' | 'locations' | 'datetime'
}

const NODES: Record<string, Node> = {
  root: {
    id: 'root',
    text: 'Hello — I am your expert assistant. How can I help you today?',
    options: [
      { id: 'a1', label: 'Devices Summary', next: 'devices' },
      { id: 'a2', label: 'Locations Summary', next: 'locations' },
      { id: 'a3', label: 'Network Health', next: 'network' },
      { id: 'a4', label: 'Other', next: 'general' },
    ],
  },
  devices: {
    id: 'devices',
    text: 'Please select the Area you want the device summary for.',
    requiresInput: 'area',
  },
  'devices-locations': {
    id: 'devices-locations',
    text: 'Select the locations you want to include.',
    requiresInput: 'locations',
  },
  'devices-datetime': {
    id: 'devices-datetime',
    text: 'Select the date and time for the device summary.',
    requiresInput: 'datetime',
  },
  locations: {
    id: 'locations',
    text: 'Please select the Area for the locations summary.',
    requiresInput: 'area',
  },
  'locations-locations': {
    id: 'locations-locations',
    text: 'Select the locations you want to include.',
    requiresInput: 'locations',
  },
  'locations-datetime': {
    id: 'locations-datetime',
    text: 'Select the date and time for the locations summary.',
    requiresInput: 'datetime',
  },
  network: {
    id: 'network',
    text: 'Please select the Area for the network health check.',
    requiresInput: 'area',
  },
  'network-locations': {
    id: 'network-locations',
    text: 'Select the locations you want to include.',
    requiresInput: 'locations',
  },
  'network-datetime': {
    id: 'network-datetime',
    text: 'Select the date and time for the network health check.',
    requiresInput: 'datetime',
  },
  general: {
    id: 'general',
    text: 'Ask me anything — for example: how to add users, how to use reports, or shortcuts.',
    options: [
      { id: 'users', label: 'How to add users', next: undefined },
      { id: 'reports', label: 'Using reports', next: undefined },
    ],
  },
}

const HARDCODED_AREAS = ['All Areas', 'Bastacolla', 'Lodna', 'Kusunda', 'Katras', 'Sijua', 'PB', 'CV', 'WJ', 'EJ', 'Govindpur', 'Barora', 'Block2', 'CCWO']

type Message = {
  id: string
  role: 'assistant' | 'user'
  text: string
  nodeId?: string
}

export default function ExpertSystem() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [inputAreaValue, setInputAreaValue] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedDateTime, setSelectedDateTime] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { locations: reduxLocations } = useAppSelector((s) => s.locations)
  const { devices: reduxDevices } = useAppSelector((s) => s.devices)

  const [currentAreaQuery, setCurrentAreaQuery] = useState<string | null>(null)
  const [reportType, setReportType] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (messages.length === 0) {
      const root = NODES['root']
      setMessages([{ id: `m-${Date.now()}`, role: 'assistant', text: root.text, nodeId: root.id }])
      setCurrentNodeId(root.id)
    }
  }, [open])

  useEffect(() => {
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleOptionClick = (opt: NodeOption) => {
    const userMsg: Message = { id: `m-u-${Date.now()}`, role: 'user', text: opt.label }
    setMessages((prev) => [...prev, userMsg])

    if (opt.id === 'a1') setReportType('devices')
    if (opt.id === 'a2') setReportType('locations')
    if (opt.id === 'a3') setReportType('network')

    if (!opt.next) {
      const ack: Message = { id: `m-a-${Date.now()}`, role: 'assistant', text: "Okay — I've noted that. You can continue or close the assistant." }
      setMessages((prev) => [...prev, ack])
      setCurrentNodeId(null)
      return
    }

    const nextNode = NODES[opt.next]
    if (!nextNode) return

    setTimeout(() => {
      const assistantMsg: Message = { id: `m-a-${Date.now()}`, role: 'assistant', text: nextNode.text, nodeId: nextNode.id }
      setMessages((prev) => [...prev, assistantMsg])
      setCurrentNodeId(nextNode.id)
    }, 250)
  }

  const handleInputSubmit = (inputType: 'area' | 'locations' | 'datetime') => {
    let userText = ''
    let nextNodeId: string | null = null

    if (inputType === 'area') {
      const area = inputAreaValue.trim()
      if (!area) return
      userText = `Area: ${area}`
      setCurrentAreaQuery(area)
      
      if (currentNodeId === 'devices') {
        nextNodeId = 'devices-locations'
      } else if (currentNodeId === 'locations') {
        nextNodeId = 'locations-locations'
      } else if (currentNodeId === 'network') {
        nextNodeId = 'network-locations'
      }
      setInputAreaValue('')
    } else if (inputType === 'locations') {
      if (selectedLocations.length === 0) return
      userText = `Locations: ${selectedLocations.join(', ')}`
      
      if (currentNodeId === 'devices-locations') {
        nextNodeId = 'devices-datetime'
      } else if (currentNodeId === 'locations-locations') {
        nextNodeId = 'locations-datetime'
      } else if (currentNodeId === 'network-locations') {
        nextNodeId = 'network-datetime'
      }
    } else if (inputType === 'datetime') {
      if (!selectedDateTime) return
      userText = `Date/Time: ${new Date(selectedDateTime).toLocaleString()}`
      nextNodeId = null
      
      try {
        generateReportPDF()
      } catch (e) {
        console.error('Failed to generate report PDF', e)
      }
      setSelectedDateTime('')
    }

    const userMsg: Message = { id: `m-u-${Date.now()}`, role: 'user', text: userText }
    setMessages((prev) => [...prev, userMsg])

    if (!nextNodeId) {
      setTimeout(() => {
        const ack: Message = { 
          id: `m-a-${Date.now()}`, 
          role: 'assistant', 
          text: "Great! I've generated your report. The PDF has been downloaded." 
        }
        setMessages((prev) => [...prev, ack])
        setCurrentNodeId(null)
        setSelectedLocations([])
        setCurrentAreaQuery(null)
        setReportType(null)
      }, 250)
      return
    }

    const nextNode = NODES[nextNodeId]
    if (!nextNode) return

    setTimeout(() => {
      const assistantMsg: Message = { 
        id: `m-a-${Date.now()}`, 
        role: 'assistant', 
        text: nextNode.text, 
        nodeId: nextNode.id 
      }
      setMessages((prev) => [...prev, assistantMsg])
      setCurrentNodeId(nextNode.id)
    }, 250)
  }

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(loc => loc !== location)
        : [...prev, location]
    )
  }

  const getOptionsForCurrent = () => {
    if (!currentNodeId) return []
    const node = NODES[currentNodeId]
    return node?.options ?? []
  }

  const computedLocations = (() => {
    if (!currentAreaQuery) return [] as any[]
    if (currentAreaQuery === 'ALL') {
      return reduxLocations
    }
    const q = currentAreaQuery.toLowerCase()
    return reduxLocations.filter((loc: any) => {
      const area = (loc.area || '').toLowerCase()
      return area.includes(q)
    })
  })()
  
  const getCurrentNode = () => {
    if (!currentNodeId) return null
    return NODES[currentNodeId]
  }

  const currentNode = getCurrentNode()
  const requiresInput = currentNode?.requiresInput

  const generateReportPDF = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const reportTitle =
    reportType === 'devices'
      ? 'Devices Summary Report'
      : reportType === 'locations'
      ? 'Locations Summary Report'
      : 'Network Health Report'

  const timestamp = new Date().toLocaleString()

  /* ================= HEADER ================= */
  doc.setFontSize(16)
  doc.setFont('Times New Roman', 'bold')
  doc.text(reportTitle, pageWidth / 2, 40, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('Times New Roman', 'normal')
  doc.setTextColor(120)
  doc.text(`Area: ${currentAreaQuery || 'All Areas'}`, pageWidth - 40, 30, { align: 'right' })
  doc.text(`Generated: ${timestamp}`, pageWidth - 40, 45, { align: 'right' })
  

  doc.setDrawColor(220)
  doc.line(40, 55, pageWidth - 40, 55)

  doc.setTextColor(0)

  /* ================= LOCATIONS ================= */
  let locationsToReport: string[] = []

  if (selectedLocations.length > 0) {
    locationsToReport = selectedLocations.slice()
  } else if (currentAreaQuery && currentAreaQuery !== 'ALL') {
    locationsToReport = computedLocations.map((l: any) => l.name)
  } else {
    locationsToReport = reduxLocations.map((l: any) => l.name)
  }

  locationsToReport = Array.from(new Set(locationsToReport))

  let currentY = 75

  locationsToReport.forEach((locName, idx) => {
    const locObj =
      reduxLocations.find((r: any) => r.name === locName) || { area: '', id: null }

    const locDevices = reduxDevices.filter((d: any) => {
      const nameMatch = d.location && d.location.name === locName
      const idMatch = typeof d.location_id !== 'undefined' && d.location_id === locObj.id
      return nameMatch || idMatch
    })

    const total = locDevices.length
    const online = locDevices.filter((d: any) => d.is_reachable === true).length
    const offline = locDevices.filter((d: any) => d.is_reachable === false).length

    /* -------- Page break -------- */
    if (currentY > pageHeight - 200) {
      doc.addPage()
      currentY = 50
    }

    /* ================= LOCATION CARD ================= */
    doc.setFillColor(245, 247, 250)
    doc.rect(40, currentY, pageWidth - 80, 32, 'F')

    doc.setFontSize(10)
    doc.setFont('Times New Roman', 'bold')
    doc.text(`${idx + 1}. ${locName}`, 50, currentY + 20)

    doc.setFontSize(9)
    doc.setFont('Times New Roman', 'normal')
    doc.setTextColor(100)
    doc.text(`Total: ${total}`, pageWidth - 220, currentY + 20)

    doc.setTextColor(34, 197, 94)
    doc.text(`Online: ${online}`, pageWidth - 160, currentY + 20)

    doc.setTextColor(239, 68, 68)
    doc.text(`Offline: ${offline}`, pageWidth - 90, currentY + 20)

    doc.setTextColor(0)
    currentY += 42

    /* ================= DEVICE TABLE ================= */
    if (locDevices.length > 0) {
      const devicesHead = [['Device Name', 'IP Address', 'Status', 'Last Check']]

      const devicesBody = locDevices.map((d: any) => [
        d.display || 'N/A',
        d.ip || 'N/A',
        d.is_reachable === true ? 'Online' : d.is_reachable === false ? 'Offline' : 'Unknown',
        d.last_check ? new Date(d.last_check).toLocaleString() : 'N/A'
      ])

      ;(doc as any).autoTable({
        startY: currentY,
        head: devicesHead,
        body: devicesBody,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 5,
          lineColor: [220, 220, 220],
          lineWidth: 0.4
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 200 },  // 🔥 WIDE DEVICE NAME
          1: { cellWidth: 110 },
          2: { cellWidth: 70, halign: 'center' },
          3: { cellWidth: 125 }
        },
        margin: { left: 50, right: 50 },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 2) {
            if (data.cell.raw === 'Online') {
              data.cell.styles.textColor = [34, 197, 94]
              data.cell.styles.fontStyle = 'bold'
            }
            if (data.cell.raw === 'Offline') {
              data.cell.styles.textColor = [239, 68, 68]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        }
      })

      currentY = (doc as any).lastAutoTable.finalY + 30
    } else {
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text('No devices found for this location', 60, currentY)
      currentY += 30
      doc.setTextColor(0)
    }
  })

  /* ================= FOOTER ================= */
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 20, { align: 'right' })
    doc.text('Dadhwal NMS', 40, pageHeight - 20)
  }

  doc.save(`${reportTitle.replace(/\s+/g, '-')}-${Date.now()}.pdf`)
}


  return (
    <div>
      <button
        aria-label={open ? 'Close expert system' : 'Open expert system'}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          left: 18,
          bottom: 18,
          zIndex: 60,
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: 'var(--accent, #25e8ebff)',
          color: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="yellow" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Expert system"
          style={{
            position: 'fixed',
            left: 18,
            bottom: 78,
            zIndex: 60,
            width: 360,
            maxWidth: 'calc(100% - 48px)',
            height: 420,
            background: 'var(--surface, #0b1220)',
            color: 'var(--contrast, #e6eef8)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
            padding: 12,
            border: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Dadhwal NMS - Expert Assistant</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Please choose an option to proceed.</div>
            </div>
            <div>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--contrast, #e6eef8)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={containerRef} style={{ marginTop: 10, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 6 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: m.role === 'assistant' ? 'rgba(255,255,255,0.04)' : 'var(--accent, #e6e9f0ff)',
                  color: m.role === 'assistant' ? 'var(--contrast, #e6eef8)' : 'black',
                  fontSize: 13,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            {requiresInput === 'area' && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      width: 320,
                      maxWidth: '100%',
                      height: 160,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      overflowY: 'auto',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {HARDCODED_AREAS.map((area) => {
                      const isSelected = inputAreaValue === (area === 'All Areas' ? 'ALL' : area)
                      return (
                        <div
                          key={area}
                          onClick={() => {
                            if (area === 'All Areas') {
                              setInputAreaValue('ALL')
                            } else {
                              setInputAreaValue(area)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (area === 'All Areas') {
                                setInputAreaValue('ALL')
                              } else {
                                setInputAreaValue(area)
                              }
                            }
                          }}
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            background: isSelected ? 'rgba(37,99,235,0.12)' : 'transparent',
                            color: 'var(--contrast, #e6eef8)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{area}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleInputSubmit('area')}
                  disabled={!inputAreaValue.trim()}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: inputAreaValue.trim() ? 'var(--accent, #2563eb)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'black',
                    cursor: inputAreaValue.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {requiresInput === 'locations' && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      width: 320,
                      maxWidth: '100%',
                      height: 160,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      overflowY: 'auto',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {computedLocations.length > 0 ? (
                      computedLocations.map((loc: any) => {
                        const isSelected = selectedLocations.includes(loc.name)
                        return (
                          <div
                            key={loc.id}
                            onClick={() => toggleLocation(loc.name)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') toggleLocation(loc.name) }}
                            style={{
                              padding: '8px 10px',
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              background: isSelected ? 'rgba(37,99,235,0.12)' : 'transparent',
                              color: 'var(--contrast, #e6eef8)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                            <div style={{ marginLeft: 8, opacity: 0.8, fontSize: 12 }}>{loc.area}</div>
                          </div>
                        )
                      })
                    ) : (
                      <div style={{ padding: 10, color: 'var(--contrast, #e6eef8)', opacity: 0.9 }}>No locations found for "{currentAreaQuery || ''}"</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleInputSubmit('locations')}
                  disabled={selectedLocations.length === 0}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: selectedLocations.length > 0 ? 'var(--accent, #2563eb)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'black',
                    cursor: selectedLocations.length > 0 ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {requiresInput === 'datetime' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="datetime-local"
                  value={selectedDateTime}
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--contrast, #e6eef8)',
                    fontSize: 13,
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                <button
                  onClick={() => handleInputSubmit('datetime')}
                  disabled={!selectedDateTime}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: selectedDateTime ? 'var(--accent, #2563eb)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'black',
                    cursor: selectedDateTime ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Generate Report
                </button>
              </div>
            )}

            {!requiresInput && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {getOptionsForCurrent().map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionClick(opt)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      color: 'var(--contrast, #e6eef8)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}