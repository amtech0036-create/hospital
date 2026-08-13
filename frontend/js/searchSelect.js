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

  function closeDropdown() {
    dropdown.classList.remove('search-select-dropdown--open');
    dropdown.classList.add('d-none');
    root.classList.remove('search-select-open');
    activeIndex = -1;
    dropdown.style.top = '';
    dropdown.style.left = '';
    dropdown.style.width = '';
    dropdown.style.maxWidth = '';
    dropdown.style.maxHeight = '';
    dropdown.style.bottom = '';
  }

  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    const viewportPad = 8;
    const minWidth = Math.min(Math.max(rect.width, 260), window.innerWidth - viewportPad * 2);
    const left = Math.min(
      Math.max(viewportPad, rect.left),
      window.innerWidth - minWidth - viewportPad
    );
    const maxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;

    dropdown.style.position = 'fixed';
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${minWidth}px`;
    dropdown.style.maxWidth = `${window.innerWidth - viewportPad * 2}px`;
    dropdown.style.right = 'auto';
    dropdown.style.zIndex = '1065';

    if (openUp) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      dropdown.style.maxHeight = `${Math.min(maxHeight, spaceAbove)}px`;
    } else {
      dropdown.style.bottom = 'auto';
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.maxHeight = `${Math.min(maxHeight, spaceBelow)}px`;
    }
  }

  function openDropdown() {
    dropdown.classList.remove('d-none');
    dropdown.classList.add('search-select-dropdown--open');
    root.classList.add('search-select-open');
    positionDropdown();
  }

  function renderDropdown(list) {
    if (!list.length) {
      dropdown.innerHTML = '<div class="search-select-empty">No matches found</div>';
      openDropdown();
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
    openDropdown();

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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const list = filterItems(input.value);
      if (dropdown.classList.contains('d-none')) renderDropdown(list);
      activeIndex = Math.min(activeIndex + 1, list.length - 1);
      renderDropdown(list);
      dropdown.querySelectorAll('.search-select-option')[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const list = filterItems(input.value);
      activeIndex = Math.max(activeIndex - 1, 0);
      renderDropdown(list);
      dropdown.querySelectorAll('.search-select-option')[activeIndex]?.scrollIntoView({ block: 'nearest' });
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

  function onReposition() {
    if (!dropdown.classList.contains('d-none')) positionDropdown();
  }

  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);

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
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      mountEl.innerHTML = '';
      mountEl.classList.remove('search-select-wrap');
    }
  };
}
