(function () {
    const STAR_COUNT = 60;
    const SHOOTING_STAR_COUNT = 0;

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

    const containers = document.querySelectorAll('.hero-logo, .starfield-host');
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
        // Position: anywhere in the hero block.
        el.style.left = `${randomBetween(2, 98)}%`;
        el.style.top = `${randomBetween(2, 95)}%`;
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

    function makeShootingStar(index) {
        const el = document.createElement('span');
        el.className = 'shooting-star';
        el.style.webkitMaskImage = `url('${SHOOTING_STAR_URL}')`;
        el.style.maskImage = `url('${SHOOTING_STAR_URL}')`;
        // Spread them across the top half, biased to the upper region of the hero.
        el.style.left = `${randomBetween(8, 80)}%`;
        // Final resting top position (after the streak lands).
        el.style.top = `${randomBetween(8, 45)}%`;
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
