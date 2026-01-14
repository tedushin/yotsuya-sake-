document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        allItems: [],
        filteredItems: [],
        selectedItems: [], // Set of ID strings
        orientation: 'portrait', // 'portrait' or 'landscape'
        title: 'おすすめ日本酒',
        titleStyle: {
            size: '48px',
            color: '#333333',
            bold: false,
            italic: false,
            underline: false,
            font: "'Noto Serif JP', serif"
        }
    };

    // --- DOM Elements ---
    const elements = {
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        selectionCount: document.getElementById('selection-count'),
        radioPortrait: document.getElementById('radio-portrait'),
        radioLandscape: document.getElementById('radio-landscape'),
        toggleBtns: document.querySelectorAll('.toggle-btn'),
        previewContainer: document.getElementById('preview-container'),
        menuGrid: document.getElementById('menu-grid'),
        menuTitleInput: document.getElementById('menu-title-input'),
        sidebarTitleInput: document.getElementById('sidebar-title-input'),

        // Style Inputs
        titleSizeInput: document.getElementById('title-size-input'),
        titleColorInput: document.getElementById('title-color-input'),
        btnBold: document.getElementById('btn-bold'),
        btnItalic: document.getElementById('btn-italic'),
        btnUnderline: document.getElementById('btn-underline'),
        titleFontSelect: document.getElementById('title-font-select'),

        // Price Style
        priceSizeInput: document.getElementById('price-size-input'),
        priceSizeDisplay: document.getElementById('price-size-display'),

        // Item Font
        itemFontSelect: document.getElementById('item-font-select'),

        // Background
        bgImageInput: document.getElementById('bg-image-input'),

        printBtn: document.getElementById('print-btn')
    };

    // --- Initialization ---
    init();

    async function init() {
        try {
            const response = await fetch('sake_list.json');
            const data = await response.json();
            // Filter out hidden items and items without names (prevent errors)
            state.allItems = data.filter(item => !item.isHidden && item['商品名']);
            state.filteredItems = [...state.allItems];
            renderSearchList();
        } catch (error) {
            console.error('Failed to load menu items:', error);
            elements.searchResults.innerHTML = '<div style="padding:10px; color:red;">データの読み込みに失敗しました</div>';
        }

        setupEventListeners();
        applyTitleStyles(); // Apply defaults

        // Apply initial price size from input
        if (elements.priceSizeInput) {
            document.documentElement.style.setProperty('--price-size', elements.priceSizeInput.value + 'px');
            if (elements.priceSizeDisplay) elements.priceSizeDisplay.textContent = elements.priceSizeInput.value + 'px';
        }

        updatePreview();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Search
        elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            state.filteredItems = state.allItems.filter(item => {
                const name = (item['商品名'] || '').toLowerCase();
                const region = (item['産地'] || '').toLowerCase();
                const brewery = (item['蔵元'] || '').toLowerCase();
                return name.includes(query) || region.includes(query) || brewery.includes(query);
            });
            renderSearchList();
        });

        // Orientation
        elements.toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                setOrientation(mode);
            });
        });

        // Title Sync (Two-way)
        elements.menuTitleInput.addEventListener('input', (e) => {
            state.title = e.target.value;
            elements.sidebarTitleInput.value = state.title;
        });

        elements.sidebarTitleInput.addEventListener('input', (e) => {
            state.title = e.target.value;
            elements.menuTitleInput.value = state.title;
        });

        // Title Styling
        elements.titleSizeInput.addEventListener('input', (e) => {
            state.titleStyle.size = e.target.value + 'px';
            applyTitleStyles();
        });

        elements.titleColorInput.addEventListener('input', (e) => {
            state.titleStyle.color = e.target.value;
            applyTitleStyles();
        });

        elements.btnBold.addEventListener('click', () => {
            state.titleStyle.bold = !state.titleStyle.bold;
            toggleBtnState(elements.btnBold, state.titleStyle.bold);
            applyTitleStyles();
        });

        elements.btnItalic.addEventListener('click', () => {
            state.titleStyle.italic = !state.titleStyle.italic;
            toggleBtnState(elements.btnItalic, state.titleStyle.italic);
            applyTitleStyles();
        });

        elements.btnUnderline.addEventListener('click', () => {
            state.titleStyle.underline = !state.titleStyle.underline;
            toggleBtnState(elements.btnUnderline, state.titleStyle.underline);
            applyTitleStyles();
        });

        elements.titleFontSelect.addEventListener('change', (e) => {
            state.titleStyle.font = e.target.value;
            applyTitleStyles();
        });

        // Price Size
        elements.priceSizeInput.addEventListener('input', (e) => {
            const size = e.target.value;
            document.documentElement.style.setProperty('--price-size', size + 'px');
            if (elements.priceSizeDisplay) elements.priceSizeDisplay.textContent = size + 'px';
        });

        // Item Font
        elements.itemFontSelect.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--item-font', e.target.value);
        });

        // Background Image
        elements.bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('menu-bg-layer').style.backgroundImage = `url('${evt.target.result}')`;
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById('menu-bg-layer').style.backgroundImage = '';
            }
        });

        // Print
        elements.printBtn.addEventListener('click', () => {
            // Ensure print is clean
            window.print();
        });
    }

    function toggleBtnState(btn, isActive) {
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    }

    function applyTitleStyles() {
        const s = state.titleStyle;
        const input = elements.menuTitleInput;

        input.style.fontSize = s.size;
        input.style.color = s.color;
        input.style.fontWeight = s.bold ? 'bold' : 'normal';
        input.style.fontStyle = s.italic ? 'italic' : 'normal';
        input.style.textDecoration = s.underline ? 'underline' : 'none';
        input.style.fontFamily = s.font;
    }


    // --- Actions ---
    function setOrientation(mode) {
        state.orientation = mode;
        // Update UI
        elements.toggleBtns.forEach(btn => {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        updatePreview();
        updatePageStyle(mode);
    }

    function updatePageStyle(mode) {
        let style = document.getElementById('page-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'page-style';
            document.head.appendChild(style);
        }
        // Force specific size for print dialog
        style.innerHTML = `@page { size: A4 ${mode}; margin: 0; }`;
    }

    function toggleSelection(item) {
        // Find if already selected
        const idx = state.selectedItems.findIndex(sel => sel === item);

        if (idx >= 0) {
            // Remove
            state.selectedItems.splice(idx, 1);
        } else {
            // Add (Limit check)
            if (state.selectedItems.length >= 10) {
                alert('最大10個まで選択可能です');
                return;
            }
            state.selectedItems.push(item);
        }

        updateUI();
    }

    function updateUI() {
        // Update Search List Classes
        renderSearchList(false); // Don't full re-render, just update classes? Actually simple re-render is fast enough for < 1000 items usually, but let's optimize if needed. For now re-render 50 items max visible.
        // Actually, let's just re-render visible interactions or smarter DOM updates.
        // For simplicity, re-rendering the visible list matches.
        renderSearchList();

        // Update Counter
        elements.selectionCount.textContent = state.selectedItems.length;

        // Update Preview
        updatePreview();
    }

    // --- Rendering ---
    function renderSearchList(fullRebuild = true) {
        // Performance: limit rendering if list is huge? 
        // User asked for "search", so filtered list is usually small.
        // We render just the top 100 to avoid lag if empty query.
        const limit = 100;
        const list = state.filteredItems.slice(0, limit);

        elements.searchResults.innerHTML = '';

        list.forEach(item => {
            const div = document.createElement('div');
            const isSelected = state.selectedItems.includes(item);

            div.className = `search-item ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `
                <div>
                    <div class="item-name">${item['商品名']}</div>
                    <div class="item-brewery">${item['産地']} / ${item['蔵元']}</div>
                </div>
                ${isSelected ? '<span>✔</span>' : ''}
            `;
            div.addEventListener('click', () => toggleSelection(item));
            elements.searchResults.appendChild(div);
        });

        if (state.filteredItems.length > limit) {
            const more = document.createElement('div');
            more.style.padding = '10px';
            more.style.textAlign = 'center';
            more.style.color = '#666';
            more.textContent = `...and ${state.filteredItems.length - limit} more`;
            elements.searchResults.appendChild(more);
        }
    }

    // --- Auto-Fit Preview Logic ---
    function fitPreviewToScreen() {
        const mainArea = document.getElementById('main-area');
        const container = elements.previewContainer;

        // 1. Reset to base state to measure natural dimensions
        container.style.transform = 'none';
        container.style.width = ''; // Reset explicit width/height if any, rely on CSS classes
        container.style.height = '';

        // Force reflow
        void container.offsetWidth;

        // 2. Measure
        const naturalWidth = container.offsetWidth;
        const naturalHeight = container.offsetHeight;

        const padding = 40; // 20px padding each side
        const availableWidth = mainArea.clientWidth - padding;
        const availableHeight = mainArea.clientHeight - padding;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        // 3. Calculate Scale
        const scaleX = availableWidth / naturalWidth;
        const scaleY = availableHeight / naturalHeight;
        const scale = Math.min(scaleX, scaleY, 0.95); // Max 0.95 to keep a little breathing room

        // 4. Apply
        // We use transform for scaling.
        // Centering is handled by the parent flexbox (main-area) combined with transform-origin: center.
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'center center';

        // Ensure no scrollbars on main area
        mainArea.scrollTop = 0;
        mainArea.scrollLeft = 0;
    }

    // Call fit on resize
    window.addEventListener('resize', fitPreviewToScreen);


    function updatePreview() {
        const pContainer = elements.previewContainer;
        const grid = elements.menuGrid;
        const items = state.selectedItems;
        const count = items.length;

        // Orientation Class
        pContainer.className = state.orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait';

        // Recalculate layout
        grid.style.display = 'grid';
        grid.innerHTML = '';

        if (count === 0) {
            grid.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#ccc;">左のサイドバーからアイテムを選択してください</div>';
            setTimeout(fitPreviewToScreen, 0);
            return;
        }

        // --- Layout Calculation ---
        let columns = 1;
        let rows = 1;

        if (state.orientation === 'landscape') {
            // A4 Landscape
            if (count <= 2) {
                columns = count;
                rows = 1;
            } else {
                rows = 2;
                const slots = count % 2 === 0 ? count : count + 1;
                columns = slots / 2;
            }
        } else {
            // A4 Portrait
            if (count <= 2) {
                columns = 1;
                rows = count;
            } else {
                columns = 2;
                const slots = count % 2 === 0 ? count : count + 1;
                rows = slots / 2;
            }
        }

        grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        // Add class for count-based styling
        grid.className = 'menu-grid count-' + count;

        // Render Cards
        items.forEach(item => {
            const card = createCard(item);
            grid.appendChild(card);
        });

        if (count % 2 !== 0) {
            const logo = document.createElement('div');
            logo.className = 'menu-item-card logo-slot';
            // Adjust logo slot to match layout density if needed
            grid.appendChild(logo);
        }

        // Fit to screen after render
        setTimeout(fitPreviewToScreen, 10);
    }

    function createCard(item) {
        const div = document.createElement('div');
        div.className = 'menu-item-card';

        // Extract specific fields
        const region = item['産地'] || '';
        const brewery = item['蔵元'] || '';
        const grade = item['グレード'] || '';

        // Try to guess a default price? Or leave blank.
        // Let's use 720ml price if available as a hint, otherwise empty.
        let defaultPrice = '';
        if (item['720mL500mL価格税抜'] && item['720mL500mL価格税抜'] !== '-') {
            defaultPrice = item['720mL500mL価格税抜'];
        }

        div.innerHTML = `
            <div class="menu-item-header-row">
                <span class="item-region">${region}</span>
                <span class="item-brewery">${brewery}</span>
            </div>
            
            <div class="menu-item-main-content">
                <div class="menu-item-name">
                    ${item['商品名']}
                    ${grade ? `<span class="menu-item-grade">${grade}</span>` : ''}
                </div>
            </div>
            
            <div class="menu-item-desc">
                 ${item['キャッチ'] ? `<div class="menu-item-catch">${item['キャッチ']}</div>` : ''}
                 ${item['コメント'] || ''}
            </div>

            <div class="menu-item-price-area">
                <input type="text" class="menu-item-price-input" placeholder="価格" value="${defaultPrice}">
                <span class="menu-item-price-unit">円</span>
            </div>
        `;
        return div;
    }
});
