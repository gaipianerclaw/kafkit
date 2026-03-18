import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../components/ui/Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('should handle click events', () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(clicked).toBe(true);
  });

  it('should be disabled when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should render different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toBeDefined();
    
    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toBeDefined();
    
    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toBeDefined();
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toBeDefined();
    
    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByText('Medium')).toBeDefined();
    
    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toBeDefined();
  });
});
