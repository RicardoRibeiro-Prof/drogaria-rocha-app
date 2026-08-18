export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  badge?: string;
  active?: boolean;
  image_url?: string | null;
};

export const DEMO_PRODUCTS: Product[] = [
  { id: 1, name: 'Dipirona 500 mg', description: 'Analgésico e antitérmico • caixa', category: 'Medicamentos', price: 8.9, badge: 'Mais procurado' },
  { id: 2, name: 'Paracetamol 750 mg', description: 'Analgésico e antitérmico • caixa', category: 'Medicamentos', price: 11.9 },
  { id: 3, name: 'Soro Fisiológico 0,9%', description: 'Frasco 500 ml', category: 'Cuidados', price: 9.5 },
  { id: 4, name: 'Protetor Solar FPS 60', description: 'Proteção facial e corporal • 120 ml', category: 'Dermocosméticos', price: 69.9, badge: 'Destaque' },
  { id: 5, name: 'Sabonete Líquido Facial', description: 'Limpeza diária • 150 ml', category: 'Dermocosméticos', price: 39.9 },
  { id: 6, name: 'Fralda Geriátrica G', description: 'Pacote com 8 unidades', category: 'Higiene', price: 34.9 },
  { id: 7, name: 'Vitamina C 1 g', description: 'Suplemento efervescente • 10 comprimidos', category: 'Vitaminas', price: 19.9 },
  { id: 8, name: 'Álcool 70%', description: 'Frasco 500 ml', category: 'Higiene', price: 12.9 },
];

export const CATEGORIES = ['Todos', 'Medicamentos', 'Dermocosméticos', 'Higiene', 'Vitaminas', 'Cuidados'];
