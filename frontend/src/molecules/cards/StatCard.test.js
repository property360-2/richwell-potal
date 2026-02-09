import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatCard, renderStatCard, renderStatCardGrid } from './StatCard.js';

describe('StatCard Molecule', () => {
    describe('renderStatCard', () => {
        it('should render correct label and value', () => {
            const html = renderStatCard({
                label: 'Total Students',
                value: '1,234',
                color: 'blue'
            });

            expect(html).toContain('Total Students');
            expect(html).toContain('1,234');
            expect(html).toContain('from-blue-500');
        });

        it('should render trend indicator when provided', () => {
            const html = renderStatCard({
                label: 'Growth',
                value: '25%',
                trend: { value: '+12%', direction: 'up' }
            });

            expect(html).toContain('+12%');
            expect(html).toContain('text-green-600');
        });

        it('should apply onClick class and attribute when provided', () => {
            const html = renderStatCard({
                label: 'Clickable',
                value: '100',
                onClick: "console.log('clicked')"
            });

            expect(html).toContain('cursor-pointer');
            expect(html).toContain('onclick="console.log(\'clicked\')"');
        });

        it('should use default icon when none is provided', () => {
            const html = renderStatCard({
                label: 'No Icon',
                value: '0'
            });

            // The default icon 'info' should be rendered via Icon()
            // We can't check the exact SVG without mocking Icon, but we can check if it rendered SOMETHING
            expect(html).toContain('<svg');
        });
    });

    describe('renderStatCardGrid', () => {
        it('should render multiple cards in a grid', () => {
            const cards = [
                { label: 'A', value: '1' },
                { label: 'B', value: '2' }
            ];
            const html = renderStatCardGrid(cards, { columns: 2 });

            expect(html).toContain('md:grid-cols-2');
            expect(html).toContain('A');
            expect(html).toContain('B');
            expect((html.match(/card/g) || []).length).toBe(2);
        });
    });

    describe('StatCard Component Class', () => {
        let element;

        beforeEach(() => {
            element = document.createElement('div');
            document.body.appendChild(element);
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('should initialize and render', () => {
            const props = { label: 'Test Class', value: '99' };
            const component = new StatCard(element, props);

            expect(element.textContent).toContain('Test Class');
            expect(element.textContent).toContain('99');
            expect(element.dataset.sisInitialized).toBe('true');
        });

        it('should update value via setValue', () => {
            const props = { label: 'Updatable', value: '0' };
            const component = new StatCard(element, props);

            component.setValue('100');
            expect(element.querySelector('.text-lg.font-bold').textContent).toBe('100');
        });
    });
});
