import { describe, it, expect } from 'vitest';
import { SEED, DEMO_TRANSCRIPT, deterministicAnalyze, resolveConflict, type Decision } from '../lib/syncexec';
import { confirmedDefenses, decisionLineage, memoryAnswer } from '../lib/syncexec.memory';

const meetings = SEED.map((m,i) => ({ id: `m${i}`, date: m.date, title: m.title }));
const decisions: Decision[] = SEED.flatMap((m,i) => m.decisions.map((d,j) => ({ ...d, id: `d${i}${j}`, meeting_id: `m${i}`, created_at: `${m.date}T12:00:00Z` })));
describe('grounded meeting memory', () => {
  it('keeps PostgreSQL and JWT governing before overrides', () => {
    const rows = decisionLineage(decisions, meetings, []);
    expect(rows.find(r => r.decision.id === 'd01')?.status).toBe('governing');
    expect(rows.find(r => r.decision.id === 'd11')?.status).toBe('governing');
  });
  it('supersedes Nov 15 with saved Nov 25 while preserving database', () => {
    const next = { ...decisions[0], id: 'override', meeting_id: 'm2', created_at: '2026-10-31T12:00:00Z', speaker: 'Priya (PM)', decision_text: '[2026-10-31] Public beta launch date is November 25, 2026.' } as Decision;
    const rows = decisionLineage([...decisions, next], [...meetings, { id: 'm2', date: '2026-10-31', title: 'Sync' }], []);
    expect(rows.find(r => r.decision.id === 'd00')?.successor?.id).toBe('override');
    expect(rows.find(r => r.decision.id === 'd01')?.status).toBe('governing');
  });
  it('protects PostgreSQL only with confirmed rejection evidence', () => {
    const a = deterministicAnalyze(DEMO_TRANSCRIPT, decisions);
    const rejected = resolveConflict(a, 1, 'rejected');
    const defenses = confirmedDefenses(rejected, '2026-10-31');
    expect(decisionLineage(decisions, meetings, defenses).find(r => r.decision.id === 'd01')?.status).toBe('protected');
    expect(memoryAnswer('Why was MongoDB blocked?', decisions, [], meetings, []).text).toContain('No confirmed rejection');
    expect(memoryAnswer('Why was MongoDB blocked?', decisions, [], meetings, defenses).text).toContain('Defended on Oct 31');
  });
  it('supersedes the $5,000 cap only with a saved $8,000 budget', () => {
    const override: Decision = { id: 'budget', meeting_id: null, created_at: '2026-10-31T12:00:00Z', speaker: 'Priya (PM)', decision_text: '[2026-10-31] Increase Q4 beta marketing budget to $8,000.' };
    const rows = decisionLineage([...decisions, override], meetings, []);
    expect(rows.find(r => r.decision.id === 'd10')?.successor?.id).toBe('budget');
    expect(rows.find(r => r.decision.id === 'd11')?.status).toBe('governing');
  });
  it('groups actual Nov 1/2 open urgent tasks by owner and cites meeting not deadline', () => {
    const tasks = SEED.flatMap((m,i) => m.tasks.map((t,j) => ({ ...t, id: `t${i}${j}`, meeting_id: `m${i}`, synced_to_tracker: false })));
    const result = memoryAnswer('urgent tasks within 48h', decisions, tasks, meetings, []);
    expect(result.sources.map(s => s.id)).toEqual(['t01','t11','t10']);
    expect(result.sources.find(s => s.id === 't10')?.date).toBe('2026-10-20');
    expect(result.text).not.toContain('Provision production');
  });
});