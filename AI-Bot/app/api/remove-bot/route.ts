import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bot_id } = body

    if (!bot_id) {
      return NextResponse.json(
        { error: 'Missing required field: bot_id' },
        { status: 400 }
      )
    }

    // Call Recall AI's leave_call endpoint
    const recallResponse = await fetch(`${process.env.RECALL_AI_BASE_URL}/api/v1/bot/${bot_id}/leave_call/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.RECALL_AI_API_TOKEN}`,
        'Accept': 'application/json',
      }
    })

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text()
      return NextResponse.json(
        { error: 'Failed to remove bot from call', details: errorText },
        { status: recallResponse.status }
      )
    }

    const recallData = await recallResponse.json()

    // Update bot status in Supabase to indicate it's leaving
    const { data: updatedBot, error } = await supabase
      .from('bots')
      .update({ 
        bot_status: 'leaving_call'
      })
      .eq('id', bot_id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating bot status:', error)
      // Don't fail the request if database update fails, as the bot was successfully removed from call
      console.warn(`Bot ${bot_id} was removed from call but database update failed:`, error.message)
    }

    // Extract current status from the response
    let currentStatus = 'leaving_call'
    if (recallData.status_changes && recallData.status_changes.length > 0) {
      const latestStatus = recallData.status_changes[recallData.status_changes.length - 1]
      currentStatus = latestStatus.code
    }

    return NextResponse.json({
      success: true,
      message: 'Bot successfully removed from call',
      bot_id: bot_id,
      current_status: currentStatus,
      recall_response: recallData
    })

  } catch (error) {
    console.error('Remove bot error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}