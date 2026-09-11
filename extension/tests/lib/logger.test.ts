import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../src/lib/logger';

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes info calls with the logger name', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    createLogger('X').info('hi');
    expect(spy).toHaveBeenCalledWith('[X]', 'hi');
  });

  it('prefixes warn calls with the logger name', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createLogger('X').warn('hi');
    expect(spy).toHaveBeenCalledWith('[X]', 'hi');
  });

  it('prefixes error calls with the logger name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('X').error('hi');
    expect(spy).toHaveBeenCalledWith('[X]', 'hi');
  });

  it('prefixes debug calls with the logger name', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    createLogger('X').debug('hi');
    expect(spy).toHaveBeenCalledWith('[X]', 'hi');
  });
});
