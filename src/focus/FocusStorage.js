// Focus Module v2 — Storage Layer
// Isolated localStorage persistence with v2 storage keys.
// Never reads any previous Focus keys.

class FocusStorage {
  constructor() {
    this.MISSIONS_KEY = 'mos_focus_v2_missions';
    this.COMPLETIONS_KEY = 'mos_focus_v2_completions';
  }

  // ── Missions ──

  loadMissions() {
    try {
      const raw = localStorage.getItem(this.MISSIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      // Ensure data integrity
      return parsed.map(m => ({
        id: m.id || '',
        name: m.name || '',
        duration: m.duration || 'ongoing',
        startDate: m.startDate || '',
        endDate: m.endDate || '',
        schedule: m.schedule || 'daily',
        activeDays: Array.isArray(m.activeDays) ? m.activeDays : [],
        specificDates: Array.isArray(m.specificDates) ? m.specificDates : [],
        status: m.status || 'active',
        createdAt: m.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  saveMissions(missions) {
    try {
      localStorage.setItem(this.MISSIONS_KEY, JSON.stringify(missions));
    } catch (e) {
      console.error('[FocusStorage] Failed to save missions:', e);
    }
  }

  // ── Completions ──

  loadCompletions() {
    try {
      const raw = localStorage.getItem(this.COMPLETIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
      return parsed;
    } catch {
      return {};
    }
  }

  saveCompletions(completions) {
    try {
      localStorage.setItem(this.COMPLETIONS_KEY, JSON.stringify(completions));
    } catch (e) {
      console.error('[FocusStorage] Failed to save completions:', e);
    }
  }

  // ── Cleanup ──
  // Remove completion entries for missions that no longer exist
  cleanup(missions, completions) {
    const missionIds = new Set(missions.map(m => m.id));
    let changed = false;
    for (const dateKey of Object.keys(completions)) {
      const filtered = completions[dateKey].filter(id => missionIds.has(id));
      if (filtered.length !== completions[dateKey].length) {
        completions[dateKey] = filtered;
        changed = true;
      }
      if (filtered.length === 0) {
        delete completions[dateKey];
        changed = true;
      }
    }
    if (changed) this.saveCompletions(completions);
    return completions;
  }
}

window.FocusStorage = FocusStorage;
