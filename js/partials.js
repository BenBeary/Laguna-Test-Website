const HEADER_HTML = `
    <header class="site-header">
        <div class="header-inner">
            <a href="{{root}}index.html" class="site-title" aria-label="Laguna Games home">
                <span class="site-logo" role="img" aria-label="Laguna Games"></span>
            </a>
            <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
            </button>
            <nav id="site-nav" class="site-nav">
                <button class="nav-close" aria-label="Close menu">
                    <span class="nav-close-bar"></span>
                    <span class="nav-close-bar"></span>
                </button>
                <a href="{{root}}index.html" data-page="home">Home</a>
                <div class="nav-dropdown" data-page="games">
                    <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
                        Games
                        <span class="nav-dropdown-caret" aria-hidden="true"></span>
                    </button>
                    <ul class="nav-dropdown-menu" role="menu"></ul>
                </div>
                <a href="{{root}}blog-home.html" data-page="blog">Blog</a>
                <a href="{{root}}team.html" data-page="team">Meet The Team</a>
            </nav>
        </div>
    </header>
`;

const SOCIAL_LINKS = [
    { name: 'instagram', label: 'Instagram', href: '#' },
    { name: 'discord', label: 'Discord', href: '#' },
    { name: 'itchdotio', label: 'Itch', href: '#' },
    { name: 'x', label: 'Twitter', href: '#' },
    { name: 'youtube', label: 'YouTube', href: '#' }
];

const FOOTER_HTML = `
    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-row">
                <a href="{{root}}index.html" class="site-title" aria-label="Laguna Games home">
                    <span class="site-logo" role="img" aria-label="Laguna Games"></span>
                </a>
                <div class="footer-socials" aria-label="Social media">
                    ${SOCIAL_LINKS.map(s => `
                        <a href="${s.href}" class="social-icon" data-icon="${s.name}" aria-label="${s.label}"></a>
                    `).join('')}
                </div>
            </div>
            <p class="footer-copy">&copy; ${new Date().getFullYear()} Laguna Games</p>
        </div>
    </footer>
`;

function injectPartials() {
    const body = document.body;
    const root = body.dataset.root || '';
    const currentPage = body.dataset.page;

    const render = (template) => template.replace(/\{\{root\}\}/g, root);

    const headerSlot = document.getElementById('site-header');
    const footerSlot = document.getElementById('site-footer');

    if (headerSlot) {
        headerSlot.outerHTML = render(HEADER_HTML);
        if (currentPage) {
            const link = document.querySelector(`.site-nav [data-page="${currentPage}"]`);
            if (link) link.classList.add('active');
        }
        wireNavToggle();
        wireDropdowns();
        loadGamesDropdown(root);
    }

    if (footerSlot) {
        footerSlot.outerHTML = render(FOOTER_HTML);
        loadSocialIcons(root);
    }

    setLogoUrls(root);

    document.dispatchEvent(new CustomEvent('partials:ready'));
}

function setLogoUrls(root) {
    // Resolve against document.baseURI so subpath deploys (e.g. GitHub Pages
    // serving under /repo-name/) produce a valid absolute URL.
    const logoUrl = new URL(`${root}images/svg/laguna_logo_Long.svg`, document.baseURI).href;
    document.querySelectorAll('.site-logo').forEach(el => {
        el.style.setProperty('--logo-url', `url('${logoUrl}')`);
    });
}

const ICON_CACHE = new Map();

function loadSocialIcons(root) {
    document.querySelectorAll('.social-icon[data-icon]').forEach(async (link) => {
        const name = link.dataset.icon;
        const url = `${root}images/social-icons/svg/${name}.svg`;
        try {
            if (!ICON_CACHE.has(url)) {
                ICON_CACHE.set(url, fetch(url).then(r => r.text()));
            }
            const markup = await ICON_CACHE.get(url);
            link.innerHTML = markup;
            // Strip width/height so CSS controls size; keep viewBox.
            const svg = link.querySelector('svg');
            if (svg) {
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.setAttribute('aria-hidden', 'true');
                svg.setAttribute('focusable', 'false');
            }
        } catch (e) {
            console.warn(`Failed to load icon: ${name}`, e);
        }
    });
}

async function loadGamesDropdown(root) {
    const menu = document.querySelector('.nav-dropdown[data-page="games"] .nav-dropdown-menu');
    if (!menu) return;
    const url = new URL(`${root}json/games.json`, document.baseURI).href;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const games = await response.json();
        menu.innerHTML = games.map(g => {
            const href = new URL(`${root}${g.link}`, document.baseURI).href;
            const name = (g.alt || '').replace(/^\[|\]$/g, '');
            return `<li role="none"><a role="menuitem" href="${href}">${name}</a></li>`;
        }).join('');
    } catch (e) {
        console.warn('Failed to load games.json for nav dropdown', e);
    }
}

function wireDropdowns() {
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
        const toggle = dd.querySelector('.nav-dropdown-toggle');
        if (!toggle) return;

        const close = () => {
            dd.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        };
        const open = () => {
            dd.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
        };

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dd.classList.contains('is-open')) close(); else open();
        });

        // Close on outside click.
        document.addEventListener('click', (e) => {
            if (!dd.contains(e.target)) close();
        });

        // Close on Escape.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });
    });
}

function wireNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    const close = document.querySelector('.nav-close');
    if (!toggle || !nav) return;

    const open = () => {
        nav.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
    };
    const shut = () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        if (nav.classList.contains('is-open')) shut(); else open();
    });
    if (close) close.addEventListener('click', shut);
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', shut));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPartials);
} else {
    injectPartials();
}
