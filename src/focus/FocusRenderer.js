// Focus Module v2 — Renderer
// Pure DOM rendering. Never binds events. Returns fresh markup each time.

class FocusRenderer {
  constructor() {
    // Cache DOM containers
    this.els = {
      dateDay: document.getElementById('fv2-date-day'),
      dateFull: document.getElementById('fv2-date-full'),
      jumpToday: document.getElementById('fv2-jump-today'),
      datePicker: document.getElementById('fv2-date-picker'),
      ghostPrevLabel: document.getElementById('fv2-ghost-prev-label'),
      ghostPrevDate: document.getElementById('fv2-ghost-prev-date'),
      ghostNextLabel: document.getElementById('fv2-ghost-next-label'),
      ghostNextDate: document.getElementById('fv2-ghost-next-date'),
      dailyList: document.getElementById('fv2-daily-list'),
      progressHeader: null, // set below
      progressCount: document.getElementById('fv2-progress-count'),
      progressFill: document.getElementById('fv2-progress-fill'),
      progressPercent: document.getElementById('fv2-progress-percent'),
      libraryList: document.getElementById('fv2-library-list'),
    };
  }

  // ── Date Navigation ──

  renderDateNav(dateStr, isToday) {
    const date = this._parseDate(dateStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (this.els.dateDay) {
      this.els.dateDay.textContent = dayNames[date.getDay()];
    }
    if (this.els.dateFull) {
      this.els.dateFull.textContent = `${date.getDate()} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`;
    }

    // Jump to Today button visibility
    if (this.els.jumpToday) {
      this.els.jumpToday.hidden = isToday;
    }

    // Ghost cards
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    if (this.els.ghostPrevDate) {
      this.els.ghostPrevDate.textContent = `${prev.getDate()} ${monthNames[prev.getMonth()].slice(0, 3)}`;
    }
    if (this.els.ghostNextDate) {
      this.els.ghostNextDate.textContent = `${next.getDate()} ${monthNames[next.getMonth()].slice(0, 3)}`;
    }
  }

  // ── Daily Checklist ──

  renderDailyList(missions, completions, dateStr, isActiveFn) {
    const el = document.getElementById('fv2-daily-list');
    if (!el) return;

    if (!missions || missions.length === 0) {
      el.innerHTML = '<div class="fv2-empty-state">No missions created yet. Click "+ Add Mission" to start.</div>';
      return;
    }

    const completedIds = Array.isArray(completions[dateStr]) ? completions[dateStr] : [];
    const html = missions.map((m, i) => {
      const done = completedIds.map(String).includes(String(m.id));
      const isPaused = m.status === 'paused';
      const isActive = typeof isActiveFn === 'function' ? isActiveFn(m, dateStr) : !isPaused;

      const rowClasses = ['fv2-mission-row'];
      let statusText = 'Pending';
      let statusClass = 'pending';

      if (done) rowClasses.push('completed');

      if (!isActive) {
        rowClasses.push('dimmed');
        if (isPaused) {
          rowClasses.push('paused');
          statusText = 'Paused';
          statusClass = 'paused';
        } else {
          rowClasses.push('off-day');
          statusText = 'Off-day';
          statusClass = 'off-day';
        }
      } else if (done) {
        statusText = 'Completed';
        statusClass = 'completed';
      }

      return `<div class="${rowClasses.join(' ')}" data-mission-id="${m.id}" style="animation-delay: ${i * 0.04}s">
        <button class="fv2-check-btn${done ? ' checked' : ''}" data-action="toggle" data-id="${m.id}" title="Toggle completion"></button>
        <div class="fv2-mission-info">
          <span class="fv2-mission-name">${this._esc(m.name)}</span>
        </div>
        <span class="fv2-schedule-badge">${this._scheduleLabel(m)}</span>
        <span class="fv2-status-badge ${statusClass}">${statusText}</span>
        <div class="fv2-actions-dropdown-container">
          <button class="fv2-dot-btn" title="More options">⋮</button>
          <div class="fv2-dropdown-menu">
            <button class="fv2-dropdown-item" data-action="edit" data-id="${m.id}">✏️ Edit</button>
            <button class="fv2-dropdown-item" data-action="${isPaused ? 'resume' : 'pause'}" data-id="${m.id}">${isPaused ? '▶️ Resume' : '⏸️ Pause'}</button>
            <button class="fv2-dropdown-item danger" data-action="delete" data-id="${m.id}">🗑️ Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = html;
  }

  // ── Progress Bar ──

  renderProgress(completed, total) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (this.els.progressCount) {
      this.els.progressCount.textContent = `${completed} of ${total} completed`;
    }
    if (this.els.progressFill) {
      this.els.progressFill.style.width = `${pct}%`;
    }
    if (this.els.progressPercent) {
      this.els.progressPercent.textContent = `${pct}%`;
    }
  }

  // ── Mission Library ──

  renderLibrary(missions, manageMode = false) {
    const el = document.getElementById('fv2-library-list');
    if (!el) return;

    if (missions.length === 0) {
      el.innerHTML = '<div class="fv2-empty-state">No missions created yet. Click "+ Add Mission" to start.</div>';
      return;
    }

    const html = missions.map((m, i) => {
      const isPaused = m.status === 'paused';
      const classes = ['fv2-lib-item'];
      if (isPaused) classes.push('paused');

      return `<div class="${classes.join(' ')}" data-mission-id="${m.id}" style="animation-delay: ${i * 0.04}s;">
        <div class="fv2-lib-header">
          <span class="fv2-lib-name">${this._esc(m.name)}</span>
          <div class="fv2-actions-dropdown-container">
            <button class="fv2-dot-btn">⋮</button>
            <div class="fv2-dropdown-menu">
              <button class="fv2-dropdown-item" data-action="edit" data-id="${m.id}">✏️ Edit</button>
              <button class="fv2-dropdown-item" data-action="${isPaused ? 'resume' : 'pause'}" data-id="${m.id}">${isPaused ? '▶️ Resume' : '⏸️ Pause'}</button>
              <button class="fv2-dropdown-item danger" data-action="delete" data-id="${m.id}">🗑️ Delete</button>
            </div>
          </div>
        </div>
        <div class="fv2-lib-meta">
          <span class="fv2-lib-schedule">${this._scheduleLabel(m)}</span>
          <span class="fv2-lib-status-dot ${m.status}"></span>
          <span class="fv2-lib-status-text ${m.status}">${m.status}</span>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = html;
  }

  // ── Helpers ──

  _scheduleLabel(m) {
    if (m.schedule === 'daily') return 'Daily';
    if (m.schedule === 'weekdays') {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if (m.activeDays.length === 5 &&
          [1,2,3,4,5].every(d => m.activeDays.includes(d))) {
        return 'Weekdays';
      }
      return m.activeDays.map(d => dayLabels[d]).join(', ') || 'Weekdays';
    }
    if (m.schedule === 'specific') return 'Specific Dates';
    return m.schedule;
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}

window.FocusRenderer = FocusRenderer;
