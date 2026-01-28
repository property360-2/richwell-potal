/**
 * SIS Component Library
 * 
 * Main entry point for all modular components.
 * 
 * Usage:
 *   import { SIS, BaseComponent, mountComponents } from './index.js';
 *   import { Button, Badge, Icon } from './index.js';
 *   import { StatCard, FormField, SearchBar } from './index.js';
 *   import { DataTable, ScheduleGrid, Tabs } from './index.js';
 */

// Core
export * from './core/index.js';

// Atoms
export * from './atoms/index.js';

// Molecules
export * from './molecules/index.js';

// Organisms
export * from './organisms/index.js';

// Re-export SIS as default
import { SIS } from './core/index.js';
export default SIS;
