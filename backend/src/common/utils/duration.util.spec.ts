import { parseDurationToMs } from './duration.util';

describe('parseDurationToMs', () => {
  it.each([
    ['15m', 15 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
    ['30s', 30_000],
    ['500ms', 500],
    ['1h', 3_600_000],
  ])('parses "%s" as %i ms', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it('throws on an unrecognized format', () => {
    expect(() => parseDurationToMs('garbage')).toThrow('Invalid duration string');
  });

  it('throws on a missing unit', () => {
    expect(() => parseDurationToMs('15')).toThrow();
  });

  it('throws on an unsupported unit', () => {
    expect(() => parseDurationToMs('15y')).toThrow();
  });
});
