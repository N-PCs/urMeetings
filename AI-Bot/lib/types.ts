// Recall AI API Types

export interface RecallAICreateBotRequest {
  meeting_url: string
  bot_name: string
  output_media: {
    screenshare: {
      kind: 'webpage'
      config: {
        url: string
      }
    }
  }
}

export interface RecallAICreateBotResponse {
  id: string
  meeting_url: {
    meeting_id: string
    meeting_password: string
    tk: string | null
    zak: string | null
    platform: string
  }
  bot_name: string
  join_at: string
  recording_config: unknown
  status_changes: StatusChange[]
  recordings: Recording[]
  output_media: {
    screenshare: {
      kind: 'webpage'
      config: {
        url: string
      }
    }
  }
  automatic_leave: unknown
  calendar_meetings: unknown[]
  metadata: unknown
}

export interface StatusChange {
  code: string
  message: string | null
  created_at: string
  sub_code: string | null
}

export interface Recording {
  id: string
  created_at: string
  started_at: string
  completed_at: string
  expires_at: string | null
  status: {
    code: string
    sub_code: string | null
    updated_at: string
  }
  media_shortcuts: {
    video_mixed?: {
      id: string
      created_at: string
      status: {
        code: string
        sub_code: string | null
        updated_at: string
      }
      metadata: unknown
      data: {
        download_url: string
      }
      format: string
    }
    transcript?: {
      id: string
      created_at: string
      status: {
        code: string
        sub_code: string | null
        updated_at: string
      }
      metadata: unknown
      data: {
        download_url: string
        provider_data_download_url: string
      }
      diarization: unknown
      provider: unknown
    }
    participant_events?: unknown
    meeting_metadata?: {
      id: string
      created_at: string
      status: {
        code: string
        sub_code: string | null
        updated_at: string
      }
      metadata: unknown
      data: {
        title: string
        zoom?: {
          meeting_uuid: string
        }
      }
    }
    audio_mixed?: unknown
  }
  metadata: unknown
}

// Webhook Types
export interface WebhookPayload {
  data: {
    bot: {
      id: string
      metadata: unknown
    }
    data: {
      code: string
      sub_code: string | null
      updated_at: string
    }
    recording?: {
      id: string
      metadata: unknown
    }
    transcript?: {
      id: string
      metadata: unknown
    }
  }
  event: string
}