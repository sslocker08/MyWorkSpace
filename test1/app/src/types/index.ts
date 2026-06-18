export type Category = 'craft' | 'fashion' | 'food' | 'home'

export type Lang = 'fr' | 'ja'

export interface LocalizedString {
  fr: string
  ja: string
}

export interface Product {
  id: string
  slug: string
  name: LocalizedString
  category: Category
  price: number
  shortDescription: LocalizedString
  story: LocalizedString
  images: string[]
  tags: string[]
}

export interface CartItem {
  product: Product
  quantity: number
}
