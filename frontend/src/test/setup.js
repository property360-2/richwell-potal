import { vi } from 'vitest';

// Mock SIS global if it exists in window
window.SIS = {
    register: vi.fn(),
    on: vi.fn(() => () => { }),
    emit: vi.fn(),
    debug: false
};

// Add any other global mocks here
