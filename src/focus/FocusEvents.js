// Focus Module v2 — Event Controller
// Binds ALL events exactly once during init via delegation.
// Never rebinds. Never duplicates. All handlers call back into FocusEngine.

class FocusEvents {
  constructor(engine) {
    this.engine = engine;
  }

  bindAll() {
    this._bindDateNav();
    this._bindModal();
    this._bindDailyList();
    this._bindLibraryList();
    this._bindKeyboard();
  }

  // ── Date Navigation ──
  _bindDateNav() {
    const prev = document.getElementById('fv2-date-prev');
    const next = document.getElementById('fv2-date-next');
    const jumpToday = document.getElementById('fv2-jump-today');
    const calendarTrigger = document.getElementById('fv2-calendar-trigger');
    const datePicker = document.getElementById('fv2-date-picker');

    if (prev) prev.addEventListener('click', () => this.engine.navigateDate(-1));
    if (next) next.addEventListener('click', () => this.engine.navigateDate(1));
    if (jumpToday) jumpToday.addEventListener('click', () => this.engine.jumpToToday());

    if (calendarTrigger && datePicker) {
      calendarTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        try { datePicker.showPicker(); } catch { datePicker.click(); }
      });
    }
    if (datePicker) {
      datePicker.addEventListener('change', (e) => {
        if (e.target.value) this.engine.jumpToDate(e.target.value);
      });
    }
  }

  // ── Modal ──
  _bindModal() {
    const addBtn = document.getElementById('fv2-add-btn');
    const saveBtn = document.getElementById('fv2-modal-save');
    const cancelBtn = document.getElementById('fv2-modal-cancel');
    const closeBtn = document.getElementById('fv2-modal-close');
    const modal = document.getElementById('fv2-modal');
    const durationTabs = document.getElementById('fv2-duration-tabs');
    const scheduleTabs = document.getElementById('fv2-schedule-tabs');
    const weekdaysPicker = document.getElementById('fv2-weekdays-picker');
    const monthPrev = document.getElementById('fv2-month-prev');
    const monthNext = document.getElementById('fv2-month-next');

    const deleteBtn = document.getElementById('fv2-modal-delete');
    const pauseBtn = document.getElementById('fv2-modal-pause');
    const manageBtn = document.getElementById('fv2-manage-btn');

    if (addBtn) addBtn.addEventListener('click', () => this.engine.openAddModal());
    if (saveBtn) saveBtn.addEventListener('click', () => this.engine.handleSave());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.engine.closeModal());
    if (closeBtn) closeBtn.addEventListener('click', () => this.engine.closeModal());
    if (deleteBtn) deleteBtn.addEventListener('click', () => this.engine.handleModalDelete());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.engine.handleModalPauseToggle());
    if (manageBtn) manageBtn.addEventListener('click', () => this.engine.toggleManageMode());

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.engine.closeModal();
      });
    }

    // Pill tab switching (duration)
    if (durationTabs) {
      durationTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.fv2-pill-tab');
        if (!tab) return;
        durationTabs.querySelectorAll('.fv2-pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.engine.updateModalVisibility();
      });
    }

    // Pill tab switching (schedule)
    if (scheduleTabs) {
      scheduleTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.fv2-pill-tab');
        if (!tab) return;
        scheduleTabs.querySelectorAll('.fv2-pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.engine.updateModalVisibility();
      });
    }

    // Weekday chip toggles
    if (weekdaysPicker) {
      weekdaysPicker.addEventListener('click', (e) => {
        const chip = e.target.closest('.fv2-weekday-chip');
        if (chip) chip.classList.toggle('active');
      });
    }

    // Month navigation for specific dates calendar
    if (monthPrev) monthPrev.addEventListener('click', () => this.engine.shiftCalendarMonth(-1));
    if (monthNext) monthNext.addEventListener('click', () => this.engine.shiftCalendarMonth(1));

    // Month grid date clicks (delegation)
    const monthsGrid = document.getElementById('fv2-months-grid');
    if (monthsGrid) {
      monthsGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.fv2-month-day');
        if (dayEl && !dayEl.classList.contains('empty')) {
          dayEl.classList.toggle('selected');
          const dateStr = dayEl.getAttribute('data-date');
          if (dateStr) this.engine.toggleSpecificDate(dateStr);
        }
      });
    }

    // Range chips clicks (delegation)
    const rangeChipsGrid = document.getElementById('fv2-range-chips-grid');
    if (rangeChipsGrid) {
      rangeChipsGrid.addEventListener('click', (e) => {
        const chip = e.target.closest('.fv2-date-chip');
        if (chip) {
          chip.classList.toggle('active');
          const dateStr = chip.getAttribute('data-date');
          if (dateStr) this.engine.toggleSpecificDate(dateStr);
        }
      });
    }

    // Start/End date changes (to update range chips dynamically)
    const startInput = document.getElementById('fv2-input-start-date');
    const endInput = document.getElementById('fv2-input-end-date');
    if (startInput) {
      startInput.addEventListener('change', () => this.engine.updateModalVisibility());
    }
    if (endInput) {
      endInput.addEventListener('change', () => this.engine.updateModalVisibility());
    }
  }

  // ── Daily List (Event Delegation) ──
  _bindDailyList() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.fv2-check-btn');
      if (btn && !btn.classList.contains('disabled')) {
        const id = btn.getAttribute('data-id');
        if (id) this.engine.toggleCheck(id);
      }
    });
  }

  // ── Library & Daily List Actions (Event Delegation) ──
  _bindLibraryList() {
    document.addEventListener('click', (e) => {
      // 1. Handle dropdown item click FIRST
      const dropItem = e.target.closest('.fv2-dropdown-item');
      if (dropItem) {
        e.preventDefault();
        e.stopPropagation();
        const action = dropItem.getAttribute('data-action');
        const id = dropItem.getAttribute('data-id');

        // Close all active dropdowns
        document.querySelectorAll('.fv2-actions-dropdown-container.active').forEach(el => {
          el.classList.remove('active');
          const parentItem = el.closest('.fv2-lib-item, .fv2-mission-row');
          if (parentItem) parentItem.classList.remove('dropdown-open');
        });

        if (action === 'edit') this.engine.editMission(id);
        if (action === 'pause' || action === 'resume') this.engine.togglePause(id);
        if (action === 'delete') this.engine.deleteMission(id);
        return;
      }

      // 2. Handle 3-dot button click
      const dotBtn = e.target.closest('.fv2-dot-btn');
      if (dotBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.engine.toggleDropdown(dotBtn);
        return;
      }

      // 3. Close dropdowns if clicked outside
      if (!e.target.closest('.fv2-actions-dropdown-container')) {
        document.querySelectorAll('.fv2-actions-dropdown-container.active').forEach(el => {
          el.classList.remove('active');
          const parentItem = el.closest('.fv2-lib-item, .fv2-mission-row');
          if (parentItem) parentItem.classList.remove('dropdown-open');
        });
      }
    });
  }


  // ── Keyboard ──
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('fv2-modal');
        if (modal && modal.classList.contains('active')) {
          this.engine.closeModal();
        }
      }
    });
  }
}

window.FocusEvents = FocusEvents;
