// Sem Section Logic: Upcoming Events, Calendar Widget, and Marks Tab
// Integrates event sorting, calendar visual mapping, and custom marks matrix.

class SemEngine {
  constructor() {
    this.currentSemVal = document.getElementById('current-sem-val');
    this.gpasKey = 'mymo_gpas';
    
    // --- UPCOMING EVENTS SELECTORS ---
    this.addEventBtn = document.getElementById('add-event-btn');
    this.saveEventsBtn = document.getElementById('save-events-btn');
    this.upcomingList = document.getElementById('upcoming-events-list');
    this.upcomingEvents = [];
    this.isEditingEvents = false;
    this.storageKeyUpcoming = 'mymo_upcoming_events';
    
    // --- CALENDAR WIDGET SELECTORS ---
    this.calendarDaysGrid = document.getElementById('calendar-days-grid');
    this.calendarMonthYearLabel = document.getElementById('calendar-month-year');
    this.calendarMonthDisplay = document.getElementById('calendar-current-month-display');
    this.calendarPrevBtn = document.getElementById('calendar-prev-month');
    this.calendarNextBtn = document.getElementById('calendar-next-month');
    this.calendarEventDisplay = document.getElementById('calendar-event-display');
    
    const today = new Date();
    this.calendarYear = today.getFullYear();
    this.calendarMonth = today.getMonth(); // 0-11
    this.selectedDateStr = null; // Track clicked day
    
    this.monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // --- HOLIDAY SYSTEM SELECTORS ---
    this.storageKeyHolidays = 'mymo_holidays';
    this.holidays = [];
    
    // --- MARKS TAB SELECTORS ---
    this.editMarksBtn = document.getElementById('edit-marks-btn');
    this.addMarksSubjectBtn = document.getElementById('add-marks-subject-btn');
    this.marksTableBody = document.getElementById('marks-table-body');
    
    this.isEditingMarks = false;
    this.marksData = [];
    this.storageKeyMarks = 'mymo_marks';
    
    this.init();
  }

