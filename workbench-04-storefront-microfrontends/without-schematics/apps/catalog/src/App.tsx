import { useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { ProductDetail } from './ProductDetail';
import './styles.css';

// Exposed by the federation plugin as 'catalog/App'.
// Consumers render it lazily via `lazyProvider('catalog', 'App')`.
export function App() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section data-testid="catalog" className="mx-auto max-w-5xl p-6">
      {selected ? (
        <ProductDetail id={selected} onBack={() => setSelected(null)} />
      ) : (
        <ProductGrid onSelect={setSelected} />
      )}
    </section>
  );
}

export default App;
