/**
 * Searchable combobox — type to filter, click to select.
 * Replaces long <select> lists for customers, products, suppliers, etc.
 *
 * @param {HTMLElement} mountEl - empty container; widget is rendered inside
 * @param {object} opts
 * @returns {{ getValue, setValue, setItems, clear, getSelectedItem, destroy, el }}
 */
function mountSearchSelect(mountEl, opts = {}) {
  const {
    items = [],
    value = '',
    placeholder = 'Search...',
    getLabel = (item) => item.name || '',
    getValue = (item) => item.id || '',
    getSubLabel = (item) => '',
    inputClass = 'form-control',
    size = '',
    required = false,
    onSelect = () => {}
  } = opts;

  let allItems = items.slice();
  let selectedItem = null;
  let activeIndex = -1;

  mountEl.innerHTML = '';
  mountEl.classList.add('search-select-wrap');

  const root = document.createElement('div');
  root.className = 'search-select';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = `${inputClass}${size ? ` form-control-${size}` : ''} search-select-input`;
  input.placeholder = placeholder;
  input.autocomplete = 'off';

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.className = 'search-select-value';
  if (required) hidden.required = true;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-select-dropdown d-none';

  root.appendChild(input);
  root.appendChild(hidden);
  root.appendChild(dropdown);
  mountEl.appendChild(root);

  function findItem(id) {
    return allItems.find((item) => getValue(item) === id) || null;
  }

  function filterItems(query) {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 50);
    return allItems
      .filter((item) => {
        const label = getLabel(item).toLowerCase();
        const sub = (getSubLabel(item) || '').toLowerCase();
        const id = String(getValue(item)).toLowerCase();
        return label.includes(q) || sub.includes(q) || id.includes(q);
      })
      .slice(0, 50);
  }

  function renderDropdown(list) {
    if (!list.length) {
      dropdown.innerHTML = '<div class="search-select-empty">No matches found</div>';
      dropdown.classList.remove('d-none');
      return;
    }
    dropdown.innerHTML = list
      .map((item, idx) => {
        const sub = getSubLabel(item);
        return `<button type="button" class="search-select-option${idx === activeIndex ? ' active' : ''}" data-idx="${idx}" data-id="${getValue(item)}">
          <span class="search-select-option-label">${escapeHtml(getLabel(item))}</span>
          ${sub ? `<span class="search-select-option-sub">${escapeHtml(sub)}</span>` : ''}
        </button>`;
      })
      .join('');
    dropdown.classList.remove('d-none');

    dropdown.querySelectorAll('.search-select-option').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectById(btn.dataset.id);
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeDropdown() {
    dropdown.classList.add('d-none');
    activeIndex = -1;
  }

  function selectItem(item) {
    selectedItem = item;
    hidden.value = getValue(item);
    input.value = getLabel(item);
    closeDropdown();
    onSelect(item);
  }

  function selectById(id) {
    const item = findItem(id);
    if (item) selectItem(item);
  }

  function clear() {
    selectedItem = null;
    hidden.value = '';
    input.value = '';
    closeDropdown();
  }

  input.addEventListener('focus', () => {
    renderDropdown(filterItems(input.value));
  });

  input.addEventListener('input', () => {
    if (selectedItem && input.value !== getLabel(selectedItem)) {
      selectedItem = null;
      hidden.value = '';
    }
    activeIndex = -1;
    renderDropdown(filterItems(input.value));
  });

  input.addEventListener('keydown', (e) => {
    const options = dropdown.querySelectorAll('.search-select-option');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dropdown.classList.contains('d-none')) renderDropdown(filterItems(input.value));
      activeIndex = Math.min(activeIndex + 1, options.length - 1);
      renderDropdown(filterItems(input.value));
      options[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderDropdown(filterItems(input.value));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = dropdown.querySelectorAll('.search-select-option')[activeIndex];
      if (opt) selectById(opt.dataset.id);
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  document.addEventListener('click', onDocClick);
  function onDocClick(e) {
    if (!root.contains(e.target)) closeDropdown();
  }

  if (value) {
    const item = findItem(value);
    if (item) selectItem(item);
  }

  return {
    el: root,
    getValue: () => hidden.value,
    getSelectedItem: () => selectedItem,
    setValue: (id) => {
      const item = findItem(id);
      if (item) selectItem(item);
    },
    setItems: (newItems) => {
      allItems = newItems.slice();
      if (selectedItem && !findItem(getValue(selectedItem))) clear();
    },
    clear,
    destroy: () => {
      document.removeEventListener('click', onDocClick);
      mountEl.innerHTML = '';
      mountEl.classList.remove('search-select-wrap');
    }
  };
}
