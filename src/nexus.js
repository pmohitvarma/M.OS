// M.OS Nexus Section Engine
// Manages a structured grid of 4 personal database panels (Ideas, Learning, Workflows, Skills).
// Provides independent edit sessions, row additions/deletions, and local storage state persistence.

// M.OS ScribX Note Utility Engine
class ScribXUtility {
  constructor() {
    this.storageKey = 'mymo_scribx_notes';
    this.notes = [];
    this.editingNoteId = null;

    // DOM selectors
    this.fab = document.getElementById('scribx-entry-btn'); // entry card
    this.modal = document.getElementById('scribx-modal');
    this.closeBtn = document.getElementById('scribx-close-btn');
    this.saveBtn = document.getElementById('scribx-save-btn');
    this.cancelBtn = document.getElementById('scribx-cancel-btn');
    this.textarea = document.getElementById('scribx-note-textarea');
    this.notesList = document.getElementById('scribx-notes-list');

    this.init();
  }

  init() {
    this.loadNotes();
    this.setupListeners();
    this.renderNotes();
  }

  loadNotes() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.notes = JSON.parse(raw);
        if (!Array.isArray(this.notes)) this.notes = [];
      } catch (e) {
        console.error('Error parsing ScribX notes', e);
        this.notes = [];
      }
    } else {
      this.notes = [];
    }
  }

  saveNotes() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
  }

  setupListeners() {
    if (this.fab) {
      this.fab.addEventListener('click', () => this.openModal());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveNote());
    }

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.cancelEdit());
    }
  }

  openModal() {
    if (this.modal) {
      this.modal.classList.add('active');
    }
    this.cancelEdit();
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  cancelEdit() {
    this.editingNoteId = null;
    if (this.textarea) {
      this.textarea.value = '';
    }
    if (this.saveBtn) {
      const btnText = this.saveBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Save Note';
    }
  }

  saveNote() {
    if (!this.textarea) return;
    const text = this.textarea.value.trim();
    if (!text) return;

    if (this.editingNoteId) {
      // Edit mode
      const note = this.notes.find(n => n.id === this.editingNoteId);
      if (note) {
        note.text = text;
        note.createdTime = new Date().toISOString(); // update timestamp on edit
      }
      this.editingNoteId = null;
      if (this.saveBtn) {
        const btnText = this.saveBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Save Note';
      }
    } else {
      // Create mode
      const newNote = {
        id: Date.now().toString(),
        text: text,
        createdTime: new Date().toISOString()
      };
      this.notes.unshift(newNote); // Prepend to show newest first
    }

    this.saveNotes();
    this.renderNotes();

    this.textarea.value = '';
    if (this.editingNoteId) {
      this.textarea.focus();
    }
  }

  editNote(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    this.editingNoteId = id;
    if (this.textarea) {
      this.textarea.value = note.text;
      this.textarea.focus();
    }

    if (this.saveBtn) {
      const btnText = this.saveBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Update Note';
    }
  }

  deleteNote(id) {
    this.notes = this.notes.filter(note => note.id !== id);
    if (this.editingNoteId === id) {
      this.cancelEdit();
    }
    this.saveNotes();
    this.renderNotes();
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    };
    return date.toLocaleString('en-US', options);
  }

  renderNotes() {
    if (!this.notesList) return;
    this.notesList.innerHTML = '';

    if (this.notes.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'no-event-message';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.gridColumn = 'span 2';
      emptyMsg.style.padding = '40px 20px';
      emptyMsg.textContent = 'No notes captured yet. Start typing above to log your thoughts!';
      this.notesList.appendChild(emptyMsg);
      return;
    }

    this.notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'scribx-note-card';

      const textEl = document.createElement('p');
      textEl.className = 'scribx-note-text';
      textEl.textContent = note.text;
      card.appendChild(textEl);

      const footerEl = document.createElement('div');
      footerEl.className = 'scribx-note-footer';

      const timeEl = document.createElement('span');
      timeEl.className = 'scribx-note-time';
      timeEl.textContent = this.formatDate(note.createdTime);
      footerEl.appendChild(timeEl);

      const actionsEl = document.createElement('div');
      actionsEl.className = 'scribx-note-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'scribx-action-btn edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => this.editNote(note.id));
      actionsEl.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'scribx-action-btn delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => this.deleteNote(note.id));
      actionsEl.appendChild(deleteBtn);

      footerEl.appendChild(actionsEl);
      card.appendChild(footerEl);

      this.notesList.appendChild(card);
    });
  }
}

window.ScribXUtility = ScribXUtility;

class NexusEngine {
  constructor() {
    this.panels = ['ideas', 'learning', 'workflows', 'skills'];
    this.storagePrefix = 'mymo_nexus_';
    
    this.data = {};
    this.editStates = {};
    this.originalBtnTexts = {};

    this.init();

    // Initialize ScribX Note Utility
    this.scribx = new ScribXUtility();
  }

  init() {
    this.panels.forEach(panel => {
      this.editStates[panel] = false;
      this.loadPanelData(panel);
      this.renderPanel(panel);
      this.setupPanelListeners(panel);
    });
  }

