export type Category = 'craft' | 'fashion' | 'food' | 'home'

export interface Creator {
  id: string
  slug: string
  name: string
  photo: string
  location: string
  brandName: { fr: string; ja: string }
  brandConcept: { fr: string; ja: string }
  story: { fr: string; ja: string }
  interview: { q: string; a: { fr: string; ja: string } }[]
  media: { type: 'image' | 'video'; url: string }[]
  accentColor: string
  palette: { bg: string; surface: string; text: string }
  category: Category
  socialLinks?: { instagram?: string; web?: string }
  featured: boolean
}

export interface Product {
  id: string
  slug: string
  creatorId: string
  name: { fr: string; ja: string }
  category: Category
  price: number
  shortDescription: { fr: string; ja: string }
  story: { fr: string; ja: string }
  images: string[]
  tags: string[]
  stripeProductId?: string
}

export interface CartItem {
  product: Product
  quantity: number
}
