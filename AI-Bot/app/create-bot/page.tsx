'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader, Bot, Link as LinkIcon } from 'lucide-react'

export default function CreateBot() {
  const [formData, setFormData] = useState({
    meeting_url: '',
    bot_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/create-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/bot/${result.bot_id}`)
      } else {
        setError(result.error || 'Failed to create bot')
      }
    } catch {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* Header */}
        <header className="flex items-center gap-3 py-6 border-b-2 border-ink">
          <button
            onClick={() => router.back()}
            className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-card pop-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Deploy a New Bot</h1>
            <p className="text-xs text-muted-foreground font-bold">Paste a meeting link and urBriefs joins for you</p>
          </div>
        </header>

        {/* Form */}
        <div className="py-10">
          {/* Decorative sticker */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full ink-border bg-[oklch(0.88_0.19_95)] px-3 py-1 text-xs font-bold pop-sm">
            <Bot className="w-3.5 h-3.5" /> urBriefs · Zoom · Meet · Teams
          </div>

          <div className="rounded-2xl ink-border bg-card p-6 sm:p-8 pop-lg">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Error */}
              {error && (
                <div className="rounded-xl ink-border bg-[oklch(0.62_0.24_25)] text-[oklch(0.985_0.008_90)] p-4">
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              {/* Meeting URL */}
              <div>
                <label className="block text-sm font-black mb-2">
                  Meeting URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={formData.meeting_url}
                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 rounded-xl ink-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.24_285)] focus:ring-offset-2"
                    placeholder="https://zoom.us/j/123456789"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-bold">
                  Supports Zoom, Google Meet, Microsoft Teams, and Webex.
                </p>
              </div>

              {/* Bot Name */}
              <div>
                <label className="block text-sm font-black mb-2">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={formData.bot_name}
                  onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl ink-border bg-background font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.24_285)] focus:ring-offset-2"
                  placeholder="urBriefs"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1.5 font-bold">
                  This name will appear as a participant in the meeting.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-card px-5 font-bold text-sm pop disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)] font-bold text-sm pop disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Deploying Bot…
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      Deploy urBriefs
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Info cards */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Auto-joins", color: "bg-[oklch(0.82_0.15_165)]" },
              { label: "Records audio", color: "bg-[oklch(0.88_0.19_95)]" },
              { label: "Full transcript", color: "bg-[oklch(0.68_0.24_355)] text-[oklch(0.985_0.008_90)]" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl ink-border ${item.color} p-3 text-center pop-sm`}>
                <span className="text-xs font-black">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}