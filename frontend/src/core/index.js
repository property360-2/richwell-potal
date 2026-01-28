/**
 * Core Module Exports
 * 
 * Re-exports all core infrastructure for convenient importing.
 * 
 * Usage:
 *   import { SIS, BaseComponent, mountComponents, EventBus } from './core/index.js';
 */

export { SIS } from './SIS.js';
export { BaseComponent } from './BaseComponent.js';
export {
    mountComponents,
    mountComponent,
    unmountComponents,
    unmountComponent,
    getComponent,
    remountComponents,
    observeComponents
} from './ComponentFactory.js';
export { EventBus } from './EventBus.js';

// Default export for convenience
import { SIS } from './SIS.js';
export default SIS;
