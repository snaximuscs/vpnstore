'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  X,
  RefreshCw,
  Copy,
  Download,
  QrCode,
  Activity,
  User,
  Globe,
  SlidersHorizontal,
} from 'lucide-react'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type VPNStatus = 'active' | 'inactive' | 'expired' | 'error'

interface VPNLog {
  id: string
  timestamp: string
  username: string
  ip: string
  status: VPNStatus
  duration: string
  message: string
  tags: string[]
  /** Optional extra detail shown in expanded row */
  detail?: {
    bytesIn?: string
    bytesOut?: string
    protocol?: string
    port?: number
    location?: string
    deviceType?: string
    subscriptionExpires?: string
    errorCode?: string
  }
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_LOGS: VPNLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-03-19T08:14:32Z',
    username: 'gantulga.b',
    ip: '10.0.0.12',
    status: 'active',
    duration: '3г 22м',
    message: 'WireGuard холболт амжилттай. Трафик дамжуулж байна.',
    tags: ['config-copied', 'mobile'],
    detail: {
      bytesIn: '1.2 GB',
      bytesOut: '340 MB',
      protocol: 'WireGuard',
      port: 51820,
      location: 'Улаанбаатар, МН',
      deviceType: 'Android',
      subscriptionExpires: '2026-06-19',
    },
  },
  {
    id: 'log-002',
    timestamp: '2026-03-19T07:55:10Z',
    username: 'munkh.od',
    ip: '10.0.0.7',
    status: 'error',
    duration: '0м',
    message: 'Холболт амжилтгүй: public key буруу эсвэл сервер хүрэхгүй байна.',
    tags: ['auth-failed'],
    detail: {
      protocol: 'WireGuard',
      port: 51820,
      location: 'Дархан, МН',
      deviceType: 'Windows',
      errorCode: 'ERR_KEY_MISMATCH',
    },
  },
  {
    id: 'log-003',
    timestamp: '2026-03-19T06:40:00Z',
    username: 'enkhjin.g',
    ip: '10.0.0.23',
    status: 'expired',
    duration: '—',
    message: 'Эрхийн хугацаа дууссан. Хэрэглэгч холбогдох боломжгүй.',
    tags: ['sub-expired'],
    detail: {
      subscriptionExpires: '2026-03-18',
      location: 'Улаанбаатар, МН',
      deviceType: 'iOS',
    },
  },
  {
    id: 'log-004',
    timestamp: '2026-03-19T08:02:45Z',
    username: 'narantsetseg.d',
    ip: '10.0.0.34',
    status: 'active',
    duration: '1г 5м',
    message: 'Холболт тогтвортой. Бүх трафик VPN-ээр дамжиж байна.',
    tags: ['config-downloaded', 'desktop'],
    detail: {
      bytesIn: '450 MB',
      bytesOut: '88 MB',
      protocol: 'WireGuard',
      port: 51820,
      location: 'Эрдэнэт, МН',
      deviceType: 'macOS',
      subscriptionExpires: '2026-04-19',
    },
  },
  {
    id: 'log-005',
    timestamp: '2026-03-19T05:30:22Z',
    username: 'batkhuyag.ts',
    ip: '10.0.0.8',
    status: 'inactive',
    duration: '—',
    message: 'Хэрэглэгч гараар холболтоо таслав.',
    tags: ['manual-disconnect'],
    detail: {
      bytesIn: '2.8 GB',
      bytesOut: '780 MB',
      protocol: 'WireGuard',
      location: 'Улаанбаатар, МН',
      deviceType: 'Windows',
      subscriptionExpires: '2026-05-01',
    },
  },
  {
    id: 'log-006',
    timestamp: '2026-03-19T08:18:55Z',
    username: 'tsolmon.e',
    ip: '10.0.0.41',
    status: 'active',
    duration: '0г 47м',
    message: 'Шинэ peer амжилттай нэмэгдэв. Холболт тогтвортой.',
    tags: ['config-copied', 'new-user', 'qr-scanned'],
    detail: {
      bytesIn: '90 MB',
      bytesOut: '12 MB',
      protocol: 'WireGuard',
      port: 51820,
      location: 'Улаанбаатар, МН',
      deviceType: 'iOS',
      subscriptionExpires: '2026-04-19',
    },
  },
  {
    id: 'log-007',
    timestamp: '2026-03-19T07:10:30Z',
    username: 'sukhbaatar.n',
    ip: '10.0.0.15',
    status: 'error',
    duration: '0м',
    message: 'Холболтын timeout: сервер 30 секундын дотор хариу ирэхгүй.',
    tags: ['timeout', 'retry-3'],
    detail: {
      protocol: 'WireGuard',
      port: 51820,
      location: 'Хөвсгөл, МН',
      deviceType: 'Android',
      errorCode: 'ERR_HANDSHAKE_TIMEOUT',
      subscriptionExpires: '2026-03-25',
    },
  },
  {
    id: 'log-008',
    timestamp: '2026-03-19T08:00:00Z',
    username: 'ankhbayar.ts',
    ip: '10.0.0.56',
    status: 'active',
    duration: '2г 10м',
    message: 'Холболт тогтвортой. Эрх 7 хоногийн дараа дуусна.',
    tags: ['expiring-soon', 'config-downloaded'],
    detail: {
      bytesIn: '3.1 GB',
      bytesOut: '1.2 GB',
      protocol: 'WireGuard',
      port: 51820,
      location: 'Улаанбаатар, МН',
      deviceType: 'Windows',
      subscriptionExpires: '2026-03-26',
    },
  },
  {
    id: 'log-009',
    timestamp: '2026-03-19T03:15:00Z',
    username: 'davaasuren.g',
    ip: '10.0.0.62',
    status: 'inactive',
    duration: '—',
    message: 'Эрхийн хугацаа 3 хоногийн дараа дуусна. Сунгахыг зөвлөж байна.',
    tags: ['expiring-soon'],
    detail: {
      protocol: 'WireGuard',
      location: 'Улаанбаатар, МН',
      deviceType: 'macOS',
      subscriptionExpires: '2026-03-22',
    },
  },
  {
    id: 'log-010',
    timestamp: '2026-03-19T08:20:01Z',
    username: 'otgonbayar.d',
    ip: '10.0.0.71',
    status: 'active',
    duration: '0г 5м',
    message: 'Шинэ хэрэглэгч QPay төлбөрийн дараа холбогдов. Config хуулсан.',
    tags: ['new-user', 'config-copied', 'qpay'],
    detail: {
      bytesIn: '8 MB',
      bytesOut: '2 MB',
      protocol: 'WireGuard',
      port: 51820,
      location: 'Улаанбаатар, МН',
      deviceType: 'Android',
      subscriptionExpires: '2026-04-19',
    },
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  VPNStatus,
  { label: string; icon: React.FC<{ className?: string }>; badgeVariant: string; rowClass: string }
> = {
  active: {
    label: 'Идэвхтэй',
    icon: ({ className }) => <Wifi className={className} />,
    badgeVariant: 'active',
    rowClass: 'border-l-emerald-500/60',
  },
  inactive: {
    label: 'Идэвхгүй',
    icon: ({ className }) => <WifiOff className={className} />,
    badgeVariant: 'inactive',
    rowClass: 'border-l-gray-600/40',
  },
  expired: {
    label: 'Дууссан',
    icon: ({ className }) => <AlertTriangle className={className} />,
    badgeVariant: 'expired',
    rowClass: 'border-l-amber-500/60',
  },
  error: {
    label: 'Алдаа',
    icon: ({ className }) => <XCircle className={className} />,
    badgeVariant: 'error',
    rowClass: 'border-l-red-500/60',
  },
}

const TAG_CONFIG: Record<string, { label: string; icon?: React.FC<{ className?: string }> }> = {
  'config-copied':     { label: 'Хуулсан', icon: ({ className }) => <Copy className={className} /> },
  'config-downloaded': { label: 'Татсан',  icon: ({ className }) => <Download className={className} /> },
  'qr-scanned':        { label: 'QR скан', icon: ({ className }) => <QrCode className={className} /> },
  'qpay':              { label: 'QPay' },
  'new-user':          { label: 'Шинэ' },
  'auth-failed':       { label: 'Auth алдаа' },
  'timeout':           { label: 'Timeout' },
  'sub-expired':       { label: 'Эрх дуусав' },
  'expiring-soon':     { label: '⚠ Дуусахад ойр' },
  'manual-disconnect': { label: 'Гараар таслав' },
  'mobile':            { label: 'Mobile' },
  'desktop':           { label: 'Desktop' },
}

function getTagLabel(tag: string): string {
  return TAG_CONFIG[tag]?.label ?? tag
}

const WARNING_TAGS = new Set(['expiring-soon'])
const ERROR_TAGS   = new Set(['auth-failed', 'timeout', 'sub-expired'])

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VPNStatus }) {
  const { label, icon: Icon, badgeVariant } = STATUS_CONFIG[status]
  return (
    <Badge variant={badgeVariant as never} className="gap-1.5 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

function TagBadge({ tag }: { tag: string }) {
  const cfg  = TAG_CONFIG[tag]
  const Icon = cfg?.icon
  const isWarning = WARNING_TAGS.has(tag)
  const isError   = ERROR_TAGS.has(tag)

  return (
    <Badge
      variant={isError ? 'error' : isWarning ? 'warning' : 'tag'}
      className="gap-1 whitespace-nowrap text-[10px] py-0"
    >
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {getTagLabel(tag)}
    </Badge>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground/90 font-mono">{value}</span>
    </div>
  )
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: VPNLog }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[log.status]

  const hasWarning =
    log.status === 'expired' ||
    log.tags.some((t) => WARNING_TAGS.has(t))
  const hasError = log.status === 'error'

  const rowBg = hasError
    ? 'bg-red-950/10 hover:bg-red-950/20'
    : hasWarning
    ? 'bg-amber-950/10 hover:bg-amber-950/20'
    : log.status === 'active'
    ? 'hover:bg-emerald-950/10'
    : 'hover:bg-muted/30'

  const formattedTime = new Date(log.timestamp).toLocaleString('mn-MN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <>
      {/* Main row */}
      <motion.tr
        layout
        className={cn(
          'border-b border-border/50 border-l-2 cursor-pointer transition-colors select-none',
          cfg.rowClass,
          rowBg
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand chevron */}
        <td className="py-3 pl-4 pr-2 w-8">
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.18 }}
            className="inline-flex text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.span>
        </td>

        {/* Timestamp */}
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Clock className="h-3 w-3 shrink-0" />
            {formattedTime}
          </span>
        </td>

        {/* Username */}
        <td className="py-3 px-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {log.username}
          </span>
        </td>

        {/* IP */}
        <td className="py-3 px-3 hidden sm:table-cell">
          <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            {log.ip}
          </span>
        </td>

        {/* Status */}
        <td className="py-3 px-3">
          <StatusBadge status={log.status} />
        </td>

        {/* Duration */}
        <td className="py-3 px-3 hidden md:table-cell">
          <span className="text-xs text-muted-foreground font-mono">{log.duration}</span>
        </td>

        {/* Tags */}
        <td className="py-3 px-3 pr-4 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {log.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            {log.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] py-0">
                +{log.tags.length - 3}
              </Badge>
            )}
          </div>
        </td>
      </motion.tr>

      {/* Expanded detail row */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.tr
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <td colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    'mx-3 mb-3 rounded-xl border p-4 space-y-4',
                    hasError
                      ? 'border-red-800/40 bg-red-950/20'
                      : hasWarning
                      ? 'border-amber-800/40 bg-amber-950/20'
                      : log.status === 'active'
                      ? 'border-emerald-800/30 bg-emerald-950/10'
                      : 'border-border bg-muted/20'
                  )}
                >
                  {/* Message */}
                  <div className="text-sm text-foreground/90 leading-relaxed">
                    {log.message}
                  </div>

                  {/* Detail grid */}
                  {log.detail && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                      <DetailRow label="Protocol"           value={log.detail.protocol} />
                      <DetailRow label="Port"               value={log.detail.port?.toString()} />
                      <DetailRow label="Байршил"            value={log.detail.location} />
                      <DetailRow label="Төхөөрөмж"          value={log.detail.deviceType} />
                      <DetailRow label="Орж ирсэн трафик"   value={log.detail.bytesIn} />
                      <DetailRow label="Илгээсэн трафик"    value={log.detail.bytesOut} />
                      <DetailRow label="Эрх дуусах огноо"   value={log.detail.subscriptionExpires} />
                      <DetailRow label="Алдааны код"        value={log.detail.errorCode} />
                    </div>
                  )}

                  {/* All tags */}
                  {log.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                      {log.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
        active
          ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
          : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ logs }: { logs: VPNLog[] }) {
  const counts = useMemo(
    () => ({
      active:   logs.filter((l) => l.status === 'active').length,
      inactive: logs.filter((l) => l.status === 'inactive').length,
      expired:  logs.filter((l) => l.status === 'expired').length,
      error:    logs.filter((l) => l.status === 'error').length,
    }),
    [logs]
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {(
        [
          { key: 'active',   label: 'Идэвхтэй',  color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40', icon: <Activity className="h-4 w-4" /> },
          { key: 'inactive', label: 'Идэвхгүй',  color: 'text-gray-400',    bg: 'bg-gray-800/40 border-gray-700/40',       icon: <WifiOff className="h-4 w-4" /> },
          { key: 'expired',  label: 'Дууссан',   color: 'text-amber-400',   bg: 'bg-amber-950/40 border-amber-800/40',     icon: <AlertTriangle className="h-4 w-4" /> },
          { key: 'error',    label: 'Алдаа',     color: 'text-red-400',     bg: 'bg-red-950/40 border-red-800/40',         icon: <XCircle className="h-4 w-4" /> },
        ] as const
      ).map(({ key, label, color, bg, icon }) => (
        <div key={key} className={cn('rounded-xl border p-3 flex items-center gap-3', bg)}>
          <span className={color}>{icon}</span>
          <div>
            <p className={cn('text-xl font-bold', color)}>{counts[key]}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InteractiveLogsTableProps {
  initialLogs?: any[]
  logs?: VPNLog[]
  title?: string
}

export function InteractiveLogsTable({
  logs = SAMPLE_LOGS,
  title = 'VPN Хэрэглэгчийн Лог',
}: InteractiveLogsTableProps) {
  const [search, setSearch]             = useState('')
  const [activeStatuses, setStatuses]   = useState<Set<VPNStatus>>(new Set())
  const [showFilters, setShowFilters]   = useState(false)
  const [lastRefreshed, setRefreshed]   = useState(() => new Date())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebounced] = useState('')

  // Debounce search for large datasets
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setDebounced(val), 250)
  }, [])

  const toggleStatus = useCallback((s: VPNStatus) => {
    setStatuses((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setStatuses(new Set())
    setSearch('')
    setDebounced('')
  }, [])

  const activeFilterCount = activeStatuses.size + (debouncedSearch ? 1 : 0)

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return logs.filter((log) => {
      const matchSearch =
        !q ||
        log.username.toLowerCase().includes(q) ||
        log.ip.includes(q) ||
        log.message.toLowerCase().includes(q) ||
        log.tags.some((t) => t.includes(q))
      const matchStatus = activeStatuses.size === 0 || activeStatuses.has(log.status)
      return matchSearch && matchStatus
    })
  }, [logs, debouncedSearch, activeStatuses])

  const handleRefresh = () => {
    setRefreshed(new Date())
    // In production: re-fetch logs from API here
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-400" />
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Сүүлд шинэчилсэн: {lastRefreshed.toLocaleTimeString('mn-MN', { hour12: false })}
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={handleRefresh} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" />
          Шинэчлэх
        </Button>
      </div>

      {/* ── Stats ── */}
      <StatsBar logs={logs} />

      {/* ── Search + Filter controls ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Нэр, IP, тэг хайх…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant="subtle"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="gap-2 relative shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Шүүлтүүр
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Clear */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
            Цэвэрлэх
          </Button>
        )}
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Filter className="h-3 w-3" /> Статусаар шүүх
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as VPNStatus[]).map((status) => (
                  <FilterPill
                    key={status}
                    active={activeStatuses.has(status)}
                    onClick={() => toggleStatus(status)}
                  >
                    <span className="flex items-center gap-1">
                      {STATUS_CONFIG[status].label}
                    </span>
                  </FilterPill>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result count ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{filtered.length}</span> / {logs.length} бичлэг
          {activeFilterCount > 0 && (
            <span className="ml-1 text-brand-400">({activeFilterCount} шүүлтүүр идэвхтэй)</span>
          )}
        </span>
        <span className="hidden sm:block">Мөрийг дарж дэлгэрэнгүй харна</span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="py-2.5 pl-4 pr-2 w-8" />
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Цаг
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">
                  Хэрэглэгч
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  IP
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground">
                  Статус
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Хугацаа
                </th>
                <th className="py-2.5 px-3 pr-4 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Тэгүүд
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <AnimatePresence mode="popLayout" initial={false}>
                {filtered.length > 0 ? (
                  filtered.map((log) => <LogRow key={log.id} log={log} />)
                ) : (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7}>
                      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">Лог олдсонгүй</p>
                        <p className="text-xs">Хайлт эсвэл шүүлтүүрийг өөрчилнө үү</p>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-1">
                          Шүүлтүүр цэвэрлэх
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export type { VPNLog, VPNStatus }
