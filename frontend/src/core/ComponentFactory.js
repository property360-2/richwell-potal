/**
 * ComponentFactory
 * 
 * Auto-mounts components based on data-sis-component attributes.
 * Scans the DOM and instantiates registered components.
 * 
 * Usage:
 *   import { mountComponents, unmountComponents } from './core/ComponentFactory.js';
 *   
 *   // Mount all components in document
 *   mountComponents();
 *   
 *   // Mount components in a specific container
 *   mountComponents(document.getElementById('app'));
 *   
 *   // Unmount all components in a container
 *   unmountComponents(container);
 */

import { SIS } from './SIS.js';

// WeakMap to store component instances
const componentInstances = new WeakMap();

/**
 * Mount all components within a scope
 * @param {HTMLElement} scope - Container to scan (defaults to document.body)
 * @returns {Array} Array of mounted component instances
 */
export function mountComponents(scope = document.body) {
    const elements = scope.querySelectorAll('[data-sis-component]:not([data-sis-initialized])');
    const mounted = [];

    elements.forEach(el => {
        const instance = mountComponent(el);
        if (instance) {
            mounted.push(instance);
        }
    });

    if (SIS.debug && mounted.length > 0) {
        console.log(`[ComponentFactory] Mounted ${mounted.length} components`);
    }

    return mounted;
}

/**
 * Mount a single component
 * @param {HTMLElement} element - Element with data-sis-component
 * @returns {Object|null} Component instance or null
 */
export function mountComponent(element) {
    // Skip if already initialized
    if (element.dataset.sisInitialized === 'true') {
        return componentInstances.get(element) || null;
    }

    const componentName = element.dataset.sisComponent;
    if (!componentName) {
        console.warn('[ComponentFactory] Element missing data-sis-component', element);
        return null;
    }

    const Component = SIS.get(componentName);
    if (!Component) {
        console.error(`[ComponentFactory] Component not registered: ${componentName}`);
        return null;
    }

    // Parse props from data attribute
    let props = {};
    try {
        const propsAttr = element.dataset.sisProps;
        if (propsAttr) {
            props = JSON.parse(propsAttr);
        }
    } catch (e) {
        console.error(`[ComponentFactory] Invalid JSON in data-sis-props for ${componentName}:`, e);
    }

    // Additional props from other data-sis-* attributes
    Object.keys(element.dataset).forEach(key => {
        if (key.startsWith('sis') && key !== 'sisComponent' && key !== 'sisProps' && key !== 'sisInitialized') {
            // Convert sisMyProp to myProp
            const propName = key.slice(3, 4).toLowerCase() + key.slice(4);
            props[propName] = element.dataset[key];
        }
    });

    try {
        const instance = new Component(element, props);
        componentInstances.set(element, instance);

        if (SIS.debug) {
            console.log(`[ComponentFactory] Mounted: ${componentName}`, props);
        }

        return instance;
    } catch (e) {
        console.error(`[ComponentFactory] Error mounting ${componentName}:`, e);
        return null;
    }
}

/**
 * Unmount all components within a scope
 * @param {HTMLElement} scope - Container to scan
 */
export function unmountComponents(scope = document.body) {
    const elements = scope.querySelectorAll('[data-sis-initialized="true"]');

    elements.forEach(el => {
        unmountComponent(el);
    });

    if (SIS.debug && elements.length > 0) {
        console.log(`[ComponentFactory] Unmounted ${elements.length} components`);
    }
}

/**
 * Unmount a single component
 * @param {HTMLElement} element - Element with component instance
 */
export function unmountComponent(element) {
    const instance = componentInstances.get(element);

    if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
    }

    componentInstances.delete(element);
}

/**
 * Get component instance from element
 * @param {HTMLElement} element - Element with component
 * @returns {Object|null} Component instance
 */
export function getComponent(element) {
    return componentInstances.get(element) || null;
}

/**
 * Re-mount components (useful after AJAX content load)
 * @param {HTMLElement} scope - Container to scan
 */
export function remountComponents(scope = document.body) {
    unmountComponents(scope);
    return mountComponents(scope);
}

/**
 * Setup MutationObserver for auto-mounting dynamic content
 * @param {HTMLElement} scope - Container to observe
 * @returns {MutationObserver} Observer instance
 */
export function observeComponents(scope = document.body) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            // Mount new components
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.dataset && node.dataset.sisComponent) {
                        mountComponent(node);
                    }
                    // Also check children
                    mountComponents(node);
                }
            });

            // Unmount removed components
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.dataset && node.dataset.sisInitialized) {
                        unmountComponent(node);
                    }
                    // Also check children
                    const children = node.querySelectorAll('[data-sis-initialized="true"]');
                    children.forEach(el => unmountComponent(el));
                }
            });
        });
    });

    observer.observe(scope, {
        childList: true,
        subtree: true
    });

    if (SIS.debug) {
        console.log('[ComponentFactory] MutationObserver started');
    }

    return observer;
}

export default {
    mount: mountComponents,
    mountOne: mountComponent,
    unmount: unmountComponents,
    unmountOne: unmountComponent,
    get: getComponent,
    remount: remountComponents,
    observe: observeComponents
};
