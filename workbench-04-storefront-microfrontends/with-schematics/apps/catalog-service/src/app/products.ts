import type { Product } from '@storefront/catalog-contract';

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

export const PRODUCTS: readonly Product[] = [
  {
    id: 'ceramic-mug',
    name: 'Ceramic Mug',
    price: 1800,
    currency: 'USD',
    image: img('ceramic-mug'),
    description: 'Hand-glazed 350 ml mug in speckled cream.',
  },
  {
    id: 'canvas-tote',
    name: 'Canvas Tote',
    price: 2400,
    currency: 'USD',
    image: img('canvas-tote'),
    description: 'Heavy organic cotton tote with an inside pocket.',
  },
  {
    id: 'linen-apron',
    name: 'Linen Apron',
    price: 4200,
    currency: 'USD',
    image: img('linen-apron'),
    description: 'Washed linen apron with adjustable neck strap.',
  },
  {
    id: 'oak-board',
    name: 'Oak Serving Board',
    price: 5600,
    currency: 'USD',
    image: img('oak-board'),
    description: 'Solid oak board finished with food-safe oil.',
  },
];
