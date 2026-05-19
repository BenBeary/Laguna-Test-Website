(function () {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const STAR_COUNT = isMobile ? 35 : 60;
    const SHOOTING_STAR_COUNT = 6;
    // Vertical bias: higher = more stars clustered near the top.
    // Desktop uses a softer bias so the tail reaches lower; mobile stays tight.
    const TOP_BIAS = isMobile ? 2 : 2.5;

    // Neon tint to blend toward. Must match --color-neon in style.css.
    const NEON_RGB = [168, 238, 255];

    // Timing references match the logo animation in style.css:
    //   logo-fall: 700ms (drop)
    //   logo-bob delay: 550ms, duration: 4800ms
    // Stars fade in from 0 alongside the drop and finish before the bob lands.
    // Shooting stars streak in during the bob.
    const STARS_FADE_DURATION_MS = 1200;
    const STREAK_DURATION_MS = 1400;
    const STREAK_DELAY_BASE_MS = 550; // matches bob start

    // Resolve mask SVG URLs against the page base so subpath deploys (e.g.
    // GitHub Pages under /repo-name/) work the same as a root deploy.
    const ROOT = document.body.dataset.root || '';
    const STAR_URL = new URL(`${ROOT}images/svg/star.svg`, document.baseURI).href;
    const SHOOTING_STAR_URL = new URL(`${ROOT}images/svg/shooting-star.svg`, document.baseURI).href;

    const containers = document.querySelectorAll('.starfield-host');
    if (!containers.length) return;
    containers.forEach(populate);

    function populate(container) {
        const field = document.createElement('div');
        field.className = 'starfield';
        field.setAttribute('aria-hidden', 'true');
        container.insertBefore(field, container.firstChild);
        for (let i = 0; i < STAR_COUNT; i++) field.appendChild(makeStar());
        for (let i = 0; i < SHOOTING_STAR_COUNT; i++) field.appendChild(makeShootingStar(i));
        field.style.setProperty('--stars-fade', `${STARS_FADE_DURATION_MS}ms`);
        field.style.setProperty('--streak-duration', `${STREAK_DURATION_MS}ms`);
    }

    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    function mixWithNeon(t) {
        // Linear interp from white (255,255,255) toward neon by factor t (0..1).
        const r = Math.round(255 + (NEON_RGB[0] - 255) * t);
        const g = Math.round(255 + (NEON_RGB[1] - 255) * t);
        const b = Math.round(255 + (NEON_RGB[2] - 255) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    function makeStar() {
        const el = document.createElement('span');
        el.className = 'star';
        el.style.webkitMaskImage = `url('${STAR_URL}')`;
        el.style.maskImage = `url('${STAR_URL}')`;
        // Position: horizontal is uniform; vertical biases toward the top by
        // raising a uniform [0,1) to TOP_BIAS power.
        el.style.left = `${randomBetween(2, 98)}%`;
        el.style.top = `${2 + Math.pow(Math.random(), TOP_BIAS) * 93}%`;
        // Size: small variance so the field looks natural.
        const size = randomBetween(6, 14);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        // Slight rotation jitter.
        el.style.setProperty('--rot', `${randomBetween(-25, 25)}deg`);
        // Stagger the fade-in slightly so it doesn't pop all at once.
        el.style.animationDelay = `${randomBetween(0, 400)}ms`;
        // Random base opacity for depth.
        el.style.setProperty('--star-alpha', randomBetween(0.5, 1).toFixed(2));
        // Random color between white (t=0) and neon (t=1).
        el.style.color = mixWithNeon(Math.random());
        return el;
    }

    initParallax();

    function initParallax() {
        const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduce) return;

        const bg = document.querySelector('.bg-parallax');
        const stars = document.querySelector('.starfield-host');
        if (!bg && !stars) return;

        const BG_FACTOR = 0.08;
        const STARS_FACTOR = 0.5;

        let ticking = false;
        function update() {
            const y = window.scrollY || window.pageYOffset;
            if (bg) bg.style.transform = `translate3d(0, ${-y * BG_FACTOR}px, 0)`;
            if (stars) stars.style.transform = `translate3d(0, ${-y * STARS_FACTOR}px, 0)`;
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    function makeShootingStar(index) {
        const el = document.createElement('span');
        el.className = 'shooting-star';
        el.style.webkitMaskImage = `url('${SHOOTING_STAR_URL}')`;
        el.style.maskImage = `url('${SHOOTING_STAR_URL}')`;
        // Spread them across the top half, biased to the upper region.
        // Note: .starfield is 200% tall (for parallax headroom), so these
        // percentages must stay small to keep shooting stars near the top
        // of the visible viewport.
        // Avoid the central 10vw of the viewport (roughly 45%–55% of host
        // width) so shooting stars don't streak straight through the logo.
        el.style.left = `${Math.random() < 0.5 ? randomBetween(8, 45) : randomBetween(55, 92)}%`;
        el.style.top = `${randomBetween(4, 22)}%`;
        // Streak length controls size.
        const size = randomBetween(28, 56);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        // Each shooting star starts slightly before the next to feel sequential.
        const delay = STREAK_DELAY_BASE_MS + index * 220;
        el.style.animationDelay = `${delay}ms`;
        // Slight angle variance so trails don't all point identically.
        el.style.setProperty('--angle', `${randomBetween(-15, 15)}deg`);
        return el;
    }

})();
