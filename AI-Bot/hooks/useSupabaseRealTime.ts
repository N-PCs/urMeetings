'use client'

import { useEffect, useState } from 'react'
import { supabaseClient as supabase, Bot } from '@/lib/supabase-client'
import { RealtimeChannel } from '@supabase/supabase-js'

export const useSupabaseRealTime = (botId: string, onUpdate: (bot: Bot) => void) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!botId) return

    // Create a channel for real-time updates
    const realtimeChannel = supabase
      .channel(`bot-${botId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bots',
          filter: `id=eq.${botId}`, // Only listen to updates for this specific bot
        },
        (payload) => {
          setLastUpdate(new Date().toISOString())
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Call the update handler with the new bot data
            onUpdate(payload.new as Bot)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
        
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to real-time updates')
        } else if (status === 'TIMED_OUT') {
          console.warn('Real-time subscription timed out')
        }
      })

    setChannel(realtimeChannel)

    // Cleanup function
    return () => {
      realtimeChannel.unsubscribe()
      setIsConnected(false)
      setChannel(null)
    }
  }, [botId, onUpdate])

  return {
    isConnected,
    lastUpdate,
    disconnect: () => {
      if (channel) {
        channel.unsubscribe()
        setIsConnected(false)
        setChannel(null)
      }
    }
  }
}