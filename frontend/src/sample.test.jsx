import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const SampleComponent = () => <div>Hello Vitest</div>;

describe('Sample Test', () => {
  it('should render correctly', () => {
    render(<SampleComponent />);
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
  });
});
