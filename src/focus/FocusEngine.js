// Focus Module v2 — Engine (Orchestrator)
// Owns state, coordinates Storage ↔ Renderer ↔ Events ↔ Animations.
// Follows: User Action → Update State → Save → Render

class FocusEngine {
  constructor() {
    window.focusEngineInstance = this;
    this.storage = new FocusStorage();
    this.renderer = new FocusRenderer();
    this.events = new FocusEvents(this);
    this.anims = new FocusAnimations();

    // ── State ──
    this.missions = [];
    this.completions = {};
    this.selectedDate = this._today();
    this.editingId = null;
    this._calendarBaseDate = new Date();
    this._editSpecificDates = null;
    this.manageMode = false;

    this.init();
  }

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════

  init() {
    this.missions = this.storage.loadMissions();
    this.completions = this.storage.loadCompletions();
    this.storage.cleanup(this.missions, this.completions);
    this.events.bindAll();
    this.renderAll();
  }

  // ══════════════════════════════════════════
  // DATE HELPERS
  // ══════════════════════════════════════════

  _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _shiftDate(dateStr, days) {
    const d = this._parseDate(dateStr);
    d.setDate(d.getDate() + days);
    return this._formatDate(d);
  }

  _formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  _isToday(dateStr) {
    return dateStr === this._today();
  }

  // ══════════════════════════════════════════
  // SCHEDULING LOGIC
  // ══════════════════════════════════════════

  _getMissionCreatedDate(mission) {
    if (!mission || !mission.createdAt) return '';
    try {
      const d = new Date(mission.createdAt);
      if (isNaN(d.getTime())) return mission.createdAt.slice(0, 10);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return mission.createdAt.slice(0, 10);
    }
  }

  _isMissionScheduledFor(mission, dateStr) {
    // Creation date check: Missions only apply from the date they were created
    const createdDate = this._getMissionCreatedDate(mission);
    if (createdDate && dateStr < createdDate) {
      // Allow range duration missions if explicit startDate is set earlier
      if (mission.duration === 'range' && mission.startDate && dateStr >= mission.startDate) {
        // explicit range start date allowed
      } else {
        return false;
      }
    }

    // Date range check
    if (mission.duration === 'range') {
      if (mission.startDate && dateStr < mission.startDate) return false;
      if (mission.endDate && dateStr > mission.endDate) return false;
    }

    if (mission.schedule === 'daily') return true;

    if (mission.schedule === 'weekdays') {
      const dayOfWeek = this._parseDate(dateStr).getDay();
      return Array.isArray(mission.activeDays) && mission.activeDays.includes(dayOfWeek);
    }

    if (mission.schedule === 'specific') {
      return Array.isArray(mission.specificDates) && mission.specificDates.includes(dateStr);
    }

    return false;
  }

  _isMissionActiveFor(mission, dateStr) {
    if (mission.status === 'paused') return false;
    return this._isMissionScheduledFor(mission, dateStr);
  }

  _getMissionsForDate(dateStr) {
    return this.missions.filter(m => this._isMissionScheduledFor(m, dateStr));
  }

  // ══════════════════════════════════════════
  // COMPLETIONS
  // ══════════════════════════════════════════

  _isCompleted(missionId, dateStr) {
    const arr = this.completions[dateStr];
    return Array.isArray(arr) && arr.some(id => String(id) === String(missionId));
  }

  toggleCheck(missionId) {
    const dateStr = this.selectedDate;
    if (!Array.isArray(this.completions[dateStr])) {
      this.completions[dateStr] = [];
    }
    const arr = this.completions[dateStr];
    const idx = arr.findIndex(id => String(id) === String(missionId));
    if (idx === -1) {
      arr.push(String(missionId));
    } else {
      arr.splice(idx, 1);
    }
    this.storage.saveCompletions(this.completions);
    this._renderDaily();
    this._renderProgress();
  }

  // ══════════════════════════════════════════
  // DATE NAVIGATION
  // ══════════════════════════════════════════

  navigateDate(direction) {
    if (this.anims.isTransitioning) return;

    const contentArea = document.getElementById('fv2-content-area');
    this.anims.animateDateTransition(direction, contentArea, () => {
      this.selectedDate = this._shiftDate(this.selectedDate, direction);
      this._renderDateNav();
      this._renderDaily();
      this._renderProgress();
    });
  }

