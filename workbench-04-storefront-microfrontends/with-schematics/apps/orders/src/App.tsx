import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
} from '@storefront/ui';
import type { Order, OrderSummary } from '@storefront/orders-contract';
import { fetchOrder, fetchOrders } from './client';
import { formatDate, formatPrice } from './format';
import './styles.css';

function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  return (
    <Card data-testid="order-detail">
      <CardContent className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to orders
        </Button>
        <CardTitle>Order {order.id}</CardTitle>
        <p className="flex items-center gap-2">
          <span>{formatDate(order.placedAt)}</span>
          <Badge>{order.status}</Badge>
        </p>
        <ul className="flex flex-col gap-2">
          {order.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-4">
              <span>
                {line.name} &times; {line.quantity}
              </span>
              <span>{formatPrice(line.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between text-lg font-medium">
          <span>Total</span>
          <span data-testid="order-total">
            {formatPrice(order.total, order.currency)}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

// Exposed by the federation plugin as 'orders/App'.
// Consumers render it lazily via `lazyProvider('orders', 'App')`.
export function App() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrders().then(
      (value) => active && setOrders(value),
      (err: Error) => active && setError(err.message),
    );
    return () => {
      active = false;
    };
  }, []);

  function open(id: string) {
    setError(null);
    fetchOrder(id).then(setSelected, (err: Error) => setError(err.message));
  }

  return (
    <section data-testid="orders" className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-xl font-medium">Your orders</h2>
      {error && <Alert role="alert">{error}</Alert>}
      {selected ? (
        <OrderDetail order={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          {!orders && !error && <p>Loading orders...</p>}
          {orders && orders.length === 0 && <p>You have no orders yet.</p>}
          {orders && orders.length > 0 && (
            <Card>
              <CardContent>
                <ul className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex flex-col">
                        <CardTitle>{formatDate(order.placedAt)}</CardTitle>
                        <Badge>{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatPrice(order.total, order.currency)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`View order ${order.id}`}
                          onClick={() => open(order.id)}
                        >
                          View
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}

export default App;
