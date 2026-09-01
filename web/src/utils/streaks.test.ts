import { describe, it, expect } from 'vitest';
import { computeHabitStats, completionRateInRange, scheduledAndDoneInRange } from './streaks';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

describe('computeHabitStats', () => {
  it('cuenta una racha actual simple de días consecutivos', () => {
    // hoy = 2026-08-30 (domingo). Completado sáb/vie/jue/hoy.
    const dates = ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
    const r = computeHabitStats(dates, ALL_DAYS, '2026-08-01', '2026-08-30');
    expect(r.currentStreak).toBe(4);
    expect(r.doneToday).toBe(true);
  });

  it('no rompe la racha si hoy todavía no se marcó (el día no ha terminado)', () => {
    const dates = ['2026-08-27', '2026-08-28', '2026-08-29']; // sin hoy
    const r = computeHabitStats(dates, ALL_DAYS, '2026-08-01', '2026-08-30');
    expect(r.doneToday).toBe(false);
    expect(r.currentStreak).toBe(3); // cuenta desde ayer hacia atrás
  });

  it('rompe la racha si falta un día completado en el medio', () => {
    const dates = ['2026-08-25', '2026-08-26', '2026-08-28', '2026-08-29', '2026-08-30'];
    // falta 2026-08-27 → la racha actual solo cuenta 28,29,30
    const r = computeHabitStats(dates, ALL_DAYS, '2026-08-01', '2026-08-30');
    expect(r.currentStreak).toBe(3);
    expect(r.bestStreak).toBeGreaterThanOrEqual(3);
  });

  it('respeta los días programados: un día no programado no rompe la racha', () => {
    // Hábito programado solo lunes a viernes (1-5). 2026-08-29 es sábado, 30 domingo.
    const WEEKDAYS = [1, 2, 3, 4, 5];
    // Completa viernes 28 y luego lunes 31 (sin marcar sáb/dom, que no aplican).
    const dates = ['2026-08-28', '2026-08-31'];
    const r = computeHabitStats(dates, WEEKDAYS, '2026-08-01', '2026-08-31');
    expect(r.currentStreak).toBe(2); // viernes + lunes, el fin de semana se salta
  });

  it('calcula la mejor racha histórica aunque la racha actual sea 0', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];
    // nada completado después → racha actual = 0, mejor racha = 5
    const r = computeHabitStats(dates, ALL_DAYS, '2026-08-01', '2026-08-30');
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreak).toBe(5);
  });

  it('sin completaciones, todo queda en cero', () => {
    const r = computeHabitStats([], ALL_DAYS, '2026-08-01', '2026-08-30');
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreak).toBe(0);
    expect(r.totalCompletions).toBe(0);
    expect(r.lastCompletedDate).toBeNull();
  });

  it('no cuenta antes del start_date del hábito', () => {
    // Aunque el usuario tenga completaciones "de otro hábito" en fechas viejas,
    // start_date acota el cálculo — esto documenta el comportamiento esperado.
    const dates = ['2026-08-29', '2026-08-30'];
    const r = computeHabitStats(dates, ALL_DAYS, '2026-08-29', '2026-08-30');
    expect(r.currentStreak).toBe(2);
  });
});

describe('completionRateInRange', () => {
  it('devuelve 1 cuando se cumplió todos los días programados del rango', () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
    const rate = completionRateInRange(dates, ALL_DAYS, '2026-08-01', '2026-08-03', '2026-08-01');
    expect(rate).toBe(1);
  });

  it('devuelve 0.5 cuando se cumplió la mitad de los días programados', () => {
    const dates = ['2026-08-01', '2026-08-03'];
    const rate = completionRateInRange(dates, ALL_DAYS, '2026-08-01', '2026-08-04', '2026-08-01');
    expect(rate).toBe(0.5);
  });

  it('devuelve 0 si no hay días programados en el rango (evita división por cero)', () => {
    const rate = completionRateInRange([], [1, 2, 3, 4, 5], '2026-08-01', '2026-08-02', '2026-08-01');
    // 2026-08-01 es sábado, 08-02 domingo: ningún día programado (lun-vie)
    expect(rate).toBe(0);
  });

  it('acota el rango al start_date del hábito si el rango pedido empieza antes', () => {
    const dates = ['2026-08-05', '2026-08-06'];
    const rate = completionRateInRange(dates, ALL_DAYS, '2026-08-01', '2026-08-06', '2026-08-05');
    // Solo cuentan 08-05 y 08-06 (el hábito no existía antes) → 2/2 = 1
    expect(rate).toBe(1);
  });
});

describe('scheduledAndDoneInRange', () => {
  it('no cuenta como programados los días anteriores al start_date del hábito', () => {
    // Rango de 10 días, pero el hábito solo existe desde el día 8.
    const dates = ['2026-08-08', '2026-08-09'];
    const r = scheduledAndDoneInRange(dates, ALL_DAYS, '2026-08-01', '2026-08-10', '2026-08-08');
    expect(r.scheduled).toBe(3); // 08, 09, 10
    expect(r.done).toBe(2);
  });

  it('permite sumar entre varios hábitos para un % ponderado real (no promedio de promedios)', () => {
    // Hábito A: 1/1 programado. Hábito B: 1/10 programado.
    // Promediar los dos % (100% y 10%) da 55%, pero el % ponderado real es 2/11 ≈ 18%.
    const a = scheduledAndDoneInRange(['2026-08-10'], ALL_DAYS, '2026-08-10', '2026-08-10', '2026-08-10');
    const b = scheduledAndDoneInRange(['2026-08-01'], ALL_DAYS, '2026-08-01', '2026-08-10', '2026-08-01');
    const totalScheduled = a.scheduled + b.scheduled;
    const totalDone = a.done + b.done;
    expect(totalScheduled).toBe(11);
    expect(totalDone).toBe(2);
    expect(Math.round((totalDone / totalScheduled) * 100)).toBe(18);
  });
});
