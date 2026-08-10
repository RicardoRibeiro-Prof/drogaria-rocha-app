export const CATEGORIAS = [
  { id: 'todos', nome: 'Todos', icone: '✦' },
  { id: 'medicamentos', nome: 'Medicamentos', icone: '✚' },
  { id: 'higiene', nome: 'Higiene', icone: '◌' },
  { id: 'beleza', nome: 'Beleza', icone: '◇' },
  { id: 'infantil', nome: 'Infantil', icone: '☀' }
];

export const PRODUTOS = [
  { id: 1, nome: 'Paracetamol 750 mg', descricao: '20 comprimidos', categoria: 'medicamentos', preco: 12.9, selo: 'Mais pedido', icone: 'P' },
  { id: 2, nome: 'Vitamina C 1 g', descricao: '10 comprimidos efervescentes', categoria: 'medicamentos', preco: 16.5, selo: 'Oferta', icone: 'C' },
  { id: 3, nome: 'Protetor solar FPS 60', descricao: 'Toque seco • 50 g', categoria: 'beleza', preco: 49.9, selo: '', icone: '☼' },
  { id: 4, nome: 'Fralda infantil M', descricao: 'Pacote com 24 unidades', categoria: 'infantil', preco: 34.9, selo: '', icone: 'M' },
  { id: 5, nome: 'Sabonete líquido', descricao: 'Hidratação suave • 250 ml', categoria: 'higiene', preco: 18.75, selo: '', icone: '◌' },
  { id: 6, nome: 'Shampoo anticaspa', descricao: 'Uso diário • 200 ml', categoria: 'higiene', preco: 24.9, selo: '', icone: 'S' },
  { id: 7, nome: 'Repelente corporal', descricao: 'Proteção prolongada • 100 ml', categoria: 'higiene', preco: 21.9, selo: 'Oferta', icone: 'R' },
  { id: 8, nome: 'Hidratante corporal', descricao: 'Pele seca • 400 ml', categoria: 'beleza', preco: 27.5, selo: '', icone: 'H' }
];

export const moeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
