import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, CardTitle } from '@storefront/ui';
import type { Cart } from '@storefront/cart-contract';
import { fetchCart, removeLine, setQuantity } from './client';
import { formatPrice } from './format';
import './styles.css';

// Exposed by the federation plugin as 'cart/App'.
// Consumers render it lazily via `lazyProvider('cart', 'App')`.
export function App() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCart().then(
      (value) => active && setCart(value),
      (err: Error) => active && setError(err.message),
    );
    return () => {
      active = false;
    };
  }, []);

  function update(action: Promise<Cart>) {
    setError(null);
    action.then(setCart, (err: Error) => setError(err.message));
  }

  return (
    <section data-testid="cart" className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-xl font-medium">Your cart</h2>
      {error && <Alert role="alert">{error}</Alert>}
      {!cart && !error && <p>Loading cart...</p>}
      {cart && cart.lines.length === 0 && <p>Your cart is empty.</p>}
      {cart && cart.lines.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-4">
              {cart.lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col">
                    <CardTitle>{line.name}</CardTitle>
                    <span>
                      {formatPrice(line.unitPrice, cart.currency)} each
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Decrease quantity of ${line.name}`}
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        update(setQuantity(line.productId, line.quantity - 1))
                      }
                    >
                      -
                    </Button>
                    <span aria-label={`Quantity of ${line.name}`}>
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Increase quantity of ${line.name}`}
                      onClick={() =>
                        update(setQuantity(line.productId, line.quantity + 1))
                      }
                    >
                      +
                    </Button>
                    <span className="w-20 text-right font-medium">
                      {formatPrice(line.lineTotal, cart.currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => update(removeLine(line.productId))}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex justify-between text-lg font-medium">
              <span>Total</span>
              <span data-testid="cart-total">
                {formatPrice(cart.total, cart.currency)}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export default App;
