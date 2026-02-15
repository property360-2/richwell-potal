/**
 * Skip-to-content link component for accessibility
 * Allows keyboard users to skip navigation and jump to main content
 */
export function createSkipLink() {
    return `
    <a 
      href="#main-content" 
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  `;
}

/**
 * Add skip link to page and ensure main content has proper ID
 * Call this in your init() function
 */
export function initSkipLink() {
    // Add skip link at the beginning of body
    const skipLink = document.createElement('div');
    skipLink.innerHTML = createSkipLink();
    document.body.insertBefore(skipLink.firstElementChild, document.body.firstChild);

    // Ensure main content has ID
    const main = document.querySelector('main');
    if (main && !main.id) {
        main.id = 'main-content';
        main.setAttribute('tabindex', '-1'); // Allow programmatic focus
    }
}
