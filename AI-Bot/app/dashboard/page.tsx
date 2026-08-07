'use client'

import { useEffect, useState } from 'react'
import { supabaseClient as supabase, Bot } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { 
  Video, 
  FileText, 
  Calendar, 
  ExternalLink,
  Plus,
  Circle,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader,
  Monitor,
  Users,
  Camera,
  Bot as BotIcon,
} from 'lucide-react'

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchBots()
  }, [])

  const fetchBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching bots:', error)
      } else {
        setBots(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ink-border"
    switch (status) {
      case 'done':
        return <span className={`${base} bg-[oklch(0.82_0.15_165)]`}><CheckCircle className="w-3 h-3" /> Done</span>
      case 'creating':
      case 'joining_call':
      case 'in_call_recording':
        return <span className={`${base} bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)]`}><Circle className="w-3 h-3 blink" /> Live</span>
      case 'call_ended':
        return <span className={`${base} bg-[oklch(0.88_0.19_95)]`}><AlertCircle className="w-3 h-3" /> Ended</span>
      case 'failed':
        return <span className={`${base} bg-[oklch(0.62_0.24_25)] text-[oklch(0.985_0.008_90)]`}><XCircle className="w-3 h-3" /> Failed</span>
      default:
        return <span className={`${base} bg-muted`}><Circle className="w-3 h-3" /> {status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'zoom': return <Video className="w-4 h-4" />
      case 'teams':
      case 'microsoft teams': return <Users className="w-4 h-4" />
      case 'meet':
      case 'google meet': return <Camera className="w-4 h-4" />
      case 'webex': return <Monitor className="w-4 h-4" />
      default: return <Video className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-grid h-16 w-16 place-items-center rounded-2xl ink-border bg-[oklch(0.55_0.24_285)] pop-lg mb-4">
            <Loader className="w-8 h-8 animate-spin text-[oklch(0.985_0.008_90)]" />
          </div>
          <p className="font-bold text-muted-foreground">Loading your bots…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}
        <header className="flex items-center justify-between py-6 border-b-2 border-ink">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)] pop-sm"
            >
              <BotIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Bots Dashboard</h1>
              <p className="text-xs text-muted-foreground font-bold">Manage your meeting recording bots</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/create-bot')}
            className="inline-flex h-10 items-center gap-2 rounded-xl ink-border bg-[oklch(0.55_0.24_285)] px-4 text-sm font-bold text-[oklch(0.985_0.008_90)] pop"
          >
            <Plus className="w-4 h-4" /> New Bot
          </button>
        </header>

        {/* Bots Grid */}
        <div className="py-8">
          {bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="inline-grid h-20 w-20 place-items-center rounded-3xl ink-border bg-[oklch(0.88_0.19_95)] pop-lg mb-6">
                <Video className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black mb-2">No bots yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first meeting bot — paste a link and Np handles the rest.
              </p>
              <button
                onClick={() => router.push('/create-bot')}
                className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-[oklch(0.55_0.24_285)] px-5 text-base font-bold text-[oklch(0.985_0.008_90)] pop"
              >
                <Plus className="w-4 h-4" /> Create Your First Bot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bots.map((bot, i) => (
                <div
                  key={bot.id}
                  onClick={() => router.push(`/bot/${bot.id}`)}
                  className="rounded-2xl ink-border bg-card p-5 pop cursor-pointer pop-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-[oklch(0.82_0.15_165)]">
                        {getPlatformIcon(bot.meeting_platform)}
                      </span>
                      <div>
                        <h3 className="font-black truncate max-w-[140px]">{bot.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{bot.meeting_platform}</p>
                      </div>
                    </div>
                    {getStatusBadge(bot.bot_status)}
                  </div>

                  {/* Meeting name */}
                  {bot.meeting_name && (
                    <p className="text-sm font-bold truncate mb-3 text-foreground">
                      {bot.meeting_name}
                    </p>
                  )}

                  {/* Status row */}
                  <div className="space-y-1.5 mb-4">
                    {bot.recording_status && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground font-bold">
                          <Video className="w-3 h-3" /> Recording
                        </span>
                        <span className="font-black capitalize">{bot.recording_status}</span>
                      </div>
                    )}
                    {bot.transcript_status && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground font-bold">
                          <FileText className="w-3 h-3" /> Transcript
                        </span>
                        <span className="font-black capitalize">{bot.transcript_status}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t-2 border-ink pt-3 flex items-center text-xs text-muted-foreground font-bold gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(bot.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}