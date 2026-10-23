import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Cart } from '@storefront/cart-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fetchCart, removeLine, setQuantity } from './client';

vi.mock('./client');

const cart: Cart = {
  id: 'c1',
  currency: 'USD',
  total: 6000,
  lines: [
    {
      productId: 'mug',
      name: 'Ceramic Mug',
      unitPrice: 1800,
      quantity: 2,
      lineTotal: 3600,
    },
    {
      productId: 'tote',
      name: 'Canvas Tote',
      unitPrice: 2400,
      quantity: 1,
      lineTotal: 2400,
    },
  ],
};

describe('cart App', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders lines and the cart total from the client', async () => {
    vi.mocked(fetchCart).mockResolvedValue(cart);

    render(<App />);

    expect(await screen.findByText('Ceramic Mug')).toBeTruthy();
    expect(screen.getByText('Canvas Tote')).toBeTruthy();
    expect(screen.getByText('$18.00 each')).toBeTruthy();
    expect(screen.getByText('$36.00')).toBeTruthy();
    expect(screen.getByLabelText('Quantity of Ceramic Mug').textContent).toBe(
      '2',
    );
    expect(screen.getByTestId('cart-total').textContent).toBe('$60.00');
  });

  it('shows an empty state', async () => {
    vi.mocked(fetchCart).mockResolvedValue({ ...cart, lines: [], total: 0 });

    render(<App />);

    expect(await screen.findByText('Your cart is empty.')).toBeTruthy();
  });

  it('shows an error when the cart fails to load', async () => {
    vi.mocked(fetchCart).mockRejectedValue(new Error('boom'));

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toBe('boom');
  });

  it('changes a quantity and shows the updated cart', async () => {
    vi.mocked(fetchCart).mockResolvedValue(cart);
    vi.mocked(setQuantity).mockResolvedValue({
      ...cart,
      total: 7800,
      lines: [
        { ...cart.lines[0], quantity: 3, lineTotal: 5400 },
        cart.lines[1],
      ],
    });

    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Increase quantity of Ceramic Mug',
      }),
    );

    expect(setQuantity).toHaveBeenCalledWith('mug', 3);
    expect((await screen.findByTestId('cart-total')).textContent).toBe(
      '$78.00',
    );
  });

  it('removes a line', async () => {
    vi.mocked(fetchCart).mockResolvedValue(cart);
    vi.mocked(removeLine).mockResolvedValue({
      ...cart,
      total: 2400,
      lines: [cart.lines[1]],
    });

    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove Ceramic Mug' }),
    );

    expect(removeLine).toHaveBeenCalledWith('mug');
    expect((await screen.findByTestId('cart-total')).textContent).toBe(
      '$24.00',
    );
    expect(screen.queryByText('Ceramic Mug')).toBeNull();
  });
});
