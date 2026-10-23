import { useEffect, useState } from 'react';
import { Alert, Button } from '@storefront/ui';
import type { Product } from '@storefront/catalog-contract';
import { fetchProduct } from './client';
import { formatPrice } from './format';

export function ProductDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProduct(id).then(
      (item) => active && setProduct(item),
      (err: Error) => active && setError(err.message),
    );
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="outline" className="self-start" onClick={onBack}>
        Back to products
      </Button>
      {error ? (
        <Alert role="alert">{error}</Alert>
      ) : !product ? (
        <p>Loading product...</p>
      ) : (
        <article className="grid gap-8 md:grid-cols-2">
          <img
            src={product.image}
            alt={product.name}
            className="w-full rounded-lg object-cover"
          />
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-medium">{product.name}</h2>
            <p className="text-xl">
              {formatPrice(product.price, product.currency)}
            </p>
            <p>{product.description}</p>
          </div>
        </article>
      )}
    </div>
  );
}
