import { describe, it, expect } from 'vitest';
import { occursOn, nextOccurrence, repeatSummary, isCompletedOn } from './reminders';
import type { Reminder } from '../types/domain';

function make(partial: Partial<Reminder>): Reminder {
  return {
    id: 'r1', user_id: 'u', title: 't', description: null, category: 'personal',
    priority: 'media', remind_date: '2026-01-05', remind_time: null,
    repeat: 'none', repeat_days: [], repeat_day_of_month: null,
    status: 'pending', completed_at: null, created_at: '', updated_at: '',
    ...partial,
  };
}

describe('occursOn', () => {
  it('una sola vez: solo su fecha exacta', () => {
    const r = make({ repeat: 'none', remind_date: '2026-01-05' });
    expect(occursOn(r, '2026-01-05')).toBe(true);
    expect(occursOn(r, '2026-01-06')).toBe(false);
    expect(occursOn(r, '2026-01-04')).toBe(false);
  });

  it('diario: todos los días desde la fecha de inicio', () => {
    const r = make({ repeat: 'daily', remind_date: '2026-01-05' });
    expect(occursOn(r, '2026-01-05')).toBe(true);
    expect(occursOn(r, '2026-02-01')).toBe(true);
    expect(occursOn(r, '2026-01-04')).toBe(false); // antes del inicio
  });

  it('días de semana: lunes a viernes', () => {
    const r = make({ repeat: 'weekdays', remind_date: '2026-01-01' });
    expect(occursOn(r, '2026-01-05')).toBe(true);  // lunes
    expect(occursOn(r, '2026-01-09')).toBe(true);  // viernes
    expect(occursOn(r, '2026-01-10')).toBe(false); // sábado
    expect(occursOn(r, '2026-01-11')).toBe(false); // domingo
  });

  it('semanal: solo los días marcados (0=dom..6=sab)', () => {
    // lunes(1), miércoles(3), viernes(5)
    const r = make({ repeat: 'weekly', repeat_days: [1, 3, 5], remind_date: '2026-01-01' });
    expect(occursOn(r, '2026-01-05')).toBe(true);  // lunes
    expect(occursOn(r, '2026-01-06')).toBe(false); // martes
    expect(occursOn(r, '2026-01-07')).toBe(true);  // miércoles
  });

  it('mensual: día 5 de cada mes, y cae al último día en meses cortos', () => {
    const r = make({ repeat: 'monthly', repeat_day_of_month: 5, remind_date: '2026-01-05' });
    expect(occursOn(r, '2026-02-05')).toBe(true);
    expect(occursOn(r, '2026-03-05')).toBe(true);
    expect(occursOn(r, '2026-02-04')).toBe(false);

    const r31 = make({ repeat: 'monthly', repeat_day_of_month: 31, remind_date: '2026-01-31' });
    expect(occursOn(r31, '2026-02-28')).toBe(true); // febrero: último día
    expect(occursOn(r31, '2026-02-27')).toBe(false);
  });
});

describe('nextOccurrence', () => {
  it('una vez futura', () => {
    const r = make({ repeat: 'none', remind_date: '2026-01-10' });
    expect(nextOccurrence(r, '2026-01-01')).toBe('2026-01-10');
    expect(nextOccurrence(r, '2026-01-11')).toBe(null);
  });
  it('semanal encuentra la próxima ocurrencia', () => {
    const r = make({ repeat: 'weekly', repeat_days: [1], remind_date: '2026-01-01' }); // lunes
    expect(nextOccurrence(r, '2026-01-06')).toBe('2026-01-12'); // siguiente lunes
  });
});

describe('isCompletedOn', () => {
  it('no recurrente usa status', () => {
    const done = make({ repeat: 'none', status: 'completed' });
    const pending = make({ repeat: 'none', status: 'pending' });
    expect(isCompletedOn(done, new Set(), '2026-01-05')).toBe(true);
    expect(isCompletedOn(pending, new Set(), '2026-01-05')).toBe(false);
  });
  it('recurrente usa el set de fechas completadas', () => {
    const r = make({ repeat: 'daily' });
    expect(isCompletedOn(r, new Set(['2026-01-05']), '2026-01-05')).toBe(true);
    expect(isCompletedOn(r, new Set(['2026-01-05']), '2026-01-06')).toBe(false);
  });
});

describe('repeatSummary', () => {
  it('describe la recurrencia', () => {
    expect(repeatSummary(make({ repeat: 'none' }))).toBe('Una vez');
    expect(repeatSummary(make({ repeat: 'daily' }))).toBe('Todos los días');
    expect(repeatSummary(make({ repeat: 'monthly', repeat_day_of_month: 5 }))).toContain('5');
  });
});
