import { describe, it, expect } from 'vitest';
import { makeMessage } from '../../src/lib/messaging';

describe('makeMessage', () => {
  it('builds an envelope from a type and payload', () => {
    const msg = makeMessage('X', { a: 1 });
    expect(msg).toEqual({ type: 'X', payload: { a: 1 } });
  });

  it('preserves payload identity and shape', () => {
    const payload = { foo: 'bar', n: 42 };
    const msg = makeMessage('EVENT', payload);
    expect(msg.type).toBe('EVENT');
    expect(msg.payload).toBe(payload);
  });

  it('supports generic typing (compile-time check)', () => {
    // Compile-only assertion: the generic parameters must flow through to
    // the returned envelope. If this ever regresses, tsc will fail before
    // vitest even runs. No runtime assertion needed.
    const msg = makeMessage<'PING', { seq: number }>('PING', { seq: 7 });
    const type: 'PING' = msg.type;
    const seq: number = msg.payload.seq;
    expect(type).toBe('PING');
    expect(seq).toBe(7);
  });
});
