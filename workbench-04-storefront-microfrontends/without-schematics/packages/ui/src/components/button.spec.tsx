import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders its label as a pill', () => {
    render(<Button>Add to cart</Button>);

    const button = screen.getByRole('button', { name: 'Add to cart' });
    expect(button.className).toContain('rounded-full');
  });
});
