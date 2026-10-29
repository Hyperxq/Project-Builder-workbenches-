import type { Author } from '@/features/authors/domain/author'

/**
 * Seed data for the authors domain. 24 rows so list pagination
 * (default page size 10) has three real pages to walk.
 */
export const AUTHORS_FIXTURE: Author[] = [
  { authorId: 1, fullName: 'Gabriel García Márquez', email: 'gabo@macondo.co', country: 'Colombia', active: true },
  { authorId: 2, fullName: 'Ursula K. Le Guin', email: 'ursula@earthsea.io', country: 'United States', active: false },
  { authorId: 3, fullName: 'Jorge Luis Borges', email: 'jorge@aleph.ar', country: 'Argentina', active: false },
  { authorId: 4, fullName: 'Chimamanda Ngozi Adichie', email: 'chimamanda@purplehibiscus.ng', country: 'Nigeria', active: true },
  { authorId: 5, fullName: 'Haruki Murakami', email: 'haruki@kafka.jp', country: 'Japan', active: true },
  { authorId: 6, fullName: 'Margaret Atwood', email: 'margaret@gilead.ca', country: 'Canada', active: true },
  { authorId: 7, fullName: 'Italo Calvino', email: 'italo@invisiblecities.it', country: 'Italy', active: false },
  { authorId: 8, fullName: 'Octavia E. Butler', email: 'octavia@kindred.io', country: 'United States', active: false },
  { authorId: 9, fullName: 'Julio Cortázar', email: 'julio@rayuela.ar', country: 'Argentina', active: false },
  { authorId: 10, fullName: 'Toni Morrison', email: 'toni@beloved.us', country: 'United States', active: false },
  { authorId: 11, fullName: 'Kazuo Ishiguro', email: 'kazuo@remains.uk', country: 'United Kingdom', active: true },
  { authorId: 12, fullName: 'Isabel Allende', email: 'isabel@espiritus.cl', country: 'Chile', active: true },
  { authorId: 13, fullName: 'Stanisław Lem', email: 'stanislaw@solaris.pl', country: 'Poland', active: false },
  { authorId: 14, fullName: 'Zadie Smith', email: 'zadie@whiteteeth.uk', country: 'United Kingdom', active: true },
  { authorId: 15, fullName: 'Mario Vargas Llosa', email: 'mario@catedral.pe', country: 'Peru', active: true },
  { authorId: 16, fullName: 'Han Kang', email: 'han@vegetarian.kr', country: 'South Korea', active: true },
  { authorId: 17, fullName: 'Umberto Eco', email: 'umberto@rosa.it', country: 'Italy', active: false },
  { authorId: 18, fullName: 'Ngũgĩ wa Thiong\'o', email: 'ngugi@decolonising.ke', country: 'Kenya', active: true },
  { authorId: 19, fullName: 'Clarice Lispector', email: 'clarice@hora.br', country: 'Brazil', active: false },
  { authorId: 20, fullName: 'Salman Rushdie', email: 'salman@midnight.in', country: 'India', active: true },
  { authorId: 21, fullName: 'Olga Tokarczuk', email: 'olga@flights.pl', country: 'Poland', active: true },
  { authorId: 22, fullName: 'José Saramago', email: 'jose@ensaio.pt', country: 'Portugal', active: false },
  { authorId: 23, fullName: 'Arundhati Roy', email: 'arundhati@smallthings.in', country: 'India', active: true },
  { authorId: 24, fullName: 'Mariana Enriquez', email: 'mariana@fuego.ar', country: 'Argentina', active: true },
]
