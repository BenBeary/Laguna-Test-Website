(function () {
    const NEWS_DATA_PATH = 'json/news.json';

    const DEFAULT_POST = {
        href: '#',
        title: 'Untitled Post',
        date: '01-01-2026',
        thumbnail: 'images/misc/Placeholder.jpg'
    };

    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const MOBILE_BREAKPOINT_PX = 520;

    function getRoot() {
        return document.body.dataset.root || '';
    }

    function parsePostDate(str) {
        if (typeof str !== 'string') return parsePostDate(DEFAULT_POST.date);
        const parts = str.split('-').map(Number);
        if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) {
            return parsePostDate(DEFAULT_POST.date);
        }
        const [month, day, year] = parts;
        return new Date(year, month - 1, day);
    }

    function formatCardDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        return `${SHORT_MONTHS[date.getMonth()]} ${day}, ${date.getFullYear()}`;
    }

    function withDefaults(post) {
        const merged = { ...DEFAULT_POST, ...(post && typeof post === 'object' ? post : {}) };
        if (!merged.href) merged.href = DEFAULT_POST.href;
        if (!merged.title) merged.title = DEFAULT_POST.title;
        if (!merged.thumbnail) merged.thumbnail = DEFAULT_POST.thumbnail;
        if (!merged.date) merged.date = DEFAULT_POST.date;
        return merged;
    }

    function decorate(posts) {
        return (posts || []).map(post => {
            const filled = withDefaults(post);
            return { ...filled, _date: parsePostDate(filled.date) };
        });
    }

    function sortNewestFirst(posts) {
        return [...posts].sort((a, b) => b._date - a._date);
    }

    function resolveUrl(root, path) {
        // Resolve against document.baseURI so subpath deploys (e.g. GitHub Pages under /repo-name/) work.
        return new URL(`${root}${path}`, document.baseURI).href;
    }

    function renderMiniCard(post, root) {
        const card = document.createElement('a');
        card.href = resolveUrl(root, post.href);
        card.className = 'news-mini-card';

        const thumb = document.createElement('div');
        thumb.className = 'news-mini-card-thumb';
        const img = document.createElement('img');
        img.src = resolveUrl(root, post.thumbnail);
        img.alt = '';
        thumb.appendChild(img);

        const body = document.createElement('div');
        body.className = 'news-mini-card-body';

        const dateLine = document.createElement('div');
        dateLine.className = 'news-mini-card-date';
        dateLine.textContent = formatCardDate(post._date);

        const title = document.createElement('h3');
        title.className = 'news-mini-card-title';
        title.textContent = post.title;

        body.appendChild(dateLine);
        body.appendChild(title);

        card.appendChild(thumb);
        card.appendChild(body);
        return card;
    }

    function showLoadError(container, message = 'Could not load news. Please try again later.') {
        if (!container) return;
        container.innerHTML = '';
        const note = document.createElement('p');
        note.className = 'news-list-empty';
        note.textContent = message;
        container.appendChild(note);
    }

    let newsDataPromise = null;
    function fetchNewsData(root) {
        if (!newsDataPromise) {
            newsDataPromise = fetch(resolveUrl(root, NEWS_DATA_PATH)).then(response => {
                if (!response.ok) throw new Error(`Failed to load news data: ${response.status}`);
                return response.json();
            });
        }
        return newsDataPromise;
    }

    async function populateNewsPreview() {
        const list = document.querySelector('[data-news-preview]');
        if (!list) return;

        const root = getRoot();
        const limit = Number(list.dataset.newsPreview) || 3;

        try {
            const data = await fetchNewsData(root);
            const posts = sortNewestFirst(decorate(data)).slice(0, limit);
            list.innerHTML = '';
            if (posts.length === 0) {
                showLoadError(list, 'No news yet.');
                return;
            }
            posts.forEach(post => list.appendChild(renderMiniCard(post, root)));
            document.dispatchEvent(new CustomEvent('news:loaded'));
        } catch (err) {
            console.error('[news-grabber]', err);
            showLoadError(list);
        }
    }

    function dateSearchTokens(d) {
        return [
            formatCardDate(d),
            `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
            `${LONG_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
            String(d.getFullYear())
        ];
    }

    function matchesQuery(post, query) {
        if (!query) return true;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const tokens = [post.title, post.date, ...dateSearchTokens(post._date)];
        return tokens.join(' ').toLowerCase().includes(q);
    }

    function matchesGame(post, gameFilter) {
        if (!gameFilter || gameFilter === 'all') return true;
        return (post.game || '').toLowerCase() === gameFilter.toLowerCase();
    }

    let gamesListPromise = null;
    function fetchGamesList(root) {
        if (!gamesListPromise) {
            gamesListPromise = fetch(resolveUrl(root, 'json/games.json')).then(response => {
                if (!response.ok) throw new Error(`Failed to load games data: ${response.status}`);
                return response.json();
            });
        }
        return gamesListPromise;
    }

    function initFilterDropdown(dropdownEl, games, onSelect) {
        const toggle = dropdownEl.querySelector('.filter-dropdown-toggle');
        const label = dropdownEl.querySelector('.filter-dropdown-label');
        const menu = dropdownEl.querySelector('.filter-dropdown-menu');
        if (!toggle || !menu) return;

        const options = [{ value: 'all', text: 'All Games' }].concat(
            games.map(g => {
                const name = (g.alt || '').replace(/^\[|\]$/g, '');
                return { value: name, text: name };
            })
        );

        menu.innerHTML = '';
        options.forEach(opt => {
            const li = document.createElement('li');
            li.setAttribute('role', 'none');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('role', 'menuitem');
            btn.textContent = opt.text;
            btn.dataset.value = opt.value;
            if (opt.value === 'all') btn.classList.add('is-active');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                if (label) label.textContent = opt.text;
                dropdownEl.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                onSelect(opt.value);
            });
            li.appendChild(btn);
            menu.appendChild(li);
        });

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dropdownEl.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownEl.contains(e.target)) {
                dropdownEl.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdownEl.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function getPageSize(desktopSize, mobileSize) {
        return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches ? mobileSize : desktopSize;
    }

    function initListing({ posts, gridEl, searchEl, filterEl, paginationEl, root, pageSize = 6, mobilePageSize = null }) {
        const sorted = sortNewestFirst(posts);
        let currentPage = 1;
        let query = '';
        let gameFilter = 'all';
        const effectiveMobile = mobilePageSize ?? pageSize;
        let activePageSize = getPageSize(pageSize, effectiveMobile);

        const getFiltered = () => sorted.filter(p => matchesQuery(p, query) && matchesGame(p, gameFilter));

        function renderGrid() {
            gridEl.innerHTML = '';
            const filtered = getFiltered();
            const totalPages = Math.max(1, Math.ceil(filtered.length / activePageSize));
            if (currentPage > totalPages) currentPage = totalPages;

            const start = (currentPage - 1) * activePageSize;
            const pageItems = filtered.slice(start, start + activePageSize);

            if (pageItems.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'news-list-empty';
                empty.textContent = 'No matching posts.';
                gridEl.appendChild(empty);
            } else {
                pageItems.forEach(post => gridEl.appendChild(renderMiniCard(post, root)));
            }
            renderPagination(totalPages);
        }

        function renderPagination(totalPages) {
            paginationEl.innerHTML = '';
            if (totalPages <= 1) return;

            const makeBtn = (label, page, opts = {}) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'news-page-btn';
                btn.textContent = label;
                if (opts.active) btn.classList.add('is-active');
                if (opts.disabled) btn.disabled = true;
                btn.addEventListener('click', () => { currentPage = page; renderGrid(); });
                return btn;
            };
            const makeEllipsis = () => {
                const span = document.createElement('span');
                span.className = 'news-page-ellipsis';
                span.textContent = '…';
                return span;
            };

            const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
            const maxNumbers = isMobile ? 4 : 5;
            let start = Math.max(1, currentPage - Math.floor(maxNumbers / 2));
            let end = start + maxNumbers - 1;
            if (end > totalPages) {
                end = totalPages;
                start = Math.max(1, end - maxNumbers + 1);
            }

            paginationEl.appendChild(makeBtn('«', 1, { disabled: currentPage === 1 }));
            paginationEl.appendChild(makeBtn('‹', currentPage - 1, { disabled: currentPage === 1 }));
            if (start > 1) paginationEl.appendChild(makeEllipsis());
            for (let i = start; i <= end; i++) {
                paginationEl.appendChild(makeBtn(String(i), i, { active: i === currentPage }));
            }
            if (end < totalPages) paginationEl.appendChild(makeEllipsis());
            paginationEl.appendChild(makeBtn('›', currentPage + 1, { disabled: currentPage === totalPages }));
            paginationEl.appendChild(makeBtn('»', totalPages, { disabled: currentPage === totalPages }));
        }

        if (searchEl) {
            searchEl.addEventListener('input', () => {
                query = searchEl.value;
                currentPage = 1;
                renderGrid();
            });
        }

        window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).addEventListener('change', () => {
            const nextSize = getPageSize(pageSize, effectiveMobile);
            if (nextSize === activePageSize) return;
            activePageSize = nextSize;
            currentPage = 1;
            renderGrid();
        });

        // Expose a hook so external setup (game filter dropdown) can change the filter.
        const setGameFilter = (val) => {
            gameFilter = val;
            currentPage = 1;
            renderGrid();
        };

        renderGrid();
        return { setGameFilter };
    }

    async function populateNewsListing() {
        const section = document.querySelector('[data-news-listing]');
        if (!section) return;

        const gridEl = section.querySelector('.news-grid');
        const searchEl = section.querySelector('.news-search input');
        const paginationEl = section.querySelector('.news-pagination');
        const filterEl = section.querySelector('[data-news-filter]');
        if (!gridEl || !paginationEl) return;

        const root = getRoot();
        try {
            const data = await fetchNewsData(root);
            const posts = decorate(data);
            const pageSize = Number(section.dataset.pageSize) || 6;
            const listing = initListing({ posts, gridEl, searchEl, paginationEl, root, pageSize });

            if (filterEl && listing) {
                try {
                    const games = await fetchGamesList(root);
                    initFilterDropdown(filterEl, games, listing.setGameFilter);
                } catch (e) {
                    console.warn('[news-grabber] could not load games for filter', e);
                }
            }

            document.dispatchEvent(new CustomEvent('news:loaded'));
        } catch (err) {
            console.error('[news-grabber]', err);
            showLoadError(gridEl);
        }
    }

    function init() {
        populateNewsPreview();
        populateNewsListing();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
