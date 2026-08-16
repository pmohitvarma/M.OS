// Focus Module v2 — Renderer
// Pure DOM rendering for single Missions panel, dual/single Progress cards, and Line Graphs.

class FocusRenderer {
  constructor() {
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
      progressSection: document.getElementById('fv2-progress-section'),
      progressTitleLeft: document.getElementById('fv2-progress-title-left'),
      progressCountLeft: document.getElementById('fv2-progress-count-left'),
      progressFillLeft: document.getElementById('fv2-progress-fill-left'),
      progressPercentLeft: document.getElementById('fv2-progress-percent-left'),
      progressTitleRight: document.getElementById('fv2-progress-title-right'),
      progressCountRight: document.getElementById('fv2-progress-count-right'),
      progressFillRight: document.getElementById('fv2-progress-fill-right'),
      progressPercentRight: document.getElementById('fv2-progress-percent-right'),
      thisWeekGraph: document.getElementById('fv2-this-week-graph'),
      last4WeeksGraph: document.getElementById('fv2-last-4-weeks-graph'),
      monthlyGraph: document.getElementById('fv2-monthly-graph'),
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

  // ── Single Missions Panel ──

  renderDailyList(missions, completions, dateStr, isScheduledFn) {
    const el = document.getElementById('fv2-daily-list');
    if (!el) return;

    if (!missions || missions.length === 0) {
      el.innerHTML = '<div class="fv2-empty-state">No missions created yet. Click "+ Add Mission" to start.</div>';
      return;
    }

    const completedIds = Array.isArray(completions[dateStr]) ? completions[dateStr].map(String) : [];

    // Sort missions according to requirements:
    // 1. Missions scheduled for selected date (active) first: uncompleted then completed
    // 2. Off-day missions (not scheduled for selected date) dimmed
    // 3. Paused missions dimmed
    const sorted = [...missions].sort((a, b) => {
      const aPaused = a.status === 'paused';
      const bPaused = b.status === 'paused';
      const aScheduled = typeof isScheduledFn === 'function' ? isScheduledFn(a, dateStr) : true;
      const bScheduled = typeof isScheduledFn === 'function' ? isScheduledFn(b, dateStr) : true;
      const aDone = completedIds.includes(String(a.id));
      const bDone = completedIds.includes(String(b.id));

      const getPriority = (isP, isS, isD) => {
        if (!isP && isS) {
          return isD ? 2 : 1; // 1: Active pending, 2: Active completed
        }
        if (!isP && !isS) return 3; // Off-day dimmed
        return 4; // Paused dimmed
      };

      return getPriority(aPaused, aScheduled, aDone) - getPriority(bPaused, bScheduled, bDone);
    });

    const html = sorted.map((m, i) => {
      const done = completedIds.includes(String(m.id));
      const isPaused = m.status === 'paused';
      const isScheduled = typeof isScheduledFn === 'function' ? isScheduledFn(m, dateStr) : true;
      const isActive = !isPaused && isScheduled;

      const rowClasses = ['fv2-mission-row'];
      let statusText = 'Pending';
      let statusClass = 'pending';

      if (done && isActive) {
        rowClasses.push('completed');
        statusText = 'Completed';
        statusClass = 'completed';
      }

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
      }

      const checkDisabled = !isActive ? ' disabled' : '';

      return `<div class="${rowClasses.join(' ')}" data-mission-id="${m.id}" style="animation-delay: ${i * 0.03}s">
        <button class="fv2-check-btn${done ? ' checked' : ''}${checkDisabled}" data-action="toggle" data-id="${m.id}" title="${isActive ? 'Toggle completion' : 'Mission is not active today'}"></button>
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

  // ── Progress Cards (Single vs Split) ──

  renderProgress(todayStats, selectedStats, isToday) {
    const sec = document.getElementById('fv2-progress-section');
    if (!sec) return;

    if (isToday) {
      sec.classList.remove('split');
      sec.classList.add('single-card');

      const titleLeft = document.getElementById('fv2-progress-title-left');
      const countLeft = document.getElementById('fv2-progress-count-left');
      const fillLeft = document.getElementById('fv2-progress-fill-left');
      const percentLeft = document.getElementById('fv2-progress-percent-left');

      if (titleLeft) titleLeft.textContent = "Today's Progress";
      if (countLeft) countLeft.textContent = `${todayStats.completed} of ${todayStats.total} completed`;
      if (fillLeft) fillLeft.style.width = `${todayStats.pct}%`;
      if (percentLeft) percentLeft.textContent = `${todayStats.pct}%`;
    } else {
      sec.classList.remove('single-card');
      sec.classList.add('split');

      // Left: Selected Date Progress
      const titleLeft = document.getElementById('fv2-progress-title-left');
      const countLeft = document.getElementById('fv2-progress-count-left');
      const fillLeft = document.getElementById('fv2-progress-fill-left');
      const percentLeft = document.getElementById('fv2-progress-percent-left');

      if (titleLeft) titleLeft.textContent = `Selected Date Progress (${selectedStats.dateFormatted || 'Selected Date'})`;
      if (countLeft) countLeft.textContent = `${selectedStats.completed} of ${selectedStats.total} completed`;
      if (fillLeft) fillLeft.style.width = `${selectedStats.pct}%`;
      if (percentLeft) percentLeft.textContent = `${selectedStats.pct}%`;

      // Right: Today's Progress
      const titleRight = document.getElementById('fv2-progress-title-right');
      const countRight = document.getElementById('fv2-progress-count-right');
      const fillRight = document.getElementById('fv2-progress-fill-right');
      const percentRight = document.getElementById('fv2-progress-percent-right');

      if (titleRight) titleRight.textContent = "Today's Progress";
      if (countRight) countRight.textContent = `${todayStats.completed} of ${todayStats.total} completed`;
      if (fillRight) fillRight.style.width = `${todayStats.pct}%`;
      if (percentRight) percentRight.textContent = `${todayStats.pct}%`;
    }
  }

  // ── Line Graphs ──

  renderThisWeekGraph(points) {
    const el = document.getElementById('fv2-this-week-graph');
    if (!el) return;
    el.innerHTML = this._createLineGraphSVG(points, { width: 800, height: 180 });
  }

  renderLast4WeeksGraph(points) {
    const el = document.getElementById('fv2-last-4-weeks-graph');
    if (!el) return;
    el.innerHTML = this._createLineGraphSVG(points, { width: 800, height: 190 });
  }

  renderMonthlyGraph(points) {
    const el = document.getElementById('fv2-monthly-graph');
    if (!el) return;
    el.innerHTML = this._createLineGraphSVG(points, { width: 800, height: 180 });
  }

  renderLibrary() {
    // Deprecated — single panel is used instead.
  }

  // ── Generic SVG Line Graph Builder ──

  _createLineGraphSVG(points, config = {}) {
    if (!points || points.length === 0) return '<div class="fv2-empty-state">No graph data available</div>';

    const svgWidth = config.width || 800;
    const svgHeight = config.height || 180;
    const padX = config.padX || 65;
    const padTop = 45;
    const padBottom = 48;

    const chartW = svgWidth - (padX * 2);
    const chartH = svgHeight - padTop - padBottom;

    const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;

    const coords = points.map((pt, i) => {
      const x = padX + (i * stepX);
      const clampPct = Math.min(100, Math.max(0, Math.round(pt.pct || 0)));
      const y = (svgHeight - padBottom) - ((clampPct / 100) * chartH);
      return { ...pt, x, y, clampPct };
    });

    // Path d line
    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    // Area fill
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const bottomY = (svgHeight - padBottom + 2).toFixed(1);
    const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const uid = Math.random().toString(36).substr(2, 6);
    const areaGradId = `area-grad-${uid}`;
    const lineGradId = `line-grad-${uid}`;

    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="fv2-line-graph-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${areaGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="${lineGradId}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#00f2fe"/>
          <stop offset="50%" stop-color="#38ef7d"/>
          <stop offset="100%" stop-color="#4facfe"/>
        </linearGradient>
        <filter id="glow-line-${uid}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>`;

    // Area fill
    svg += `<path d="${areaD}" fill="url(#${areaGradId})" />`;

    // Horizontal guide lines (0%, 50%, 100%)
    [0, 50, 100].forEach(level => {
      const gy = ((svgHeight - padBottom) - ((level / 100) * chartH)).toFixed(1);
      svg += `<line x1="${(padX - 15).toFixed(1)}" y1="${gy}" x2="${(svgWidth - padX + 15).toFixed(1)}" y2="${gy}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4 4" stroke-width="1" />`;
    });

    // Connected continuous line
    svg += `<path d="${pathD}" fill="none" stroke="url(#${lineGradId})" stroke-width="3.5" filter="url(#glow-line-${uid})" stroke-linecap="round" stroke-linejoin="round"/>`;

    // Dots, Percentage Text above dots, Labels below
    coords.forEach(pt => {
      const isAvg = pt.isAverage;
      const dotColor = isAvg ? '#00f2fe' : '#00f2fe';
      const valColor = isAvg ? '#ffdd67' : '#00f2fe';

      // Percentage text directly above dot
      svg += `<text x="${pt.x.toFixed(1)}" y="${(pt.y - 12).toFixed(1)}" text-anchor="middle" fill="${valColor}" class="fv2-graph-val-text">${pt.clampPct}%</text>`;

      // Dot circle
      svg += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${isAvg ? 6 : 5}" fill="${dotColor}" stroke="#090d16" stroke-width="2" class="fv2-graph-dot-circle${isAvg ? ' avg-dot' : ''}" />`;

      // Label below X axis
      svg += `<text x="${pt.x.toFixed(1)}" y="${(svgHeight - padBottom + 20).toFixed(1)}" text-anchor="middle" fill="${isAvg ? '#ffdd67' : 'rgba(255,255,255,0.75)'}" class="fv2-graph-label-text${isAvg ? ' avg' : ''}">${this._esc(pt.label)}</text>`;

      if (pt.sublabel) {
        svg += `<text x="${pt.x.toFixed(1)}" y="${(svgHeight - padBottom + 34).toFixed(1)}" text-anchor="middle" fill="rgba(255,255,255,0.4)" class="fv2-graph-sublabel-text">${this._esc(pt.sublabel)}</text>`;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  // ── Helpers ──

  _scheduleLabel(m) {
    if (m.schedule === 'daily') return 'Daily';
    if (m.schedule === 'weekdays') {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if (Array.isArray(m.activeDays) && m.activeDays.length === 5 &&
          [1,2,3,4,5].every(d => m.activeDays.includes(d))) {
        return 'Weekdays';
      }
      return Array.isArray(m.activeDays) ? m.activeDays.map(d => dayLabels[d]).join(', ') || 'Weekdays' : 'Weekdays';
    }
    if (m.schedule === 'specific') return 'Specific Dates';
    return m.schedule;
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  _parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}

window.FocusRenderer = FocusRenderer;
