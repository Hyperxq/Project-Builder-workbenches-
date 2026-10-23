import { Component, Suspense, type ReactNode } from 'react';
import { Button } from '@storefront/ui';
import { lazyProvider } from './mf';

const Catalog = lazyProvider('catalog', 'App');
const Cart = lazyProvider('cart', 'App');
const Orders = lazyProvider('orders', 'App');

// ProviderBoundary catches the lazy() rejection that fires when a provider's
// remoteEntry.js can't be fetched (provider not running, network error,
// etc.). Without it any one missing provider unmounts the whole consumer
// tree. React has no built-in functional error boundary so this is a class.
// Wrap each <ProviderBoundary> in your router of choice if you need routing.
export class ProviderBoundary extends Component<
  { children: ReactNode; name: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>
            Provider &quot;{this.props.name}&quot; unavailable:{' '}
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return (
      <Suspense fallback={<p>Loading {this.props.name}...</p>}>
        {this.props.children}
      </Suspense>
    );
  }
}

export function App() {
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <h1 className="text-2xl font-medium">Storefront</h1>
        <Button>Sign in</Button>
      </header>
      <ProviderBoundary name="catalog">
        <Catalog />
      </ProviderBoundary>
      <ProviderBoundary name="cart">
        <Cart />
      </ProviderBoundary>
      <ProviderBoundary name="orders">
        <Orders />
      </ProviderBoundary>
    </main>
  );
}

export default App;
