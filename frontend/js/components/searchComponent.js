/**
 * Global Search-First Autocomplete Component for Hospital ERP
 * Replaces static select dropdowns with server-backed, type-ahead predictive search.
 */

class SearchComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.options = Object.assign({
      endpoint: '',
      queryParam: 'search',
      placeholder: 'Search by UHID, Name, Phone, Code...',
      minChars: 1,
      debounceMs: 250,
      transformResponse: (res) => res.data?.patients || res.data?.doctors || res.data?.items || res.data?.beds || res.data?.tests || res.data || [],
      displayFormatter: (item) => item.uhid ? `${item.uhid} — ${item.fullName || item.name} (${item.phone || ''})` : (item.name || item.fullName || item.title || JSON.stringify(item)),
      subFormatter: (item) => item.department || item.category || item.status || '',
      onSelect: (item) => console.log('Selected:', item),
      id: `search_input_${Math.random().toString(36).substr(2, 9)}`
    }, options);

    this.timer = null;
    this.results = [];
    this.selectedIndex = -1;

    this.initUI();
  }

  initUI() {
    this.container.classList.add('position-relative', 'search-first-container');
    this.container.innerHTML = `
      <div class="input-group">
        <span class="input-group-text bg-light text-muted border-end-0">
          <i class="bi bi-search"></i>
        </span>
        <input type="text" 
          id="${this.options.id}" 
          class="form-control border-start-0 ps-0 search-first-input" 
          placeholder="${this.options.placeholder}" 
          autocomplete="off" />
        <button class="btn btn-outline-secondary search-clear-btn d-none" type="button">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="dropdown-menu w-100 shadow-sm mt-1 search-first-results p-0 overflow-auto" 
           style="max-height: 280px; display: none; z-index: 1055;">
      </div>
    `;

    this.input = this.container.querySelector('.search-first-input');
    this.clearBtn = this.container.querySelector('.search-clear-btn');
    this.resultsBox = this.container.querySelector('.search-first-results');

    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener('input', () => {
      const q = this.input.value.trim();
      this.clearBtn.classList.toggle('d-none', !q);
      
      clearTimeout(this.timer);
      if (q.length < this.options.minChars) {
        this.hideResults();
        return;
      }

      this.timer = setTimeout(() => this.fetchResults(q), this.options.debounceMs);
    });

    this.input.addEventListener('keydown', (e) => {
      const items = this.resultsBox.querySelectorAll('.search-result-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % items.length;
        this.highlightItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
        this.highlightItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
          this.selectItem(this.results[this.selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        this.hideResults();
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.clearBtn.classList.add('d-none');
      this.hideResults();
      this.input.focus();
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  async fetchResults(query) {
    try {
      this.showLoading();
      const url = new URL(this.options.endpoint, window.location.origin);
      url.searchParams.set(this.options.queryParam, query);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();
      
      if (data.success || data.data) {
        this.results = this.options.transformResponse(data);
        this.renderResults();
      } else {
        this.renderEmpty();
      }
    } catch (err) {
      console.error('Search fetch error:', err);
      this.renderEmpty('Failed to load search results');
    }
  }

  showLoading() {
    this.resultsBox.style.display = 'block';
    this.resultsBox.innerHTML = `
      <div class="p-3 text-center text-muted small">
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
        Searching records...
      </div>
    `;
  }

  renderEmpty(msg = 'No matching records found') {
    this.resultsBox.style.display = 'block';
    this.resultsBox.innerHTML = `
      <div class="p-3 text-center text-muted small">${msg}</div>
    `;
  }

  renderResults() {
    if (!this.results || this.results.length === 0) {
      this.renderEmpty();
      return;
    }

    this.selectedIndex = -1;
    this.resultsBox.style.display = 'block';
    this.resultsBox.innerHTML = this.results.map((item, idx) => `
      <a href="javascript:void(0)" class="dropdown-item p-2.5 border-bottom search-result-item" data-index="${idx}">
        <div class="fw-semibold text-dark text-truncate">${this.options.displayFormatter(item)}</div>
        ${this.options.subFormatter(item) ? `<div class="text-muted extra-small">${this.options.subFormatter(item)}</div>` : ''}
      </a>
    `).join('');

    this.resultsBox.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        this.selectItem(this.results[idx]);
      });
    });
  }

  highlightItem(items) {
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('active', 'bg-primary', 'text-white');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active', 'bg-primary', 'text-white');
      }
    });
  }

  selectItem(item) {
    this.input.value = this.options.displayFormatter(item);
    this.hideResults();
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(item);
    }
  }

  hideResults() {
    this.resultsBox.style.display = 'none';
    this.selectedIndex = -1;
  }

  setValue(text) {
    if (this.input) {
      this.input.value = text;
      this.clearBtn.classList.toggle('d-none', !text);
    }
  }
}

if (typeof window !== 'undefined') {
  window.SearchComponent = SearchComponent;
}
