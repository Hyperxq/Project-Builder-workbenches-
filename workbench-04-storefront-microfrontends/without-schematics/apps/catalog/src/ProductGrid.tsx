import { useEffect, useState } from 'react';
import { Alert, Card, CardContent, CardDescription, CardTitle } from '@storefront/ui';
import type { Product } from '@storefront/catalog-contract';
import { fetchProducts } from './client';
import { formatPrice } from './format';

export function ProductGrid({ onSelect }: { onSelect: (id: string) => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProducts().then(
      (items) => active && setProducts(items),
      (err: Error) => active && setError(err.message),
    );
    return () => {
      active = false;
    };
  }, []);

  if (error) return <Alert role="alert">{error}</Alert>;
  if (!products) return <p>Loading products...</p>;

  return (
    <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            className="w-full text-left"
            onClick={() => onSelect(product.id)}
          >
            <Card className="overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
              <CardContent className="flex flex-col gap-1">
                <CardTitle>{product.name}</CardTitle>
                <p className="font-medium">
                  {formatPrice(product.price, product.currency)}
                </p>
                <CardDescription>{product.description}</CardDescription>
              </CardContent>
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