  init() {
    // 0. Initialize Holidays
    this.loadHolidays();

    // 1. Initialize Upcoming events
    this.loadUpcomingEvents();
    this.cleanupExpiredEvents();
    this.renderUpcomingEvents();

    // 2. Initialize Calendar Widget
    this.renderCalendar();
    this.setupCalendarListeners();

    // 3. Initialize Marks Tab
    this.loadMarksData();
    this.renderMarks();

    // Setup Marks Graph tab controls
    this.marksGraph = new MarksGraph(this);
    const tabBtns = document.querySelectorAll('.sem-sub-tab');
    const tableView = document.querySelector('.sem-marks-table-view');
    const graphView = document.querySelector('.sem-marks-graph-view');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-sem-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (targetTab === 'table') {
          if (tableView) tableView.classList.add('active');
          if (graphView) graphView.classList.remove('active');
        } else {
          if (tableView) tableView.classList.remove('active');
          if (graphView) graphView.classList.add('active');
          if (this.marksGraph) {
            this.marksGraph.resize();
            this.marksGraph.updateData(true);
          }
        }
      });
    });

    // 4. Timeline timeline indicator updates
    this.detectCurrentSem();
    window.addEventListener('academic-gpa-updated', () => {
      this.detectCurrentSem();
    });

    // 5. Setup Upcoming Add Event Hook
    if (this.addEventBtn) {
      this.addEventBtn.addEventListener('click', () => this.addUpcomingEvent());
    }
    if (this.saveEventsBtn) {
      this.saveEventsBtn.addEventListener('click', () => this.toggleEventsEditMode(false));
    }

    // 6. Setup Marks Edit Hook
    if (this.editMarksBtn) {
      this.editMarksBtn.addEventListener('click', () => this.toggleEditMarksMode());
    }
    if (this.addMarksSubjectBtn) {
      this.addMarksSubjectBtn.addEventListener('click', () => this.addMarksSubjectRow());
    }
  }

  loadHolidays() {
    const rawHolidays = localStorage.getItem(this.storageKeyHolidays);
    if (rawHolidays) {
      try {
        this.holidays = JSON.parse(rawHolidays);
        if (!Array.isArray(this.holidays)) this.holidays = [];
      } catch (e) {
        console.error('Error parsing holidays', e);
        this.holidays = [];
      }
    } else {
      this.holidays = [];
    }
  }

  saveHolidays() {
    localStorage.setItem(this.storageKeyHolidays, JSON.stringify(this.holidays));
  }

  detectCurrentSem() {
    const savedGpasRaw = localStorage.getItem(this.gpasKey);
    let currentSem = 1;
    
    if (savedGpasRaw) {
      try {
        const gpas = JSON.parse(savedGpasRaw);
        for (let i = 1; i <= 8; i++) {
          const val = gpas[i.toString()];
          if (val === undefined || val === null || String(val).trim() === '') {
            currentSem = i;
            break;
          }
          if (i === 8) {
            currentSem = 'Graduated';
          }
        }
      } catch (e) {
        console.error('Error detecting current sem from GPAs in Sem section', e);
      }
    }
    
    if (this.currentSemVal) {
      this.currentSemVal.textContent = typeof currentSem === 'number' ? 'Sem ' + currentSem : currentSem;
    }
  }

  // ==========================================
  // --- UPCOMING EVENTS HANDLERS ---
  // ==========================================
  
  toggleEventsEditMode(isEditing) {
    this.isEditingEvents = isEditing;
    
    if (this.saveEventsBtn) {
      this.saveEventsBtn.style.display = isEditing ? 'inline-block' : 'none';
    }

    const panel = document.querySelector('.sem-upcoming-panel');
    if (panel) {
      if (isEditing) {
        panel.classList.add('upcoming-editing-active');
      } else {
        panel.classList.remove('upcoming-editing-active');
      }
    }

    if (!isEditing) {
      this.saveEventsFromDOM();
      this.sortAndSaveUpcomingEvents();
      this.renderCalendar();
      this.updateCalendarDetailsDisplay();
    } else {
      this.renderUpcomingEvents();
    }
  }

  saveEventsFromDOM() {
    if (!this.upcomingList) return;
    const rows = this.upcomingList.querySelectorAll('.upcoming-event-row');
    const updatedEvents = [];
    rows.forEach(row => {
      const dateInp = row.querySelector('.upcoming-date-input');
      const nameInp = row.querySelector('.upcoming-name-input');
      const activeDot = row.querySelector('.color-dot.active');
      
      const id = row.dataset.id;
      const date = dateInp ? dateInp.value : '';
      const name = nameInp ? nameInp.value : '';
      
      let color = 'blue';
      if (activeDot) {
        if (activeDot.classList.contains('dot-green')) {
          color = 'green';
        }
      }

      if (id) {
        updatedEvents.push({ id, date, name, color });
      }
    });
    this.upcomingEvents = updatedEvents;
  }

  renderUpcomingEvents() {
    if (!this.upcomingList) return;
    this.upcomingList.innerHTML = '';

    if (this.upcomingEvents.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'upcoming-empty-message';
      emptyMsg.style.padding = '35px 20px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.fontSize = '0.9rem';
      emptyMsg.textContent = 'No upcoming events. Click "+ Add Event" to begin.';
      this.upcomingList.appendChild(emptyMsg);
      return;
    }

    this.upcomingEvents.forEach((ev, idx) => {
      const statusColor = ev.color || 'blue';
      
      const row = document.createElement('div');
      row.className = `upcoming-event-row color-${statusColor}`;
      row.dataset.id = ev.id;
      row.style.animationDelay = `${idx * 0.04}s`;

      // Date column
      const dateCol = document.createElement('div');
      dateCol.className = 'upcoming-date-col';
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'upcoming-date-input';
      dateInput.value = ev.date;
      dateInput.readOnly = !this.isEditingEvents;
      if (!this.isEditingEvents) {
        dateInput.disabled = true;
      }
      dateInput.addEventListener('change', (e) => {
        this.updateUpcomingEvent(ev.id, 'date', e.target.value);
      });
      dateCol.appendChild(dateInput);

      // Name column
      const nameCol = document.createElement('div');
      nameCol.className = 'upcoming-name-col';
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'upcoming-name-input';
      nameInput.placeholder = 'Event Name (e.g. Mid Sem Exam)';
      nameInput.value = ev.name;
      nameInput.readOnly = !this.isEditingEvents;
      nameInput.addEventListener('input', (e) => {
        this.updateUpcomingEvent(ev.id, 'name', e.target.value);
      });
      nameCol.appendChild(nameInput);

      // Color selection (nexus-like blue/green picker)
      if (this.isEditingEvents) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'color-picker-dots';

        const blueDot = document.createElement('span');
        blueDot.className = 'color-dot dot-blue' + (statusColor === 'blue' ? ' active' : '');
        blueDot.title = 'Blue theme';
        blueDot.addEventListener('click', () => {
          this.updateUpcomingEvent(ev.id, 'color', 'blue');
          row.className = 'upcoming-event-row color-blue';
          dotsContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
          blueDot.classList.add('active');
        });

        const greenDot = document.createElement('span');
        greenDot.className = 'color-dot dot-green' + (statusColor === 'green' ? ' active' : '');
        greenDot.title = 'Green theme';
        greenDot.addEventListener('click', () => {
          this.updateUpcomingEvent(ev.id, 'color', 'green');
          row.className = 'upcoming-event-row color-green';
          dotsContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
          greenDot.classList.add('active');
        });

        dotsContainer.appendChild(blueDot);
        dotsContainer.appendChild(greenDot);
        nameCol.appendChild(dotsContainer);
      } else {
        // Show static tiny colored dot as an indicator in view mode
        const staticDot = document.createElement('span');
        staticDot.className = `color-dot dot-${statusColor} active`;
        staticDot.style.cursor = 'default';
        staticDot.style.pointerEvents = 'none';
        staticDot.style.marginLeft = '8px';
        staticDot.style.flexShrink = '0';
        nameCol.appendChild(staticDot);
      }

      // Actions column (for delete cross)
      const actionCol = document.createElement('div');
      actionCol.className = 'upcoming-action-col';
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-event-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Delete Event';
      deleteBtn.addEventListener('click', () => {
        this.deleteUpcomingEvent(ev.id, row);
      });
      actionCol.appendChild(deleteBtn);

      row.appendChild(dateCol);
      row.appendChild(nameCol);
      row.appendChild(actionCol);

      this.upcomingList.appendChild(row);
    });
  }

  addUpcomingEvent() {
    const todayStr = new Date().toISOString().split('T')[0];
    const newEvent = {
      id: Date.now().toString(),
      date: todayStr,
      name: '',
      color: 'blue'
    };

    this.upcomingEvents.push(newEvent);

    if (!this.isEditingEvents) {
      this.toggleEventsEditMode(true);
    } else {
      this.renderUpcomingEvents();
    }

    setTimeout(() => {
      const rows = this.upcomingList.querySelectorAll('.upcoming-event-row');
      if (rows.length > 0) {
        const lastInput = rows[rows.length - 1].querySelector('.upcoming-name-input');
        if (lastInput) lastInput.focus();
      }
    }, 50);
  }

  updateUpcomingEvent(id, field, value) {
    const ev = this.upcomingEvents.find(e => e.id === id);
    if (ev) {
      ev[field] = value;
    }
  }

  deleteUpcomingEvent(id, rowEl) {
    rowEl.classList.add('deleting');
    setTimeout(() => {
      this.upcomingEvents = this.upcomingEvents.filter(e => e.id !== id);
      if (this.isEditingEvents) {
        this.renderUpcomingEvents();
      } else {
        this.sortAndSaveUpcomingEvents();
        this.renderCalendar();
        this.updateCalendarDetailsDisplay();
      }
    }, 400);
  }

  sortAndSaveUpcomingEvents() {
    this.upcomingEvents.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    this.saveUpcomingEvents();
    this.renderUpcomingEvents();
  }

  saveUpcomingEvents() {
    localStorage.setItem(this.storageKeyUpcoming, JSON.stringify(this.upcomingEvents));
  }

  loadUpcomingEvents() {
    const rawUpcoming = localStorage.getItem(this.storageKeyUpcoming);
    if (rawUpcoming) {
      try {
        this.upcomingEvents = JSON.parse(rawUpcoming);
        if (!Array.isArray(this.upcomingEvents)) this.upcomingEvents = [];
      } catch (e) {
        console.error('Error parsing upcoming events data', e);
        this.upcomingEvents = [];
      }
    } else {
      // Seed default events
      const currYear = new Date().getFullYear();
      let currMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      this.upcomingEvents = [
        { id: '1', date: `${currYear}-${currMonth}-10`, name: 'Mid Sem Examination', color: 'blue' },
        { id: '2', date: `${currYear}-${currMonth}-18`, name: 'Data Structures Lab Evaluation', color: 'blue' },
        { id: '3', date: `${currYear}-${currMonth}-24`, name: 'DBMS Mini Project Submission', color: 'blue' },
        { id: '4', date: `${currYear}-${currMonth}-28`, name: 'End Sem Practical Exam', color: 'green' }
      ];
      this.saveUpcomingEvents();
    }
  }

  cleanupExpiredEvents() {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    const oneWeekAgoStr = `${oneWeekAgo.getFullYear()}-${(oneWeekAgo.getMonth() + 1).toString().padStart(2, '0')}-${oneWeekAgo.getDate().toString().padStart(2, '0')}`;
    
    const originalLength = this.upcomingEvents.length;
    this.upcomingEvents = this.upcomingEvents.filter(event => {
      if (!event.date) return true;
      return event.date >= oneWeekAgoStr;
    });

    if (this.upcomingEvents.length !== originalLength) {
      this.saveUpcomingEvents();
    }
  }

  // ==========================================
  // --- CALENDAR TAB WIDGET METHODS ---
  // ==========================================
  
  setupCalendarListeners() {
    if (this.calendarPrevBtn) {
      this.calendarPrevBtn.addEventListener('click', () => this.shiftCalendarMonth(-1));
    }
    if (this.calendarNextBtn) {
      this.calendarNextBtn.addEventListener('click', () => this.shiftCalendarMonth(1));
    }
  }

  shiftCalendarMonth(offset) {
    this.calendarMonth += offset;
    if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear -= 1;
    } else if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear += 1;
    }
    this.renderCalendar();
    this.updateCalendarDetailsDisplay();
  }

  renderCalendar() {
    if (!this.calendarDaysGrid) return;
    
    // Update labels
    const currentMonthName = this.monthNames[this.calendarMonth];
    if (this.calendarMonthYearLabel) {
      this.calendarMonthYearLabel.textContent = `${currentMonthName} ${this.calendarYear}`;
    }
    if (this.calendarMonthDisplay) {
      this.calendarMonthDisplay.textContent = currentMonthName;
    }

    this.calendarDaysGrid.innerHTML = '';

    // First day of current month (0: Sunday, 1: Monday, etc.)
    const firstDayIndex = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
    // Adjust so week starts on Monday (0: Monday, ..., 6: Sunday)
    const startDayOffset = (firstDayIndex + 6) % 7;
    
    // Number of days in current month
    const totalDays = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();

    // Render empty spaces for padding
    for (let i = 0; i < startDayOffset; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty-day';
      this.calendarDaysGrid.appendChild(emptyCell);
    }

    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    // Render actual day cells
    for (let day = 1; day <= totalDays; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.textContent = day;
      
      const paddedMonth = (this.calendarMonth + 1).toString().padStart(2, '0');
      const paddedDay = day.toString().padStart(2, '0');
      const cellDateStr = `${this.calendarYear}-${paddedMonth}-${paddedDay}`;

      // Mark today's timeline
      if (cellDateStr === todayDateStr) {
        dayCell.classList.add('today');
      }

      // Check if day matches selected date highlight
      if (cellDateStr === this.selectedDateStr) {
        dayCell.classList.add('selected');
      }

      // Check if event exists on this day
      const dayEvents = this.upcomingEvents.filter(e => e.date === cellDateStr && e.name.trim() !== '');
      if (dayEvents.length > 0) {
        dayCell.classList.add('has-event');
        
        // Add specific classes based on the user-selected event colors
        const hasGreen = dayEvents.some(e => e.color === 'green');
        if (hasGreen) {
          dayCell.classList.add('event-green');
        } else {
          dayCell.classList.add('event-blue');
        }
      }

      // Check Holiday Status
      const cellDayOfWeek = new Date(this.calendarYear, this.calendarMonth, day).getDay();
      const isSunday = (cellDayOfWeek === 0);
      const isManualHoliday = this.holidays.includes(cellDateStr);
      const isHoliday = isSunday || isManualHoliday;
      const isPastDate = (cellDateStr < todayDateStr);

      if (isHoliday && !isPastDate) {
        dayCell.classList.add('holiday');
      }

      // Handle clicking a day
      dayCell.addEventListener('click', () => {
        this.selectedDateStr = cellDateStr;
        
        // Remove active highlights and set to this one
        const activeCells = this.calendarDaysGrid.querySelectorAll('.calendar-day.selected');
        activeCells.forEach(cell => cell.classList.remove('selected'));
        dayCell.classList.add('selected');

        this.updateCalendarDetailsDisplay();
      });

      this.calendarDaysGrid.appendChild(dayCell);
    }
  }

  updateCalendarDetailsDisplay() {
    if (!this.calendarEventDisplay) return;
    this.calendarEventDisplay.innerHTML = '';

    if (!this.selectedDateStr) {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-event-message';
      placeholder.textContent = 'Select a date to inspect events';
      this.calendarEventDisplay.appendChild(placeholder);
      return;
    }

    const dayEvents = this.upcomingEvents.filter(e => e.date === this.selectedDateStr && e.name.trim() !== '');
    
    // Formatting date label: June 15, 2026
    const [yearStr, monthStr, dayStr] = this.selectedDateStr.split('-');
    const monthIndex = parseInt(monthStr) - 1;
    const formattedDate = `${this.monthNames[monthIndex]} ${parseInt(dayStr)}, ${yearStr}`;

    const card = document.createElement('div');
    card.className = 'calendar-event-details-card';

    const dateHeader = document.createElement('span');
    dateHeader.className = 'event-details-date';
    dateHeader.textContent = formattedDate;
    card.appendChild(dateHeader);

    if (dayEvents.length > 0) {
      const listContainer = document.createElement('div');
      listContainer.className = 'event-details-name-list';
      
      dayEvents.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'event-details-name-item';
        item.textContent = ev.name;
        listContainer.appendChild(item);
      });
      
      card.appendChild(listContainer);
    } else {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'no-event-message';
      emptyMsg.style.textAlign = 'left';
      emptyMsg.style.marginTop = '4px';
      emptyMsg.textContent = 'No Event';
      card.appendChild(emptyMsg);
    }

    // Add Holiday Toggle
    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const isPastDate = (this.selectedDateStr < todayDateStr);
    
    const [selYear, selMonth, selDay] = this.selectedDateStr.split('-');
    const selDateObj = new Date(parseInt(selYear), parseInt(selMonth) - 1, parseInt(selDay));
    const isSunday = (selDateObj.getDay() === 0);
    const isManualHoliday = this.holidays.includes(this.selectedDateStr);
    const isHoliday = isSunday || isManualHoliday;

    if (!isPastDate) {
      const toggleRow = document.createElement('div');
      toggleRow.className = 'holiday-toggle-row';
      
      const toggleLabel = document.createElement('span');
      toggleLabel.className = 'holiday-toggle-label';
      toggleLabel.textContent = isSunday ? 'Sunday (Auto-Holiday)' : 'Mark as Holiday';
      
      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch-container';
      
      const switchInp = document.createElement('input');
      switchInp.type = 'checkbox';
      switchInp.checked = isHoliday;
      if (isSunday) {
        switchInp.disabled = true;
      } else {
        switchInp.addEventListener('change', (e) => {
          if (e.target.checked) {
            if (!this.holidays.includes(this.selectedDateStr)) {
              this.holidays.push(this.selectedDateStr);
            }
          } else {
            this.holidays = this.holidays.filter(d => d !== this.selectedDateStr);
          }
          this.saveHolidays();
          this.renderCalendar();
          this.updateCalendarDetailsDisplay();
        });
      }
      
      const sliderSpan = document.createElement('span');
      sliderSpan.className = 'switch-slider';
      
      switchLabel.appendChild(switchInp);
      switchLabel.appendChild(sliderSpan);
      toggleRow.appendChild(toggleLabel);
      toggleRow.appendChild(switchLabel);
      card.appendChild(toggleRow);
    }

    this.calendarEventDisplay.appendChild(card);
  }

  // ==========================================
  // --- MARKS TAB FLEX METHODS ---
  // ==========================================
  
  renderMarks() {
    if (!this.marksTableBody) return;
    this.marksTableBody.innerHTML = '';

    const marksCard = this.marksTableBody.closest('.sem-marks-panel');

    this.marksData.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      tr.className = 'marks-row';
      tr.style.animation = `trReveal 0.4s ${rowIdx * 0.05}s cubic-bezier(0.16, 1, 0.3, 1) forwards`;

      // Column 1: Subject Name Input
      const subjTd = document.createElement('td');
      const subjInput = document.createElement('input');
      subjInput.type = 'text';
      subjInput.className = 'marks-subject-input';
      subjInput.value = row.subject;
      subjInput.placeholder = `Subject ${rowIdx + 1}`;
      subjInput.readOnly = !this.isEditingMarks;
      subjInput.addEventListener('input', (e) => {
        this.marksData[rowIdx].subject = e.target.value;
      });
      subjTd.appendChild(subjInput);
      tr.appendChild(subjTd);

      // Middle 6 Columns: Custom Assessment Blocks
      for (let i = 0; i < 6; i++) {
        const blockTd = document.createElement('td');
        blockTd.style.textAlign = 'center';
        
        const block = row.marks[i] || { label: '', value: '' };

        // Wrapper for display mode
        const displayContainer = document.createElement('div');
        displayContainer.className = 'marks-cell-stacked-container';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'marks-cell-label-display';
        labelSpan.textContent = block.label || '—';
        
        const valSpan = document.createElement('span');
        valSpan.className = 'marks-cell-value-display';
        valSpan.textContent = block.value || '—';

        displayContainer.appendChild(labelSpan);
        displayContainer.appendChild(valSpan);
        blockTd.appendChild(displayContainer);

        // Wrapper for edit mode
        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'marks-cell-stacked-inputs';

        const labelInp = document.createElement('input');
        labelInp.type = 'text';
        labelInp.className = 'marks-subinput-label';
        labelInp.placeholder = 'LABEL';
        labelInp.value = block.label;
        labelInp.addEventListener('input', (e) => {
          if (!this.marksData[rowIdx].marks[i]) {
            this.marksData[rowIdx].marks[i] = { label: '', value: '' };
          }
          this.marksData[rowIdx].marks[i].label = e.target.value;
        });

        const valInp = document.createElement('input');
        valInp.type = 'text';
        valInp.className = 'marks-subinput-value';
        valInp.placeholder = 'SCORE';
        valInp.value = block.value;
        valInp.addEventListener('input', (e) => {
          if (!this.marksData[rowIdx].marks[i]) {
            this.marksData[rowIdx].marks[i] = { label: '', value: '' };
          }
          this.marksData[rowIdx].marks[i].value = e.target.value;
        });

        inputsContainer.appendChild(labelInp);
        inputsContainer.appendChild(valInp);
        blockTd.appendChild(inputsContainer);

        tr.appendChild(blockTd);
      }

      // Column 8: Total Marks (User enters manually)
      const totalTd = document.createElement('td');
      totalTd.style.textAlign = 'center';
      const totalInp = document.createElement('input');
      totalInp.type = 'text';
      totalInp.className = 'marks-total-input';
      totalInp.value = row.total;
      totalInp.placeholder = '—';
      totalInp.readOnly = !this.isEditingMarks;
      totalInp.addEventListener('input', (e) => {
        this.marksData[rowIdx].total = e.target.value;
      });
      totalTd.appendChild(totalInp);
      tr.appendChild(totalTd);

      // Column 9: Delete Subject Row Column (Only active in Edit Mode)
      const deleteTd = document.createElement('td');
      deleteTd.className = 'delete-marks-col';
      deleteTd.style.textAlign = 'center';
      // Controlled by CSS or JS display toggle
      deleteTd.style.display = this.isEditingMarks ? 'table-cell' : 'none';

      const deleteRowBtn = document.createElement('button');
      deleteRowBtn.className = 'delete-marks-row-btn';
      deleteRowBtn.innerHTML = '&times;';
      deleteRowBtn.title = 'Remove Subject';
      deleteRowBtn.addEventListener('click', () => {
        this.deleteMarksSubjectRow(rowIdx);
      });
      deleteTd.appendChild(deleteRowBtn);
      tr.appendChild(deleteTd);

      this.marksTableBody.appendChild(tr);
    });

    // Control header delete column visibility
    const deleteHeader = marksCard.querySelector('.delete-header-col');
    if (deleteHeader) {
      deleteHeader.style.display = this.isEditingMarks ? 'table-cell' : 'none';
    }
  }

  toggleEditMarksMode() {
    this.isEditingMarks = !this.isEditingMarks;
    const btnText = this.editMarksBtn.querySelector('.btn-text');
    const marksCard = this.marksTableBody.closest('.sem-marks-panel');

    if (this.isEditingMarks) {
      document.body.classList.add('edit-marks-active');
      if (btnText) btnText.textContent = 'Save Marks';
      if (this.addMarksSubjectBtn) this.addMarksSubjectBtn.style.display = 'inline-block';
      
      this.renderMarks();
    } else {
      document.body.classList.remove('edit-marks-active');
      if (btnText) btnText.textContent = 'Edit Marks';
      if (this.addMarksSubjectBtn) this.addMarksSubjectBtn.style.display = 'none';

      // Clean empty items in arrays
      this.marksData.forEach(row => {
        if (!row.marks) row.marks = [];
        for (let i = 0; i < 6; i++) {
          if (!row.marks[i]) {
            row.marks[i] = { label: '', value: '' };
          }
        }
      });

      this.saveMarksData();
      this.renderMarks();

      // Update marks graph live when table is saved!
      if (this.marksGraph) {
        this.marksGraph.updateData(false);
      }
    }
  }

  addMarksSubjectRow() {
    if (!this.isEditingMarks) return;
    
    const newRow = {
      subject: '',
      marks: [
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' },
        { label: '', value: '' }
      ],
      total: ''
    };

    this.marksData.push(newRow);
    this.renderMarks();

    setTimeout(() => {
      const inputs = this.marksTableBody.querySelectorAll('.marks-subject-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  }

  deleteMarksSubjectRow(index) {
    this.marksData.splice(index, 1);
    this.renderMarks();
  }

  saveMarksData() {
    localStorage.setItem(this.storageKeyMarks, JSON.stringify(this.marksData));
  }

  loadMarksData() {
    const rawMarks = localStorage.getItem(this.storageKeyMarks);
    if (rawMarks) {
      try {
        this.marksData = JSON.parse(rawMarks);
        if (!Array.isArray(this.marksData)) this.marksData = [];
      } catch (e) {
        console.error('Error loading Marks data', e);
        this.marksData = [];
      }
    } else {
      // Seed default marks table
      this.marksData = [
        {
          subject: 'Design and Analysis of Algorithms',
          marks: [
            { label: 'IA1', value: '18/20' },
            { label: 'IA2', value: '17/20' },
            { label: 'Mid', value: '42/50' },
            { label: 'End', value: '88/100' },
            { label: 'Viva', value: '9/10' },
            { label: 'Lab', value: '19/20' }
          ],
          total: '193/220'
        },
        {
          subject: 'Computer Networks',
          marks: [
            { label: 'IA1', value: '15/20' },
            { label: 'IA2', value: '16/20' },
            { label: 'Mid', value: '38/50' },
            { label: 'End', value: '82/100' },
            { label: 'Quiz', value: '8/10' },
            { label: 'Lab', value: '18/20' }
          ],
          total: '177/220'
        },
        {
          subject: 'Database Management Systems',
          marks: [
            { label: 'IA1', value: '19/20' },
            { label: 'IA2', value: '18/20' },
            { label: 'Mid', value: '45/50' },
            { label: 'End', value: '92/100' },
            { label: 'Proj', value: '28/30' },
            { label: 'Lab', value: '20/20' }
          ],
          total: '222/240'
        }
      ];
      this.saveMarksData();
    }
  }
}

// Make globally available to main.js
window.SemEngine = SemEngine;

class MarksGraph {
  constructor(engine) {
    this.engine = engine;
    this.canvas = document.getElementById('marks-graph-canvas');
    this.tooltip = document.getElementById('marks-graph-tooltip');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    
    this.data = []; // Array of {subject: string, obtained: number, total: number, curObtained: number, curTotal: number, targetObtained: number, targetTotal: number}
    
    this.revealProgress = 0;
    this.animating = false;
    this.mouse = { x: -1000, y: -1000, hoverIdx: -1 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      this.mouse.x = clientX * (this.canvas.width / rect.width);
      this.mouse.y = clientY * (this.canvas.height / rect.height);
      this.checkHover(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.hoverIdx = -1;
      if (this.tooltip) this.tooltip.style.opacity = '0';
      this.render();
    });

    this.updateData(true);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    this.render();
  }

  updateData(isInitial = false) {
    const rawData = this.engine.marksData;
    
    let updatedData = [];
    rawData.forEach((row, idx) => {
      const subject = row.subject || `Subject ${idx + 1}`;
      let obtained = 0;
      let total = 0;
      
      if (row.total && row.total.includes('/')) {
        const parts = row.total.split('/');
        const parsedObt = parseFloat(parts[0]);
        const parsedTot = parseFloat(parts[1]);
        if (!isNaN(parsedObt) && !isNaN(parsedTot) && parsedTot > 0) {
          obtained = parsedObt;
          total = parsedTot;
        }
      }

      let existing = this.data[idx];
      let curObtained = 0;
      let curTotal = 0;
      if (existing) {
        curObtained = isInitial ? 0 : existing.curObtained;
        curTotal = isInitial ? 0 : existing.curTotal;
      }

      updatedData.push({
        subject: subject,
        obtained: obtained,
        total: total,
        curObtained: curObtained,
        curTotal: curTotal,
        targetObtained: obtained,
        targetTotal: total
      });
    });

    this.data = updatedData;

    if (isInitial) {
      this.revealProgress = 0;
      this.animateEmerge();
    } else {
      this.startTransition();
    }
  }

  animateEmerge() {
    if (this.animating) return;
    this.animating = true;

    const duration = 1200;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      this.revealProgress = 1 - Math.pow(1 - progress, 3); // ease out cubic

      this.data.forEach(d => {
        d.curObtained = d.targetObtained * this.revealProgress;
        d.curTotal = d.targetTotal * this.revealProgress;
      });

      this.render();

      if (progress < 1.0) {
        requestAnimationFrame(tick);
      } else {
        this.revealProgress = 1;
        this.animating = false;
        this.data.forEach(d => {
          d.curObtained = d.targetObtained;
          d.curTotal = d.targetTotal;
        });
        this.render();
      }
    };
    requestAnimationFrame(tick);
  }

  startTransition() {
    if (this.animating) return;
    this.animating = true;

    const duration = 600;
    const startTime = performance.now();

    this.data.forEach(d => {
      d.startObtained = d.curObtained;
      d.startTotal = d.curTotal;
    });

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; // easeInOutQuad

      this.data.forEach(d => {
        const startObt = d.startObtained || 0;
        const startTot = d.startTotal || 0;
        d.curObtained = startObt + (d.targetObtained - startObt) * ease;
        d.curTotal = startTot + (d.targetTotal - startTot) * ease;
      });

      this.render();

      if (progress < 1.0) {
        requestAnimationFrame(tick);
      } else {
        this.data.forEach(d => {
          d.curObtained = d.targetObtained;
          d.curTotal = d.targetTotal;
        });
        this.animating = false;
        this.render();
      }
    };
    requestAnimationFrame(tick);
  }

  checkHover(clientX, clientY) {
    if (this.data.length === 0) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;
    
    const chartWidth = width - paddingLeft - paddingRight;
    
    let hoverIdx = -1;
    const colWidth = chartWidth / this.data.length;
    
    const mouseX = this.mouse.x / (window.devicePixelRatio || 1);
    const mouseY = this.mouse.y / (window.devicePixelRatio || 1);

    if (mouseX >= paddingLeft && mouseX <= width - paddingRight && mouseY >= paddingTop && mouseY <= height - paddingBottom) {
      const idx = Math.floor((mouseX - paddingLeft) / colWidth);
      if (idx >= 0 && idx < this.data.length) {
        hoverIdx = idx;
      }
    }

    if (hoverIdx !== this.mouse.hoverIdx) {
      this.mouse.hoverIdx = hoverIdx;
      this.render();

      if (hoverIdx !== -1 && this.tooltip) {
        const d = this.data[hoverIdx];
        const percent = d.targetTotal > 0 ? ((d.targetObtained / d.targetTotal) * 100).toFixed(1) : '0';
        
        this.tooltip.innerHTML = `
          <span class="tooltip-subj">${d.subject}</span>
          <span class="tooltip-obtained">Obtained: ${d.targetObtained} marks</span>
          <span class="tooltip-total">Total Possible: ${d.targetTotal} marks (${percent}%)</span>
        `;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = paddingLeft + (hoverIdx + 0.5) * colWidth;
        
        let maxTotalOverall = 100;
        this.data.forEach(item => {
          if (item.targetTotal > maxTotalOverall) maxTotalOverall = item.targetTotal;
        });
        const chartHeight = height - paddingTop - paddingBottom;
        const y = paddingTop + chartHeight - (d.curObtained / maxTotalOverall) * chartHeight;
        
        this.tooltip.style.left = `${rect.left + window.scrollX + x}px`;
        this.tooltip.style.top = `${rect.top + window.scrollY + y}px`;
        this.tooltip.style.opacity = '1';
      } else if (this.tooltip) {
        this.tooltip.style.opacity = '0';
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    if (this.data.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '400 0.85rem var(--font-family-sans)';
      ctx.textAlign = 'center';
      ctx.fillText('No marks data available.', width / 2, height / 2);
      return;
    }

    let maxTotalOverall = 100;
    this.data.forEach(d => {
      if (d.curTotal > maxTotalOverall) maxTotalOverall = d.curTotal;
      if (d.targetTotal > maxTotalOverall) maxTotalOverall = d.targetTotal;
    });

    const roundedMax = Math.ceil(maxTotalOverall / 20) * 20;

    const isWhiteTheme = document.body.classList.contains('white-theme');

    ctx.strokeStyle = isWhiteTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const tickVal = (roundedMax / 4) * i;
      const y = paddingTop + chartHeight - (tickVal / roundedMax) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = isWhiteTheme ? 'rgba(84, 96, 122, 0.75)' : 'rgba(255, 255, 255, 0.25)';
      ctx.font = '500 0.72rem var(--font-family-sans)';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(tickVal).toString(), paddingLeft - 15, y + 4);
    }

    const colWidth = chartWidth / this.data.length;
    const barMarginPercent = 0.24;
    const innerBarMarginPercent = 0.36;

    if (this.mouse.hoverIdx !== -1) {
      ctx.fillStyle = isWhiteTheme ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(paddingLeft + this.mouse.hoverIdx * colWidth, paddingTop, colWidth, chartHeight);
    }

    this.data.forEach((d, idx) => {
      const xStart = paddingLeft + idx * colWidth;
      const xCenter = xStart + colWidth / 2;

      ctx.fillStyle = isWhiteTheme ? '#4a5164' : 'rgba(255, 255, 255, 0.3)';
      ctx.font = '500 0.7rem var(--font-family-sans)';
      ctx.textAlign = 'center';
      
      let labelText = d.subject;
      const maxTextWidth = colWidth - 10;
      if (ctx.measureText(labelText).width > maxTextWidth) {
        while (ctx.measureText(labelText + '...').width > maxTextWidth && labelText.length > 2) {
          labelText = labelText.substring(0, labelText.length - 2);
        }
        labelText += '...';
      }
      ctx.fillText(labelText, xCenter, height - paddingBottom + 22);

      const outerBarWidth = colWidth * (1 - barMarginPercent * 2);
      const outerBarX = xCenter - outerBarWidth / 2;
      
      const totalHeight = (d.curTotal / roundedMax) * chartHeight;
      const totalY = paddingTop + chartHeight - totalHeight;

      if (totalHeight > 0.5) {
        const isHovered = idx === this.mouse.hoverIdx;
        
        const outerFill = isWhiteTheme
          ? (isHovered ? 'rgba(230, 81, 0, 0.1)' : 'rgba(230, 81, 0, 0.05)')
          : (isHovered ? 'rgba(255, 159, 67, 0.08)' : 'rgba(255, 159, 67, 0.04)');
        
        const outerStroke = isWhiteTheme
          ? (isHovered ? 'rgba(230, 81, 0, 0.75)' : 'rgba(230, 81, 0, 0.5)')
          : (isHovered ? 'rgba(255, 159, 67, 0.65)' : 'rgba(255, 159, 67, 0.4)');
          
        const outerShadow = isWhiteTheme
          ? 'rgba(230, 81, 0, 0.3)'
          : 'rgba(255, 159, 67, 0.25)';

        ctx.fillStyle = outerFill;
        ctx.strokeStyle = outerStroke;
        ctx.lineWidth = 1.5;

        if (isHovered) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = outerShadow;
        } else {
          ctx.shadowBlur = 3;
          ctx.shadowColor = outerShadow;
        }

        ctx.beginPath();
        const radius = Math.min(5, outerBarWidth / 2);
        ctx.roundRect(outerBarX, totalY, outerBarWidth, totalHeight, [radius, radius, 0, 0]);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset shadow blur immediately so it doesn't leak

        const innerBarWidth = colWidth * (1 - innerBarMarginPercent * 2);
        const innerBarX = xCenter - innerBarWidth / 2;
        
        const obtainedHeight = (d.curObtained / roundedMax) * chartHeight;
        const obtainedY = paddingTop + chartHeight - obtainedHeight;

        if (obtainedHeight > 0.5) {
          const isHovered = idx === this.mouse.hoverIdx;
          
          const barGradi = ctx.createLinearGradient(innerBarX, obtainedY, innerBarX, paddingTop + chartHeight);
          const mainCyan = isWhiteTheme
            ? (isHovered ? '#0288d1' : '#0277bd')
            : (isHovered ? '#38bdf8' : '#0ea5e9');
            
          const endCyan = isWhiteTheme
            ? 'rgba(2, 136, 209, 0.25)'
            : 'rgba(56, 189, 248, 0.22)';

          barGradi.addColorStop(0, mainCyan);
          barGradi.addColorStop(1, endCyan);
          
          ctx.fillStyle = barGradi;
          
          ctx.beginPath();
          const innerRadius = Math.min(4, innerBarWidth / 2);
          ctx.roundRect(innerBarX, obtainedY, innerBarWidth, obtainedHeight, [innerRadius, innerRadius, 0, 0]);
          
          const innerShadowColor = isWhiteTheme ? 'rgba(2, 136, 209, 0.4)' : 'rgba(56, 189, 248, 0.6)';
          if (isHovered) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = innerShadowColor;
          } else {
            ctx.shadowBlur = 4;
            ctx.shadowColor = innerShadowColor;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });

    ctx.strokeStyle = isWhiteTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + chartHeight);
    ctx.lineTo(width - paddingRight, paddingTop + chartHeight);
    ctx.stroke();
  }
}
