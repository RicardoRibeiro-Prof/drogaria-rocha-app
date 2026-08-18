# Drogaria Rocha Mobile

Aplicativo mobile real desenvolvido com React Native + Expo.

## Desenvolvimento

Requisitos:
- Node.js 20.19+
- Expo Go compatível com SDK 54

Comandos:

```bash
npm install
npx expo start
```

Depois, escaneie o QR Code com o Expo Go no Android ou iOS.

## Builds

```bash
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

## Estrutura inicial

- Início
- Catálogo e busca
- Carrinho persistente
- Checkout
- Duas lojas
- Entrega ou retirada
- PIX, dinheiro, crédito e débito
- Login/cadastro
- Pedidos e acompanhamento
- Supabase para autenticação e pedidos

Este branch não usa Vite, HTML ou CSS web como aplicação principal. A interface é construída com componentes nativos do React Native.
