import type { SessionEvent, NegotiationTurn } from '@agentclear/types'
import type { NegotiationSession } from '../negotiation/session.js'

export interface RecordedEvent {
  timestamp: Date
  event: SessionEvent
}

/**
 * Captures session events for replay and assertions in tests.
 * Attach to a NegotiationSession to record all events.
 */
export class SessionRecorder {
  private events: RecordedEvent[] = []
  private attachedSessionId: string | null = null

  /**
   * Attach to a NegotiationSession and start recording events.
   */
  attach(session: NegotiationSession): void {
    this.attachedSessionId = session.id
    session.on('event', (event: SessionEvent) => {
      this.events.push({
        timestamp: new Date(),
        event,
      })
    })
  }

  /**
   * Get all recorded events.
   */
  getEvents(): ReadonlyArray<RecordedEvent> {
    return this.events
  }

  /**
   * Get events of a specific type.
   */
  getEventsByType(type: SessionEvent['type']): RecordedEvent[] {
    return this.events.filter(e => e.event.type === type)
  }

  /**
   * Get all turns from recorded events (proposed + countered + accepted).
   */
  getTurns(): NegotiationTurn[] {
    return this.events
      .filter(e =>
        e.event.type === 'turn.proposed' ||
        e.event.type === 'turn.countered' ||
        e.event.type === 'turn.accepted',
      )
      .map(e => {
        const event = e.event as { type: string; turn: NegotiationTurn }
        return event.turn
      })
  }

  /**
   * Get the number of recorded events.
   */
  get eventCount(): number {
    return this.events.length
  }

  /**
   * Check if session was completed (accepted).
   */
  get wasAccepted(): boolean {
    return this.events.some(e => e.event.type === 'turn.accepted')
  }

  /**
   * Check if session was rejected.
   */
  get wasRejected(): boolean {
    return this.events.some(e => e.event.type === 'turn.rejected')
  }

  /**
   * Get the rejection reason, if any.
   */
  get rejectionReason(): string | null {
    const rejection = this.events.find(e => e.event.type === 'turn.rejected')
    if (rejection && rejection.event.type === 'turn.rejected') {
      return rejection.event.reason
    }
    return null
  }

  /**
   * Clear all recorded events.
   */
  clear(): void {
    this.events = []
  }

  /**
   * Export recorded events as JSON for replay.
   */
  toJSON(): string {
    return JSON.stringify(this.events, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    )
  }
}
