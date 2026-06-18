export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  ref: string
  customer: { name: string; email: string; city: string }
  items: { name: string; qty: number; price: number }[]
  total: number
  status: OrderStatus
  createdAt: string
}

export const mockOrders: Order[] = [
  {
    id: 'o1',
    ref: 'KNM-2024-0001',
    customer: { name: 'Sophie Marchand', email: 'sophie.m@gmail.com', city: 'Paris' },
    items: [
      { name: 'Bol Hagi-yaki', qty: 1, price: 180 },
      { name: "Gyokuro d'Uji", qty: 2, price: 88 },
    ],
    total: 356,
    status: 'delivered',
    createdAt: '2024-11-02',
  },
  {
    id: 'o2',
    ref: 'KNM-2024-0002',
    customer: { name: 'Thomas Leroy', email: 'thomas.l@outlook.fr', city: 'Lyon' },
    items: [{ name: 'Plateau en laque urushi', qty: 1, price: 420 }],
    total: 420,
    status: 'shipped',
    createdAt: '2024-11-08',
  },
  {
    id: 'o3',
    ref: 'KNM-2024-0003',
    customer: { name: 'Camille Dupont', email: 'c.dupont@free.fr', city: 'Bordeaux' },
    items: [
      { name: 'Foulard katazome', qty: 1, price: 155 },
      { name: 'Tenugui tie-dye shibori', qty: 2, price: 38 },
    ],
    total: 231,
    status: 'processing',
    createdAt: '2024-11-12',
  },
  {
    id: 'o4',
    ref: 'KNM-2024-0004',
    customer: { name: 'Antoine Bernard', email: 'a.bernard@sfr.fr', city: 'Marseille' },
    items: [
      { name: 'Vase Bizen-yaki', qty: 1, price: 260 },
      { name: "Encens Koh-dō, cèdre & hinoki", qty: 1, price: 42 },
    ],
    total: 302,
    status: 'pending',
    createdAt: '2024-11-15',
  },
  {
    id: 'o5',
    ref: 'KNM-2024-0005',
    customer: { name: 'Élise Moreau', email: 'elise.m@laposte.net', city: 'Nantes' },
    items: [{ name: 'Saké Junmai Daiginjo', qty: 3, price: 72 }],
    total: 216,
    status: 'shipped',
    createdAt: '2024-11-14',
  },
  {
    id: 'o6',
    ref: 'KNM-2024-0006',
    customer: { name: 'Pierre Fontaine', email: 'p.fontaine@gmail.com', city: 'Strasbourg' },
    items: [
      { name: 'Chemise en tissu boro', qty: 1, price: 320 },
      { name: 'Tabi en coton naturel', qty: 2, price: 48 },
    ],
    total: 416,
    status: 'delivered',
    createdAt: '2024-10-28',
  },
  {
    id: 'o7',
    ref: 'KNM-2024-0007',
    customer: { name: 'Isabelle Garnier', email: 'i.garnier@orange.fr', city: 'Toulouse' },
    items: [
      { name: 'Papier washi Echizen', qty: 3, price: 65 },
      { name: 'Miso Hatcho vieilli 3 ans', qty: 1, price: 34 },
    ],
    total: 229,
    status: 'cancelled',
    createdAt: '2024-11-01',
  },
]

export const statusLabels: Record<OrderStatus, { fr: string; color: string }> = {
  pending:    { fr: 'En attente',   color: 'text-amber-600 bg-amber-50' },
  processing: { fr: 'En traitement', color: 'text-blue-600 bg-blue-50' },
  shipped:    { fr: 'Expédié',      color: 'text-purple-600 bg-purple-50' },
  delivered:  { fr: 'Livré',        color: 'text-vert bg-green-50' },
  cancelled:  { fr: 'Annulé',       color: 'text-red-600 bg-red-50' },
}
