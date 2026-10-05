import type { BioPayload } from '@bio-sdk/protocol';

export interface SessionRecord {
  id: string;
  firstSeen: number;
  lastSeen: number;
  payloads: BioPayload[];
  totalEvents: number;
}

/** In-memory ring buffer of sessions, capped at maxSessions. */
export class SessionStore {
  private readonly _sessions = new Map<string, SessionRecord>();
  private readonly _order: string[] = [];

  constructor(private readonly _maxSessions = 200) {}

  upsert(payload: BioPayload): SessionRecord {
    let session = this._sessions.get(payload.sessionId);
    if (!session) {
      if (this._order.length >= this._maxSessions) {
        const oldest = this._order.shift();
        if (oldest !== undefined) this._sessions.delete(oldest);
      }
      session = {
        id: payload.sessionId,
        firstSeen: payload.ts,
        lastSeen: payload.ts,
        payloads: [],
        totalEvents: 0,
      };
      this._sessions.set(payload.sessionId, session);
      this._order.push(payload.sessionId);
    }
    session.lastSeen = payload.ts;
    session.payloads.push(payload);
    session.totalEvents += payload.events.length;
    return session;
  }

  getAll(): SessionRecord[] {
    return [...this._sessions.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getById(id: string): SessionRecord | undefined {
    return this._sessions.get(id);
  }

  get size(): number {
    return this._sessions.size;
  }
}
