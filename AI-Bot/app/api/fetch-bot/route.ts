import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bot_id = searchParams.get('bot_id')

    if (!bot_id) {
      return NextResponse.json(
        { error: 'Missing required query parameter: bot_id' },
        { status: 400 }
      )
    }

    // Call Recall AI's retrieve bot endpoint
    const recallResponse = await fetch(`${process.env.RECALL_AI_BASE_URL}/api/v1/bot/${bot_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.RECALL_AI_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    })

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text()
      return NextResponse.json(
        { error: 'Failed to fetch bot from Recall AI', details: errorText },
        { status: 500 }
      )
    }

    const recallData = await recallResponse.json()

    // Extract recording and transcript URLs
    let recordingUrl = null
    let transcriptUrl = null

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
    }

    // Update bot information in Supabase
    const updateData: any = {}

    // Update status based on latest status change
    if (recallData.status_changes && recallData.status_changes.length > 0) {
      const latestStatus = recallData.status_changes[recallData.status_changes.length - 1]
      updateData.bot_status = latestStatus.code
    }

    // Update recording and transcript URLs if available
    if (recordingUrl) {
      updateData.recording_url = recordingUrl
      updateData.recording_status = 'done'
    }

    if (transcriptUrl) {
      updateData.transcript_url = transcriptUrl
      updateData.transcript_status = 'done'
    }

    // Update meeting name if available
    if (recallData.recordings?.[0]?.media_shortcuts?.meeting_metadata?.data?.title) {
      updateData.meeting_name = recallData.recordings[0].media_shortcuts.meeting_metadata.data.title
    }

    const { data, error } = await supabase
      .from('bots')
      .update(updateData)
      .eq('id', bot_id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update bot data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bot_data: data,
      recall_data: recallData,
      recording_url: recordingUrl,
      transcript_url: transcriptUrl
    })

  } catch (error) {
    console.error('Fetch bot error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}