  jumpToToday() {
    this.selectedDate = this._today();
    this.renderAll();
  }

  jumpToDate(dateStr) {
    this.selectedDate = dateStr;
    this.renderAll();
  }

  // ══════════════════════════════════════════
  // RENDERING & CALCULATIONS
  // ══════════════════════════════════════════

  renderAll() {
    this._renderDateNav();
    this._renderDaily();
    this._renderProgress();
    this._renderGraphs();
  }

  _renderDateNav() {
    this.renderer.renderDateNav(this.selectedDate, this._isToday(this.selectedDate));
  }

  _renderDaily() {
    this.renderer.renderDailyList(
      this.missions,
      this.completions,
      this.selectedDate,
      (m, dateStr) => this._isMissionScheduledFor(m, dateStr)
    );
  }

  _renderProgress() {
    const todayStr = this._today();
    const isToday = this._isToday(this.selectedDate);

    // Today's Progress Stats
    const todayActive = this.missions.filter(m => this._isMissionActiveFor(m, todayStr));
    const todayCompletedIds = Array.isArray(this.completions[todayStr]) ? this.completions[todayStr] : [];
    const todayCompleted = todayActive.filter(m => todayCompletedIds.map(String).includes(String(m.id))).length;
    const todayPct = todayActive.length > 0 ? Math.round((todayCompleted / todayActive.length) * 100) : 0;
    const todayStats = { completed: todayCompleted, total: todayActive.length, pct: todayPct };

    // Selected Date Stats
    const selActive = this.missions.filter(m => this._isMissionActiveFor(m, this.selectedDate));
    const selCompletedIds = Array.isArray(this.completions[this.selectedDate]) ? this.completions[this.selectedDate] : [];
    const selCompleted = selActive.filter(m => selCompletedIds.map(String).includes(String(m.id))).length;
    const selPct = selActive.length > 0 ? Math.round((selCompleted / selActive.length) * 100) : 0;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateObj = this._parseDate(this.selectedDate);
    const dateFormatted = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

    const selectedStats = { completed: selCompleted, total: selActive.length, pct: selPct, dateFormatted };

    this.renderer.renderProgress(todayStats, selectedStats, isToday);
  }

  _renderLibrary() {
    // Deprecated
  }

  toggleManageMode() {
    // Deprecated
  }

  // ── Graph Calculations ──

  _renderGraphs() {
    this._renderThisWeekGraph();
    this._renderLast4WeeksGraph();
    this._renderMonthlyGraph();
  }

  _getDailyPct(dateStr) {
    const scheduled = this.missions.filter(m => this._isMissionScheduledFor(m, dateStr) && m.status !== 'paused');
    if (scheduled.length === 0) return null;
    const completedIds = Array.isArray(this.completions[dateStr]) ? this.completions[dateStr].map(String) : [];
    const completedCount = scheduled.filter(m => completedIds.includes(String(m.id))).length;
    return (completedCount / scheduled.length) * 100;
  }

