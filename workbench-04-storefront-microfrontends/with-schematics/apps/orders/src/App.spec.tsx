import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Order, OrderSummary } from '@storefront/orders-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fetchOrder, fetchOrders } from './client';

vi.mock('./client');

const summaries: OrderSummary[] = [
  {
    id: 'o2',
    placedAt: '2026-02-01T10:30:00.000Z',
    status: 'placed',
    total: 2400,
    currency: 'USD',
  },
  {
    id: 'o1',
    placedAt: '2026-01-01T09:00:00.000Z',
    status: 'placed',
    total: 3600,
    currency: 'USD',
  },
];

const order: Order = {
  ...summaries[1],
  customerId: 'c1',
  lines: [
    {
      productId: 'mug',
      name: 'Ceramic Mug',
      unitPrice: 1800,
      quantity: 2,
      lineTotal: 3600,
    },
  ],
};

describe('orders App', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders the order list with date, status and total', async () => {
    vi.mocked(fetchOrders).mockResolvedValue(summaries);

    render(<App />);

    expect(await screen.findByText('Feb 1, 2026, 10:30 AM')).toBeTruthy();
    expect(screen.getByText('Jan 1, 2026, 9:00 AM')).toBeTruthy();
    expect(screen.getAllByText('placed')).toHaveLength(2);
    expect(screen.getByText('$24.00')).toBeTruthy();
    expect(screen.getByText('$36.00')).toBeTruthy();
  });

  it('shows an empty state', async () => {
    vi.mocked(fetchOrders).mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByText('You have no orders yet.')).toBeTruthy();
  });

  it('shows an error when the orders fail to load', async () => {
    vi.mocked(fetchOrders).mockRejectedValue(new Error('boom'));

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toBe('boom');
  });

  it('opens an order and shows its lines', async () => {
    vi.mocked(fetchOrders).mockResolvedValue(summaries);
    vi.mocked(fetchOrder).mockResolvedValue(order);

    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'View order o1' }),
    );

    expect(fetchOrder).toHaveBeenCalledWith('o1');
    expect(await screen.findByText(/Ceramic Mug/)).toBeTruthy();
    expect(screen.getByTestId('order-total').textContent).toBe('$36.00');
  });
});
