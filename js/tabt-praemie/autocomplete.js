// DB25 Autocomplete Component
// Provides searchable dropdown with keyboard navigation for DB25 codes

class DB25Autocomplete {
    constructor(inputElement, onSelect) {
        this.inputElement = inputElement;
        this.onSelect = onSelect; // Callback function when item is selected
        this.db25Data = [];
        this.filteredData = [];
        this.dropdownElement = null;
        this.highlightedIndex = -1;
        this.isOpen = false;

        // Bind methods to preserve 'this' context
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleInputFocus = this.handleInputFocus.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    /**
     * Initialize the autocomplete with DB25 data
     */
    init(db25Data) {
        this.db25Data = db25Data;
        this.filteredData = db25Data;

        // Find or create dropdown element
        this.dropdownElement = document.getElementById('autocomplete-dropdown');

        if (!this.dropdownElement) {
            console.error('Autocomplete dropdown element not found');
            return;
        }

        // Setup event listeners
        this.inputElement.addEventListener('input', this.handleInput);
        this.inputElement.addEventListener('keydown', this.handleKeyDown);
        this.inputElement.addEventListener('focus', this.handleInputFocus);
        document.addEventListener('click', this.handleClickOutside);

        console.log('DB25 Autocomplete initialized with', db25Data.length, 'codes');
    }

    /**
     * Handle input changes - filter and show results
     */
    handleInput(event) {
        const searchTerm = event.target.value;
        this.filterResults(searchTerm);
        this.renderDropdown();
        this.showDropdown();
    }

    /**
     * Handle focus on input - show dropdown
     */
    handleInputFocus() {
        if (this.inputElement.value) {
            this.filterResults(this.inputElement.value);
        } else {
            this.filteredData = this.db25Data;
        }
        this.renderDropdown();
        this.showDropdown();
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyDown(event) {
        if (!this.isOpen) {
            // If dropdown is closed and user types, open it
            if (event.key.length === 1 || event.key === 'ArrowDown') {
                this.showDropdown();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.highlightNext();
                break;

            case 'ArrowUp':
                event.preventDefault();
                this.highlightPrevious();
                break;

            case 'Enter':
                event.preventDefault();
                if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredData.length) {
                    this.selectItem(this.filteredData[this.highlightedIndex]);
                }
                break;

            case 'Escape':
                event.preventDefault();
                this.closeDropdown();
                break;

            case 'Tab':
                // Allow tab to work normally, but close dropdown
                this.closeDropdown();
                break;
        }
    }

    /**
     * Handle clicks outside the autocomplete
     */
    handleClickOutside(event) {
        if (!this.inputElement.contains(event.target) &&
            !this.dropdownElement.contains(event.target)) {
            this.closeDropdown();
        }
    }

    /**
     * Filter results based on search term
     */
    filterResults(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredData = this.db25Data;
            return;
        }

        const codeMatches = [];
        const descriptionMatches = [];

        for (const item of this.db25Data) {
            // Prioritize code matches (exact or starts-with)
            if (item.code.toLowerCase().startsWith(term)) {
                codeMatches.push(item);
            }
            // Then description matches (substring)
            else if (item.description.toLowerCase().includes(term)) {
                descriptionMatches.push(item);
            }
        }

        // Combine results: code matches first, then description matches
        this.filteredData = [...codeMatches, ...descriptionMatches];
        this.highlightedIndex = this.filteredData.length > 0 ? 0 : -1;
    }

    /**
     * Render the dropdown with filtered results
     */
    renderDropdown() {
        if (this.filteredData.length === 0) {
            this.dropdownElement.innerHTML = `
                <div class="px-4 py-3 text-slate-500 text-sm text-center">
                    Ingen resultater fundet
                </div>
            `;
            return;
        }

        // Limit to first 100 results for performance
        const displayData = this.filteredData.slice(0, 100);

        const items = displayData.map((item, index) => {
            const isHighlighted = index === this.highlightedIndex;
            const highlightClass = isHighlighted ? 'bg-slate-100' : '';

            return `
                <div
                    class="autocomplete-item px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors ${highlightClass}"
                    data-index="${index}"
                    data-code="${this.escapeHtml(item.code)}"
                >
                    <span class="font-medium text-slate-900">${this.escapeHtml(item.code)}</span>
                    <span class="text-slate-600"> - ${this.escapeHtml(item.description)}</span>
                </div>
            `;
        }).join('');

        this.dropdownElement.innerHTML = items;

        // Add click listeners to each item
        this.dropdownElement.querySelectorAll('.autocomplete-item').forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectItem(this.filteredData[index]);
            });

            element.addEventListener('mouseenter', () => {
                this.highlightedIndex = index;
                this.updateHighlight();
            });
        });

        // Scroll highlighted item into view
        if (this.highlightedIndex >= 0) {
            this.scrollToHighlighted();
        }
    }

    /**
     * Highlight next item in the list
     */
    highlightNext() {
        if (this.filteredData.length === 0) return;

        this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredData.length;
        this.updateHighlight();
        this.scrollToHighlighted();
    }

    /**
     * Highlight previous item in the list
     */
    highlightPrevious() {
        if (this.filteredData.length === 0) return;

        this.highlightedIndex = this.highlightedIndex <= 0
            ? this.filteredData.length - 1
            : this.highlightedIndex - 1;

        this.updateHighlight();
        this.scrollToHighlighted();
    }

    /**
     * Update visual highlight of items
     */
    updateHighlight() {
        const items = this.dropdownElement.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === this.highlightedIndex) {
                item.classList.add('bg-slate-100');
            } else {
                item.classList.remove('bg-slate-100');
            }
        });
    }

    /**
     * Scroll highlighted item into view
     */
    scrollToHighlighted() {
        if (this.highlightedIndex < 0) return;

        const items = this.dropdownElement.querySelectorAll('.autocomplete-item');
        const highlightedItem = items[this.highlightedIndex];

        if (highlightedItem) {
            highlightedItem.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    /**
     * Select an item and trigger callback
     */
    selectItem(item) {
        if (!item) return;

        console.log('Selected DB25 code:', item.code, item.description);

        // Update input to show selected code + description
        this.inputElement.value = `${item.code} - ${item.description}`;

        // Close dropdown
        this.closeDropdown();

        // Trigger callback with selected item
        if (this.onSelect) {
            this.onSelect(item);
        }
    }

    /**
     * Show the dropdown
     */
    showDropdown() {
        this.dropdownElement.classList.remove('hidden');
        this.isOpen = true;
    }

    /**
     * Close the dropdown
     */
    closeDropdown() {
        this.dropdownElement.classList.add('hidden');
        this.isOpen = false;
        this.highlightedIndex = -1;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy the autocomplete and remove event listeners
     */
    destroy() {
        this.inputElement.removeEventListener('input', this.handleInput);
        this.inputElement.removeEventListener('keydown', this.handleKeyDown);
        this.inputElement.removeEventListener('focus', this.handleInputFocus);
        document.removeEventListener('click', this.handleClickOutside);

        this.closeDropdown();

        console.log('DB25 Autocomplete destroyed');
    }
}