  _getAverageForDateRange(startDateStr, endDateStr) {
    const pcts = [];
    const cur = this._parseDate(startDateStr);
    const end = this._parseDate(endDateStr);

    while (cur <= end) {
      const dStr = this._formatDate(cur);
      const pct = this._getDailyPct(dStr);
      if (pct !== null) {
        pcts.push(pct);
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (pcts.length === 0) return 0;
    const avg = pcts.reduce((sum, v) => sum + v, 0) / pcts.length;
    return Math.round(avg);
  }

  _renderThisWeekGraph() {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayObj = this._parseDate(this._today());

    // Monday of current week
    const dayOfWeek = todayObj.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(todayObj);
    monday.setDate(monday.getDate() - diffToMon);

    const points = [];
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = this._formatDate(d);
      weekDates.push(dStr);

      const dailyPct = this._getDailyPct(dStr);
      points.push({
        label: dayNames[i],
        pct: dailyPct !== null ? Math.round(dailyPct) : 0,
        isAverage: false
      });
    }

    // 8th point: This Week Average
    const monStr = weekDates[0];
    const sunStr = weekDates[6];
    const weekAvg = this._getAverageForDateRange(monStr, sunStr);

    points.push({
      label: 'Average',
      pct: weekAvg,
      isAverage: true
    });

    this.renderer.renderThisWeekGraph(points);
  }

  _renderLast4WeeksGraph() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayObj = this._parseDate(this._today());

    // Monday of current week
    const dayOfWeek = todayObj.getDay();
    const diffToMon = (dayOfWeek + 6) % 7;
    const currentMon = new Date(todayObj);
    currentMon.setDate(currentMon.getDate() - diffToMon);

    const points = [];

    // 4 weeks: Week -3, Week -2, Week -1, Current Week
    for (let w = 3; w >= 0; w--) {
      const wMon = new Date(currentMon);
      wMon.setDate(currentMon.getDate() - (w * 7));

      const wSun = new Date(wMon);
      wSun.setDate(wMon.getDate() + 6);

      const monStr = this._formatDate(wMon);
      const sunStr = this._formatDate(wSun);

      const avgPct = this._getAverageForDateRange(monStr, sunStr);

      const label = w === 0 ? 'This Week' : `Week -${w}`;
      const sublabel = `${wMon.getDate()} ${monthNames[wMon.getMonth()]} - ${wSun.getDate()} ${monthNames[wSun.getMonth()]}`;

      points.push({
        label,
        sublabel,
        pct: avgPct,
        isAverage: w === 0
      });
    }

    this.renderer.renderLast4WeeksGraph(points);
  }

