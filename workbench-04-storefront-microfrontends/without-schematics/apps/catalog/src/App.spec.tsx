import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Product } from '@storefront/catalog-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fetchProduct, fetchProducts } from './client';

vi.mock('./client');

const products: Product[] = [
  {
    id: 'mug',
    name: 'Ceramic Mug',
    price: 1800,
    currency: 'USD',
    image: 'mug.png',
    description: 'A speckled mug.',
  },
  {
    id: 'tote',
    name: 'Canvas Tote',
    price: 2400,
    currency: 'USD',
    image: 'tote.png',
    description: 'A sturdy tote.',
  },
];

describe('catalog App', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders the product grid from the client', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(products);

    render(<App />);

    expect(await screen.findByText('Ceramic Mug')).toBeTruthy();
    expect(screen.getByText('Canvas Tote')).toBeTruthy();
    expect(screen.getByText('$18.00')).toBeTruthy();
    expect(screen.getByText('A sturdy tote.')).toBeTruthy();
    expect(screen.getByAltText('Canvas Tote').getAttribute('src')).toBe(
      'tote.png',
    );
  });

  it('shows an error when the list fails to load', async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error('boom'));

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toBe('boom');
  });

  it('opens the detail view of a product and goes back', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(products);
    vi.mocked(fetchProduct).mockResolvedValue(products[0]);

    render(<App />);
    fireEvent.click(await screen.findByText('Ceramic Mug'));

    expect(
      (await screen.findByRole('heading', { name: 'Ceramic Mug' })).tagName,
    ).toBe('H2');
    expect(fetchProduct).toHaveBeenCalledWith('mug');

    fireEvent.click(screen.getByRole('button', { name: 'Back to products' }));
    expect(await screen.findByText('Canvas Tote')).toBeTruthy();
  });
});