  loadPanelData(panel) {
    const key = this.storagePrefix + panel;
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        this.data[panel] = JSON.parse(raw);
        if (!Array.isArray(this.data[panel])) this.data[panel] = [];
      } catch (e) {
        console.error(`Error loading Nexus data for ${panel}`, e);
        this.data[panel] = [];
      }
    } else {
      // Seed default mockup elements
      this.data[panel] = this.getDefaultSeeds(panel);
      this.saveToStorage(panel);
    }
  }

  saveToStorage(panel) {
    const key = this.storagePrefix + panel;
    localStorage.setItem(key, JSON.stringify(this.data[panel]));
  }

  getDefaultSeeds(panel) {
    switch (panel) {
      case 'ideas':
        return [
          { name: 'AI Code Companion Widget', phase: 'Discovery', status: 'In Progress', color: 'blue' },
          { name: 'Glassmorphic Design Assets', phase: 'Prototyping', status: 'Completed', color: 'green' },
          { name: 'Autonomous Server Monitor', phase: 'Ideation', status: 'Planned', color: 'blue' }
        ];
      case 'learning':
        return [
          { name: 'WebGL Shaders & Particle Systems', phase: 'Core Concept', status: 'In Progress', color: 'blue' },
          { name: 'SVG Interactive Animation Pathing', phase: 'Integration', status: 'Planned', color: 'blue' },
          { name: 'React Server Components Specs', phase: 'Architecture', status: 'Completed', color: 'green' }
        ];
      case 'workflows':
        return [
          { name: 'Git Commit Linter Pre-hook', phase: 'Configuration', status: 'Completed', color: 'green' },
          { name: 'Webpack Bundler Analytics Tuning', phase: 'Build Pipeline', status: 'In Progress', color: 'blue' },
          { name: 'Automated Playwright E2E Tests', phase: 'Testing', status: 'Planned', color: 'blue' }
        ];
      case 'skills':
        return [
          { name: 'Dynamic CSS Custom Properties', phase: 'Styling', status: 'Advanced', color: 'blue' },
          { name: 'WebSockets Telemetry Pipes', phase: 'Real-time', status: 'Intermediate', color: 'blue' },
          { name: 'State Machines (XState Pattern)', phase: 'Architecture', status: 'Beginner', color: 'blue' }
        ];
      default:
        return [];
    }
  }

  setupPanelListeners(panel) {
    const editBtn = document.getElementById(`edit-nexus-${panel}-btn`);
    const addBtn = document.getElementById(`add-nexus-${panel}-btn`);

    if (editBtn) {
      const btnText = editBtn.querySelector('.btn-text');
      if (btnText) {
        this.originalBtnTexts[panel] = btnText.textContent;
      }
      editBtn.addEventListener('click', () => this.toggleEditMode(panel));
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this.addRow(panel));
    }
  }

  renderPanel(panel) {
    const tbody = document.getElementById(`nexus-${panel}-body`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const panelData = this.data[panel];
    const isEditing = this.editStates[panel];

    if (panelData.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = isEditing ? 4 : 3;
      td.style.textAlign = 'center';
      td.style.color = 'var(--text-muted)';
      td.style.padding = '25px';
      td.textContent = 'No items found. Click "+ Add Row" in Edit Mode.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    panelData.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.style.animation = `trReveal 0.4s ${idx * 0.04}s cubic-bezier(0.16, 1, 0.3, 1) forwards`;

      // Name Column
      const tdName = document.createElement('td');
      const inputName = document.createElement('input');
      inputName.type = 'text';
      inputName.className = 'nexus-input name-input';
      inputName.value = row.name || '';
      inputName.placeholder = 'Item name...';
      inputName.readOnly = !isEditing;
      tdName.appendChild(inputName);
      tr.appendChild(tdName);

      // Phase Column
      const tdPhase = document.createElement('td');
      const inputPhase = document.createElement('input');
      inputPhase.type = 'text';
      inputPhase.className = 'nexus-input phase-input';
      inputPhase.value = row.phase || '';
      inputPhase.placeholder = 'Phase...';
      inputPhase.readOnly = !isEditing;
      tdPhase.appendChild(inputPhase);
      tr.appendChild(tdPhase);

      // Status Column
      const tdStatus = document.createElement('td');
      const wrapper = document.createElement('div');
      wrapper.className = 'status-cell-wrapper';

      const inputStatus = document.createElement('input');
      inputStatus.type = 'text';
      const statusColor = row.color || 'blue';
      inputStatus.className = `nexus-input status-input status-badge-${statusColor}`;
      inputStatus.dataset.color = statusColor;
      inputStatus.value = row.status || '';
      inputStatus.placeholder = 'Status...';
      inputStatus.readOnly = !isEditing;
      wrapper.appendChild(inputStatus);

      if (isEditing) {
        // Render Blue/Green color selector dots
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'color-picker-dots';

        const blueDot = document.createElement('span');
        blueDot.className = 'color-dot dot-blue' + (statusColor === 'blue' ? ' active' : '');
        blueDot.title = 'Blue theme';
        blueDot.addEventListener('click', () => {
          inputStatus.className = 'nexus-input status-input status-badge-blue';
          inputStatus.dataset.color = 'blue';
          dotsContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
          blueDot.classList.add('active');
        });

        const greenDot = document.createElement('span');
        greenDot.className = 'color-dot dot-green' + (statusColor === 'green' ? ' active' : '');
        greenDot.title = 'Green theme';
        greenDot.addEventListener('click', () => {
          inputStatus.className = 'nexus-input status-input status-badge-green';
          inputStatus.dataset.color = 'green';
          dotsContainer.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
          greenDot.classList.add('active');
        });

        dotsContainer.appendChild(blueDot);
        dotsContainer.appendChild(greenDot);
        wrapper.appendChild(dotsContainer);
      }

      tdStatus.appendChild(wrapper);
      tr.appendChild(tdStatus);

      // Delete Row Column
      const tdDelete = document.createElement('td');
      tdDelete.className = 'delete-nexus-col';
      tdDelete.style.display = isEditing ? 'table-cell' : 'none';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-nexus-row-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Delete Row';
      deleteBtn.addEventListener('click', () => this.deleteRow(panel, idx, tr));
      tdDelete.appendChild(deleteBtn);
      tr.appendChild(tdDelete);

      tbody.appendChild(tr);
    });
  }

  toggleEditMode(panel) {
    this.editStates[panel] = !this.editStates[panel];
    const isEditing = this.editStates[panel];

    const card = document.getElementById(`nexus-${panel}-card`);
    const editBtn = document.getElementById(`edit-nexus-${panel}-btn`);
    const addBtn = document.getElementById(`add-nexus-${panel}-btn`);
    const btnText = editBtn ? editBtn.querySelector('.btn-text') : null;

    if (isEditing) {
      // Enter editing session
      if (card) {
        card.classList.add('edit-nexus-active');
        card.classList.add(`nexus-${panel}-editing`);
      }
      if (btnText) btnText.textContent = `Save Details`;
      if (addBtn) addBtn.style.display = 'inline-block';

      this.renderPanel(panel);
      this.setDeleteColumnVisibility(panel, true);
    } else {
      // Save changes
      if (card) {
        card.classList.remove('edit-nexus-active');
        card.classList.remove(`nexus-${panel}-editing`);
      }
      if (btnText) btnText.textContent = this.originalBtnTexts[panel] || `Edit ${panel}`;
      if (addBtn) addBtn.style.display = 'none';

      this.setInputsReadOnly(panel, true);
      this.setDeleteColumnVisibility(panel, false);

      this.saveFromDOM(panel);
      this.saveToStorage(panel);
      this.renderPanel(panel);
    }
  }

  setInputsReadOnly(panel, readOnly) {
    const tbody = document.getElementById(`nexus-${panel}-body`);
    if (!tbody) return;

    const inputs = tbody.querySelectorAll('.nexus-input');
    inputs.forEach(input => {
      input.readOnly = readOnly;
    });
  }

  setDeleteColumnVisibility(panel, show) {
    const card = document.getElementById(`nexus-${panel}-card`);
    if (!card) return;

    const headerDel = card.querySelector('.delete-header-col-nexus');
    if (headerDel) {
      headerDel.style.display = show ? 'table-cell' : 'none';
    }

    const deleteCells = card.querySelectorAll('.delete-nexus-col');
    deleteCells.forEach(cell => {
      cell.style.display = show ? 'table-cell' : 'none';
    });
  }

  addRow(panel) {
    if (!this.editStates[panel]) return;

    const newRow = { name: '', phase: '', status: '', color: 'blue' };
    this.data[panel].push(newRow);
    this.renderPanel(panel);

    // Auto-focus name field of new row
    setTimeout(() => {
      const tbody = document.getElementById(`nexus-${panel}-body`);
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        if (rows.length > 0) {
          const nameInput = rows[rows.length - 1].querySelector('.name-input');
          if (nameInput) nameInput.focus();
        }
      }
    }, 50);
  }

  deleteRow(panel, index, rowEl) {
    rowEl.classList.add('nexus-row-deleting');
    setTimeout(() => {
      this.data[panel].splice(index, 1);
      this.renderPanel(panel);
    }, 400);
  }

  saveFromDOM(panel) {
    const tbody = document.getElementById(`nexus-${panel}-body`);
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const updatedData = [];

    rows.forEach(tr => {
      const nameInput = tr.querySelector('.name-input');
      const phaseInput = tr.querySelector('.phase-input');
      const statusInput = tr.querySelector('.status-input');

      // Prevent pushing empty/dummy rows if table was completely emptied
      if (nameInput && phaseInput && statusInput) {
        updatedData.push({
          name: nameInput.value.trim(),
          phase: phaseInput.value.trim(),
          status: statusInput.value.trim(),
          color: statusInput.dataset.color || 'blue'
        });
      }
    });

    this.data[panel] = updatedData;
  }
}

// Make globally available to main.js
window.NexusEngine = NexusEngine;