  _renderMonthlyGraph() {
    const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const todayObj = this._parseDate(this._today());

    // Present Month
    const presentYear = todayObj.getFullYear();
    const presentMonth = todayObj.getMonth();
    const startPresent = `${presentYear}-${String(presentMonth + 1).padStart(2, '0')}-01`;
    const lastDayPresent = new Date(presentYear, presentMonth + 1, 0).getDate();
    const endPresent = `${presentYear}-${String(presentMonth + 1).padStart(2, '0')}-${String(lastDayPresent).padStart(2, '0')}`;
    const presentAvg = this._getAverageForDateRange(startPresent, endPresent);

    // Previous Month
    const prevDate = new Date(presentYear, presentMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const startPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
    const lastDayPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
    const endPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDayPrev).padStart(2, '0')}`;
    const prevAvg = this._getAverageForDateRange(startPrev, endPrev);

    const points = [
      {
        label: 'Previous Month',
        sublabel: `${monthFullNames[prevMonth]} ${prevYear}`,
        pct: prevAvg,
        isAverage: false
      },
      {
        label: 'Present Month',
        sublabel: `${monthFullNames[presentMonth]} ${presentYear}`,
        pct: presentAvg,
        isAverage: true
      }
    ];

    this.renderer.renderMonthlyGraph(points);
  }

  // ══════════════════════════════════════════
  // MODAL — ADD / EDIT
  // ══════════════════════════════════════════

  openAddModal() {
    this.editingId = null;
    this._resetModalForm();
    const title = document.getElementById('fv2-modal-title');
    const subtitle = document.getElementById('fv2-modal-subtitle');
    const saveText = document.getElementById('fv2-modal-save-text');
    if (title) title.textContent = 'Create New Mission';
    if (subtitle) subtitle.textContent = 'Set up a recurring goal or date-range milestone';
    if (saveText) saveText.textContent = 'Save Mission';
    
    const deleteBtn = document.getElementById('fv2-modal-delete');
    const pauseBtn = document.getElementById('fv2-modal-pause');
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'none';

    const modal = document.getElementById('fv2-modal');
    if (modal) modal.classList.add('active');
    const nameInput = document.getElementById('fv2-input-name');
    if (nameInput) nameInput.focus();
  }

  editMission(id) {
    const m = this.missions.find(x => String(x.id) === String(id));
    if (!m) return;

    this.editingId = id;

    const title = document.getElementById('fv2-modal-title');
    const subtitle = document.getElementById('fv2-modal-subtitle');
    const saveText = document.getElementById('fv2-modal-save-text');
    const nameInput = document.getElementById('fv2-input-name');

    const deleteBtn = document.getElementById('fv2-modal-delete');
    const pauseBtn = document.getElementById('fv2-modal-pause');
    const pauseText = document.getElementById('fv2-modal-pause-text');
    if (deleteBtn) deleteBtn.style.display = '';
    if (pauseBtn) {
      pauseBtn.style.display = '';
      if (pauseText) {
        pauseText.textContent = m.status === 'paused' ? '▶️ Resume' : '⏸️ Pause';
      }
    }

    if (title) title.textContent = 'Edit Mission';
    if (subtitle) subtitle.textContent = 'Modify your mission settings';
    if (saveText) saveText.textContent = 'Update Mission';
    if (nameInput) nameInput.value = m.name;

    // Duration
    this._setActiveTab('fv2-duration-tabs', m.duration);

    // Schedule
    this._setActiveTab('fv2-schedule-tabs', m.schedule);

    // Date range
    if (m.duration === 'range') {
      const startInput = document.getElementById('fv2-input-start-date');
      const endInput = document.getElementById('fv2-input-end-date');
      if (startInput) startInput.value = m.startDate || '';
      if (endInput) endInput.value = m.endDate || '';
    }

    // Weekday chips
    if (m.schedule === 'weekdays') {
      const chips = document.querySelectorAll('#fv2-weekdays-picker .fv2-weekday-chip');
      chips.forEach(c => {
        const day = parseInt(c.getAttribute('data-day'));
        c.classList.toggle('active', m.activeDays.includes(day));
      });
    }

    // Specific dates
    if (m.schedule === 'specific') {
      this._editSpecificDates = [...m.specificDates];
    } else {
      this._editSpecificDates = [];
    }

    this.updateModalVisibility();

    const modal = document.getElementById('fv2-modal');
    if (modal) modal.classList.add('active');
    if (nameInput) nameInput.focus();
  }

  closeModal() {
    const modal = document.getElementById('fv2-modal');
    if (modal) modal.classList.remove('active');
    this.editingId = null;
    this._editSpecificDates = null;
    
    const deleteBtn = document.getElementById('fv2-modal-delete');
    const pauseBtn = document.getElementById('fv2-modal-pause');
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'none';
  }

  _resetModalForm() {
    const nameInput = document.getElementById('fv2-input-name');
    const startInput = document.getElementById('fv2-input-start-date');
    const endInput = document.getElementById('fv2-input-end-date');

    if (nameInput) nameInput.value = '';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    this._setActiveTab('fv2-duration-tabs', 'ongoing');
    this._setActiveTab('fv2-schedule-tabs', 'daily');

    // Reset weekday chips to weekday defaults (Mon–Fri active)
    const chips = document.querySelectorAll('#fv2-weekdays-picker .fv2-weekday-chip');
    chips.forEach(c => {
      const day = parseInt(c.getAttribute('data-day'));
      c.classList.toggle('active', [1, 2, 3, 4, 5].includes(day));
    });

    this._editSpecificDates = [];
    this._calendarBaseDate = new Date();
    this._renderSpecificCalendar();

    this.updateModalVisibility();
  }

  updateModalVisibility() {
    const duration = this._getActiveTab('fv2-duration-tabs');
    const schedule = this._getActiveTab('fv2-schedule-tabs');

    if (schedule === 'specific' && !Array.isArray(this._editSpecificDates)) {
      this._editSpecificDates = [];
    }

    const dateRangeGroup = document.getElementById('fv2-date-range-inputs');
    const weekdaysPicker = document.getElementById('fv2-weekdays-picker');
    const specificPicker = document.getElementById('fv2-specific-picker');

    if (dateRangeGroup) dateRangeGroup.style.display = duration === 'range' ? '' : 'none';
    if (weekdaysPicker) weekdaysPicker.style.display = schedule === 'weekdays' ? '' : 'none';

    if (specificPicker) {
      specificPicker.style.display = schedule === 'specific' ? '' : 'none';
      const monthsContainer = document.getElementById('fv2-months-container');
      const chipsContainer = document.getElementById('fv2-range-chips-container');

      if (schedule === 'specific') {
        if (duration === 'ongoing') {
          if (monthsContainer) monthsContainer.style.display = '';
          if (chipsContainer) chipsContainer.style.display = 'none';
          this._renderSpecificCalendar();
        } else {
          if (monthsContainer) monthsContainer.style.display = 'none';
          if (chipsContainer) chipsContainer.style.display = '';
          this._renderRangeChips();
        }
      }
    }
  }

  // ══════════════════════════════════════════
  // MODAL — SAVE HANDLER
  // ══════════════════════════════════════════

  handleSave() {
    const nameInput = document.getElementById('fv2-input-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      if (nameInput) nameInput.focus();
      return;
    }

    const duration = this._getActiveTab('fv2-duration-tabs') || 'ongoing';
    const schedule = this._getActiveTab('fv2-schedule-tabs') || 'daily';

    const mission = {
      id: this.editingId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      duration,
      startDate: '',
      endDate: '',
      schedule,
      activeDays: [],
      specificDates: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Date range
    if (duration === 'range') {
      const startInput = document.getElementById('fv2-input-start-date');
      const endInput = document.getElementById('fv2-input-end-date');
      mission.startDate = startInput ? startInput.value : '';
      mission.endDate = endInput ? endInput.value : '';
    }

    // Weekdays
    if (schedule === 'weekdays') {
      const chips = document.querySelectorAll('#fv2-weekdays-picker .fv2-weekday-chip.active');
      mission.activeDays = Array.from(chips).map(c => parseInt(c.getAttribute('data-day')));
    }

    // Specific dates
    if (schedule === 'specific') {
      if (duration === 'range') {
        const startInput = document.getElementById('fv2-input-start-date');
        const endInput = document.getElementById('fv2-input-end-date');
        const start = startInput ? startInput.value : '';
        const end = endInput ? endInput.value : '';
        mission.specificDates = (this._editSpecificDates || []).filter(d => (!start || d >= start) && (!end || d <= end));
      } else {
        mission.specificDates = [...(this._editSpecificDates || [])];
      }
    }

    // Save
    if (this.editingId) {
      const existing = this.missions.find(m => String(m.id) === String(this.editingId));
      if (existing) {
        mission.status = existing.status;
        mission.createdAt = existing.createdAt;
      }
      const idx = this.missions.findIndex(m => String(m.id) === String(this.editingId));
      if (idx !== -1) this.missions[idx] = mission;
    } else {
      this.missions.push(mission);
    }

    this.storage.saveMissions(this.missions);
    this.closeModal();
    this.renderAll();
  }

  // ══════════════════════════════════════════
  // MISSION ACTIONS
  // ══════════════════════════════════════════

  async deleteMission(id) {
    // Animate out from library & daily list
    const libList = document.getElementById('fv2-library-list');
    const dailyList = document.getElementById('fv2-daily-list');
    const animPromises = [];

    if (libList) {
      const card = libList.querySelector(`.fv2-lib-item[data-mission-id="${id}"]`);
      if (card) animPromises.push(this.anims.animateRowExit(card));
    }
    if (dailyList) {
      const row = dailyList.querySelector(`.fv2-mission-row[data-mission-id="${id}"]`);
      if (row) animPromises.push(this.anims.animateRowExit(row));
    }

    if (animPromises.length > 0) {
      await Promise.all(animPromises);
    }

    // Remove from state
    this.missions = this.missions.filter(m => String(m.id) !== String(id));
    this.storage.saveMissions(this.missions);
    this.storage.cleanup(this.missions, this.completions);
    this.renderAll();
  }

  togglePause(id) {
    const m = this.missions.find(x => String(x.id) === String(id));
    if (!m) return;
    m.status = m.status === 'paused' ? 'active' : 'paused';
    this.storage.saveMissions(this.missions);
    this.renderAll();
  }

  handleModalDelete() {
    if (this.editingId) {
      const id = this.editingId;
      this.closeModal();
      this.deleteMission(id);
    }
  }

  handleModalPauseToggle() {
    if (this.editingId) {
      const id = this.editingId;
      this.togglePause(id);
      const m = this.missions.find(x => String(x.id) === String(id));
      if (m) {
        const pauseText = document.getElementById('fv2-modal-pause-text');
        if (pauseText) {
          pauseText.textContent = m.status === 'paused' ? '▶️ Resume' : '⏸️ Pause';
        }
      }
    }
  }

  toggleDropdown(btn) {
    const container = btn.closest('.fv2-actions-dropdown-container');
    if (!container) return;

    const isOpening = !container.classList.contains('active');

    // Close all open dropdowns and clear parent dropdown-open
    document.querySelectorAll('.fv2-actions-dropdown-container.active').forEach(el => {
      el.classList.remove('active');
      const item = el.closest('.fv2-lib-item, .fv2-mission-row');
      if (item) item.classList.remove('dropdown-open');
    });

    if (isOpening) {
      container.classList.add('active');
      const item = container.closest('.fv2-lib-item, .fv2-mission-row');
      if (item) item.classList.add('dropdown-open');
    }
  }

  toggleSpecificDate(dateStr) {
    if (!Array.isArray(this._editSpecificDates)) {
      this._editSpecificDates = [];
    }
    const idx = this._editSpecificDates.indexOf(dateStr);
    if (idx === -1) {
      this._editSpecificDates.push(dateStr);
    } else {
      this._editSpecificDates.splice(idx, 1);
    }
  }

  // ══════════════════════════════════════════
  // SPECIFIC DATES CALENDAR
  // ══════════════════════════════════════════

  shiftCalendarMonth(direction) {
    this._calendarBaseDate.setMonth(this._calendarBaseDate.getMonth() + (direction * 3));
    this._renderSpecificCalendar();
  }

  _renderSpecificCalendar() {
    const grid = document.getElementById('fv2-months-grid');
    if (!grid) return;

    const base = new Date(this._calendarBaseDate);
    base.setDate(1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Pre-selected dates
    const selectedSet = new Set(this._editSpecificDates || []);

    let html = '';
    for (let mi = 0; mi < 3; mi++) {
      const mDate = new Date(base.getFullYear(), base.getMonth() + mi, 1);
      const year = mDate.getFullYear();
      const month = mDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = mDate.getDay();

      html += `<div class="fv2-month-card">`;
      html += `<div class="fv2-month-title">${monthNames[month]} ${year}</div>`;
      html += `<div class="fv2-month-grid">`;

      dayHeaders.forEach(dh => {
        html += `<span class="fv2-month-day-header">${dh}</span>`;
      });

      for (let e = 0; e < firstDay; e++) {
        html += `<button class="fv2-month-day empty"></button>`;
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const sel = selectedSet.has(dateStr) ? ' selected' : '';
        html += `<button class="fv2-month-day${sel}" data-date="${dateStr}">${d}</button>`;
      }

      html += `</div></div>`;
    }

    grid.innerHTML = html;
  }

  _renderRangeChips() {
    const grid = document.getElementById('fv2-range-chips-grid');
    if (!grid) return;

    const startInput = document.getElementById('fv2-input-start-date');
    const endInput = document.getElementById('fv2-input-end-date');
    const start = startInput ? startInput.value : '';
    const end = endInput ? endInput.value : '';

    if (!start || !end || start > end) {
      grid.innerHTML = '<span class="fv2-form-sublabel" style="margin:0">Set start and end dates above first.</span>';
      return;
    }

    const selectedSet = new Set(this._editSpecificDates || []);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let html = '';
    const cur = this._parseDate(start);
    const endDate = this._parseDate(end);

    while (cur <= endDate) {
      const dateStr = this._formatDate(cur);
      const sel = selectedSet.has(dateStr) ? ' active' : '';
      html += `<button class="fv2-date-chip${sel}" data-date="${dateStr}">${cur.getDate()} ${monthNames[cur.getMonth()]}</button>`;
      cur.setDate(cur.getDate() + 1);
    }

    grid.innerHTML = html;
  }

  // ══════════════════════════════════════════
  // TAB HELPERS
  // ══════════════════════════════════════════

  _setActiveTab(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.fv2-pill-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-value') === value);
    });
  }

  _getActiveTab(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return '';
    const active = container.querySelector('.fv2-pill-tab.active');
    return active ? active.getAttribute('data-value') : '';
  }
}

window.FocusEngine = FocusEngine;
