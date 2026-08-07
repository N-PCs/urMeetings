import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, event } = body

    if (!data?.bot?.id || !event) {
      return NextResponse.json(
        { error: 'Invalid webhook payload - missing bot ID or event' },
        { status: 400 }
      )
    }

    const botId = data.bot.id
    const eventType = event
    const status = data.data?.code || eventType

    console.log(`Webhook received: ${eventType} for bot ${botId} with status ${status}`)

    // Determine which status field to update based on event type
    const updateData: any = {}

    if (eventType.startsWith('bot.')) {
      // Bot status events (bot.joining_call, bot.in_call_recording, etc.)
      updateData.bot_status = status
    } else if (eventType.startsWith('recording.')) {
      // Recording status events (recording.done, recording.processing, etc.)
      updateData.recording_status = status
    } else if (eventType.startsWith('transcript.')) {
      // Transcript status events (transcript.done, transcript.processing, etc.)
      updateData.transcript_status = status
    } else {
      // Generic status update - try to infer from the status code
      if (status.includes('recording')) {
        updateData.recording_status = status
      } else if (status.includes('transcript')) {
        updateData.transcript_status = status
      } else {
        updateData.bot_status = status
      }
    }

    // Update the bot status in Supabase
    const { data: updatedBot, error } = await supabase
      .from('bots')
      .update(updateData)
      .eq('id', botId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update bot status', details: error.message },
        { status: 500 }
      )
    }

    console.log(`Successfully updated bot ${botId}:`, updateData)

    // Supabase real-time will automatically notify subscribers of this update
    // No need for manual event emission

    // If the event is bot.done, fetch the complete bot data from Recall AI
    if (eventType === 'bot.done') {
      try {
        console.log(`Bot ${botId} is done, fetching complete data from Recall AI...`)
        
        const recallResponse = await fetch(`${process.env.RECALL_AI_BASE_URL}/api/v1/bot/${botId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${process.env.RECALL_AI_API_TOKEN}`,
            'Content-Type': 'application/json',
          }
        })

        if (recallResponse.ok) {
          const recallData = await recallResponse.json()
          
          // Extract recording and transcript URLs
          let recordingUrl = null
          let transcriptUrl = null
          let meetingName = null

          if (recallData.recordings && recallData.recordings.length > 0) {
            const recording = recallData.recordings[0]
            
            // Get video recording URL
            if (recording.media_shortcuts?.video_mixed?.data?.download_url) {
              recordingUrl = recording.media_shortcuts.video_mixed.data.download_url
            }
            
            // Get transcript URL
            if (recording.media_shortcuts?.transcript?.data?.download_url) {
              transcriptUrl = recording.media_shortcuts.transcript.data.download_url
            }

            // Get meeting name
            if (recording.media_shortcuts?.meeting_metadata?.data?.title) {
              meetingName = recording.media_shortcuts.meeting_metadata.data.title
            }
          }

          // Update the bot with complete data including status_changes
          const finalUpdateData: any = {}
          
          if (recordingUrl) {
            finalUpdateData.recording_url = recordingUrl
            finalUpdateData.recording_status = 'done'
          }

          if (transcriptUrl) {
            finalUpdateData.transcript_url = transcriptUrl
            finalUpdateData.transcript_status = 'done'
          }

          if (meetingName) {
            finalUpdateData.meeting_name = meetingName
          }

          // Store the complete status_changes array from Recall AI
          if (recallData.status_changes && Array.isArray(recallData.status_changes)) {
            finalUpdateData.status_changes = recallData.status_changes
          }

          if (Object.keys(finalUpdateData).length > 0) {
            const { error: finalUpdateError } = await supabase
              .from('bots')
              .update(finalUpdateData)
              .eq('id', botId)

            if (finalUpdateError) {
              console.error('Failed to update bot with final data:', finalUpdateError)
            } else {
              console.log(`Successfully updated bot ${botId} with final data:`, finalUpdateData)
              // Supabase real-time will automatically notify subscribers of this update
            }
          }
        } else {
          console.error('Failed to fetch bot data from Recall AI:', await recallResponse.text())
        }
      } catch (fetchError) {
        console.error('Error fetching bot data on bot.done:', fetchError)
      }
    }

    return NextResponse.json({
      success: true,
      bot_id: botId,
      event: eventType,
      status: status,
      updated_fields: updateData
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}