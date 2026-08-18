import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES, DEMO_PRODUCTS, Product } from './src/data/demoProducts';
import { supabase } from './src/lib/supabase';

type Tab = 'home' | 'catalog' | 'cart' | 'orders' | 'account';
type Cart = Record<number, number>;
type AuthMode = 'login' | 'register';

type Order = {
  id?: string;
  code: string;
  customer_name: string;
  store_id: number;
  fulfillment: 'delivery' | 'pickup';
  payment_method: string;
  total: number;
  status: string;
  created_at: string;
  local?: boolean;
};

const CART_KEY = '@drogaria-rocha/cart';
const LOCAL_ORDERS_KEY = '@drogaria-rocha/orders';

const COLORS = {
  green: '#0B5D4B',
  greenDark: '#073F34',
  greenSoft: '#E8F4F0',
  mint: '#F3FAF7',
  orange: '#F59E0B',
  orangeSoft: '#FFF4DA',
  background: '#F6F7F5',
  card: '#FFFFFF',
  text: '#17211D',
  muted: '#6B756F',
  border: '#E4E8E5',
  danger: '#B42318',
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Pedido recebido',
  confirmed: 'Confirmado',
  separating: 'Em separação',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const digits = (value: string) => value.replace(/\D/g, '');

function makeOrderCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DR${y}${m}${d}-${random}`;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DrogariaRochaApp />
    </SafeAreaProvider>
  );
}

function DrogariaRochaApp() {
  const [tab, setTab] = useState<Tab>('home');
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState<Cart>({});
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,category,price,badge,image_url,active')
      .eq('active', true)
      .order('id');

    if (!error && data?.length) {
      setProducts(
        data.map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          description: item.description || '',
          category: item.category || 'Outros',
          price: Number(item.price || 0),
          badge: item.badge || undefined,
          active: item.active,
          image_url: item.image_url,
        }))
      );
    } else {
      setProducts(DEMO_PRODUCTS);
    }
    setLoadingProducts(false);
  }, []);

  const loadProfile = useCallback(async (user: any) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('name,phone,cpf,birth_date')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(data || { name: user.user_metadata?.name || '', phone: user.user_metadata?.phone || '' });
  }, []);

  const loadOrders = useCallback(async () => {
    const localRaw = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
    const localOrders: Order[] = localRaw ? JSON.parse(localRaw) : [];

    const { data: authData } = await supabase.auth.getSession();
    const user = authData.session?.user;
    if (!user) {
      setOrders(localOrders);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id,code,customer_name,store_id,fulfillment,payment_method,total,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) setOrders(localOrders);
    else setOrders([...(data || []).map((order: any) => ({ ...order, total: Number(order.total) })), ...localOrders]);
  }, []);

  useEffect(() => {
    loadProducts();
    AsyncStorage.getItem(CART_KEY).then((value) => {
      if (value) setCart(JSON.parse(value));
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProducts, loadProfile]);

  useEffect(() => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders, session]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = category === 'Todos' || product.category === category;
      const matchSearch = !term || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [products, search, category]);

  const cartItems = useMemo(
    () => products
      .filter((product) => cart[product.id] > 0)
      .map((product) => ({ ...product, quantity: cart[product.id] })),
    [products, cart]
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] || 0) + 1 }));
  };

  const changeQuantity = (productId: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[productId] || 0) + delta);
      const updated = { ...current, [productId]: next };
      if (next === 0) delete updated[productId];
      return updated;
    });
  };

  const goCatalog = (selectedCategory?: string) => {
    if (selectedCategory) setCategory(selectedCategory);
    setTab('catalog');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.content}>
          {tab === 'home' && (
            <HomeScreen
              products={products.slice(0, 6)}
              loading={loadingProducts}
              search={search}
              setSearch={setSearch}
              addToCart={addToCart}
              goCatalog={goCatalog}
              setTab={setTab}
              cartCount={cartCount}
            />
          )}
          {tab === 'catalog' && (
            <CatalogScreen
              products={filteredProducts}
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              addToCart={addToCart}
              cart={cart}
              changeQuantity={changeQuantity}
            />
          )}
          {tab === 'cart' && (
            <CartScreen
              items={cartItems}
              total={cartTotal}
              changeQuantity={changeQuantity}
              openCheckout={() => setCheckoutOpen(true)}
              goCatalog={() => setTab('catalog')}
            />
          )}
          {tab === 'orders' && <OrdersScreen orders={orders} session={session} setTab={setTab} />}
          {tab === 'account' && (
            <AccountScreen
              session={session}
              profile={profile}
              setProfile={setProfile}
            />
          )}
        </View>

        <BottomNav tab={tab} setTab={setTab} cartCount={cartCount} />
      </View>

      <CheckoutModal
        visible={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cartItems}
        total={cartTotal}
        session={session}
        profile={profile}
        onSuccess={async () => {
          setCart({});
          setCheckoutOpen(false);
          await loadOrders();
          setTab('orders');
        }}
      />
    </SafeAreaView>
  );
}

function HomeScreen({ products, loading, search, setSearch, addToCart, goCatalog, setTab, cartCount }: any) {
  return (
    <ScrollView contentContainerStyle={styles.screenScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>DROGARIA ROCHA</Text>
          <Text style={styles.headerTitle}>Cuidado perto de você.</Text>
        </View>
        <Pressable style={styles.headerCart} onPress={() => setTab('cart')}>
          <Text style={styles.headerCartIcon}>🛍️</Text>
          {cartCount > 0 && <Text style={styles.headerCartBadge}>{cartCount}</Text>}
        </Pressable>
      </View>

      <Pressable style={styles.deliveryBar}>
        <View style={styles.deliveryIcon}><Text>📍</Text></View>
        <View style={styles.flex1}>
          <Text style={styles.deliveryLabel}>Entregar em</Text>
          <Text style={styles.deliveryValue}>Informe seu endereço no checkout</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => goCatalog()}
          placeholder="Buscar medicamento ou produto"
          placeholderTextColor="#8B958F"
          returnKeyType="search"
        />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTextArea}>
          <View style={styles.heroPill}><Text style={styles.heroPillText}>COMPRA RÁPIDA</Text></View>
          <Text style={styles.heroTitle}>Sua farmácia{`\n`}na palma da mão</Text>
          <Text style={styles.heroSubtitle}>Peça, acompanhe e compre novamente sem depender de conversa no WhatsApp.</Text>
          <Pressable style={styles.heroButton} onPress={() => goCatalog()}>
            <Text style={styles.heroButtonText}>Ver produtos</Text>
          </Pressable>
        </View>
        <View style={styles.heroArt}>
          <Text style={styles.heroArtCross}>+</Text>
          <View style={styles.heroArtCircle}><Text style={styles.heroArtEmoji}>💊</Text></View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>O que você precisa?</Text>
      <View style={styles.quickGrid}>
        <QuickAction icon="💊" label="Medicamentos" onPress={() => goCatalog('Medicamentos')} />
        <QuickAction icon="🧴" label="Dermocosméticos" onPress={() => goCatalog('Dermocosméticos')} />
        <QuickAction icon="🩹" label="Cuidados" onPress={() => goCatalog('Cuidados')} />
        <QuickAction icon="📋" label="Enviar receita" onPress={() => Alert.alert('Receita', 'O módulo de receita será conectado à câmera e arquivos na próxima etapa.')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Destaques para você</Text>
        <Pressable onPress={() => goCatalog()}><Text style={styles.linkText}>Ver todos</Text></Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.green} style={{ marginTop: 28 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} compact />
          ))}
        </ScrollView>
      )}

      <Pressable style={styles.supportCard} onPress={() => Alert.alert('Atendimento', 'O atendimento por WhatsApp será aberto com o contexto do pedido quando o número oficial for configurado.') }>
        <View style={styles.supportIcon}><Text style={{ fontSize: 22 }}>💬</Text></View>
        <View style={styles.flex1}>
          <Text style={styles.supportTitle}>Precisa de ajuda?</Text>
          <Text style={styles.supportText}>Fale com a Drogaria Rocha</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress }: any) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}><Text style={styles.quickEmoji}>{icon}</Text></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function CatalogScreen({ products, search, setSearch, category, setCategory, addToCart, cart, changeQuantity }: any) {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>CATÁLOGO</Text>
        <Text style={styles.screenTitle}>Encontre o que precisa</Text>
      </View>
      <View style={[styles.searchBox, { marginHorizontal: 18 }]}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nome, categoria ou descrição"
          placeholderTextColor="#8B958F"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item}
            style={[styles.categoryChip, category === item && styles.categoryChipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.catalogList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            quantity={cart[item.id] || 0}
            add={() => addToCart(item)}
            change={(delta: number) => changeQuantity(item.id, delta)}
          />
        )}
        ListEmptyComponent={<EmptyState icon="🔎" title="Nada encontrado" text="Tente outra busca ou categoria." />}
      />
    </View>
  );
}

function ProductCard({ product, onAdd, compact = false }: any) {
  return (
    <View style={[styles.productCard, compact && styles.productCardCompact]}>
      <View style={styles.productVisual}>
        <Text style={styles.productEmoji}>{product.category === 'Medicamentos' ? '💊' : product.category === 'Dermocosméticos' ? '🧴' : '✚'}</Text>
        {product.badge && <Text style={styles.productBadge}>{product.badge}</Text>}
      </View>
      <Text style={styles.productCategory}>{product.category}</Text>
      <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
      <Text numberOfLines={1} style={styles.productDescription}>{product.description}</Text>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{money(product.price)}</Text>
        <Pressable style={styles.addButton} onPress={onAdd}><Text style={styles.addButtonText}>+</Text></Pressable>
      </View>
    </View>
  );
}

function ProductRow({ product, quantity, add, change }: any) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productRowVisual}><Text style={{ fontSize: 30 }}>{product.category === 'Medicamentos' ? '💊' : product.category === 'Dermocosméticos' ? '🧴' : '✚'}</Text></View>
      <View style={styles.productRowInfo}>
        <Text style={styles.productCategory}>{product.category}</Text>
        <Text style={styles.productRowName}>{product.name}</Text>
        <Text numberOfLines={1} style={styles.productDescription}>{product.description}</Text>
        <Text style={styles.productRowPrice}>{money(product.price)}</Text>
      </View>
      {quantity > 0 ? (
        <View style={styles.quantityControl}>
          <Pressable onPress={() => change(-1)}><Text style={styles.qtyButton}>−</Text></Pressable>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <Pressable onPress={() => change(1)}><Text style={styles.qtyButton}>+</Text></Pressable>
        </View>
      ) : (
        <Pressable style={styles.rowAddButton} onPress={add}><Text style={styles.rowAddButtonText}>Adicionar</Text></Pressable>
      )}
    </View>
  );
}

function CartScreen({ items, total, changeQuantity, openCheckout, goCatalog }: any) {
  if (!items.length) {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.screenHeader}><Text style={styles.eyebrow}>CARRINHO</Text><Text style={styles.screenTitle}>Sua compra</Text></View>
        <EmptyState icon="🛍️" title="Seu carrinho está vazio" text="Adicione produtos para começar seu pedido." />
        <Pressable style={[styles.primaryButton, { marginHorizontal: 24 }]} onPress={goCatalog}><Text style={styles.primaryButtonText}>Explorar catálogo</Text></Pressable>
      </View>
    );
  }
  return (
    <View style={styles.fullScreen}>
      <View style={styles.screenHeader}><Text style={styles.eyebrow}>CARRINHO</Text><Text style={styles.screenTitle}>Sua compra</Text></View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.cartList}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.cartItemVisual}><Text style={{ fontSize: 26 }}>{item.category === 'Medicamentos' ? '💊' : '✚'}</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <Text style={styles.cartItemPrice}>{money(item.price)}</Text>
            </View>
            <View style={styles.quantityControl}>
              <Pressable onPress={() => changeQuantity(item.id, -1)}><Text style={styles.qtyButton}>−</Text></Pressable>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <Pressable onPress={() => changeQuantity(item.id, 1)}><Text style={styles.qtyButton}>+</Text></Pressable>
            </View>
          </View>
        )}
      />
      <View style={styles.cartSummary}>
        <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{money(total)}</Text></View>
        <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Entrega</Text><Text style={styles.deliveryFree}>Calculada no checkout</Text></View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryLine}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{money(total)}</Text></View>
        <Pressable style={styles.primaryButton} onPress={openCheckout}><Text style={styles.primaryButtonText}>Continuar para checkout</Text></Pressable>
      </View>
    </View>
  );
}

function OrdersScreen({ orders, session, setTab }: any) {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.screenHeader}><Text style={styles.eyebrow}>PEDIDOS</Text><Text style={styles.screenTitle}>Acompanhe suas compras</Text></View>
      {!session && !orders.length ? (
        <>
          <EmptyState icon="📦" title="Nenhum pedido ainda" text="Entre na sua conta para acompanhar pedidos sincronizados em qualquer aparelho." />
          <Pressable style={[styles.primaryButton, { marginHorizontal: 24 }]} onPress={() => setTab('account')}><Text style={styles.primaryButtonText}>Entrar na minha conta</Text></Pressable>
        </>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || `${item.code}-${index}`}
          contentContainerStyle={styles.ordersList}
          renderItem={({ item }) => <OrderCard order={item} />}
          ListEmptyComponent={<EmptyState icon="📦" title="Nenhum pedido" text="Quando você fizer uma compra, ela aparecerá aqui." />}
        />
      )}
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View><Text style={styles.orderCode}>{order.code}</Text><Text style={styles.orderDate}>{new Date(order.created_at).toLocaleString('pt-BR')}</Text></View>
        <View style={styles.statusChip}><Text style={styles.statusChipText}>{STATUS_LABELS[order.status] || order.status}</Text></View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.orderDetail}>🏪 Loja {order.store_id}</Text>
        <Text style={styles.orderDetail}>{order.fulfillment === 'pickup' ? '🛍️ Retirada' : '🛵 Entrega'}</Text>
      </View>
      <View style={styles.orderBottom}>
        <Text style={styles.orderTotal}>{money(Number(order.total))}</Text>
        {order.local && <Text style={styles.localTag}>salvo neste aparelho</Text>}
      </View>
    </View>
  );
}

function AccountScreen({ session, profile, setProfile }: any) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (session?.user) {
    return (
      <ScrollView contentContainerStyle={styles.accountScreen}>
        <View style={styles.accountAvatar}><Text style={styles.accountAvatarText}>{(profile?.name || session.user.email || 'D').charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.accountName}>{profile?.name || session.user.user_metadata?.name || 'Cliente Drogaria Rocha'}</Text>
        <Text style={styles.accountEmail}>{session.user.email}</Text>
        <View style={styles.accountMenu}>
          <AccountItem icon="👤" title="Meus dados" subtitle={profile?.phone || 'Complete seu cadastro'} />
          <AccountItem icon="📍" title="Endereços" subtitle="Gerencie seus endereços de entrega" />
          <AccountItem icon="♡" title="Favoritos" subtitle="Produtos que você salvou" />
          <AccountItem icon="🔔" title="Notificações" subtitle="Pedidos, ofertas e lembretes" />
        </View>
        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await supabase.auth.signOut();
            setProfile(null);
          }}
        >
          <Text style={styles.logoutButtonText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const submitAuth = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Dados incompletos', 'Informe um e-mail e uma senha válida.');
      return;
    }
    if (mode === 'register' && (name.trim().length < 2 || digits(phone).length < 10 || password.length < 8)) {
      Alert.alert('Confira os dados', 'Informe nome, telefone e uma senha com pelo menos 8 caracteres.');
      return;
    }
    setBusy(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) Alert.alert('Não foi possível entrar', 'Confira o e-mail e a senha.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), phone: phone.trim() } },
    });
    if (!error && data.user) {
      await supabase.from('profiles').upsert({ user_id: data.user.id, name: name.trim(), phone: phone.trim() });
    }
    setBusy(false);
    if (error) Alert.alert('Não foi possível criar a conta', error.message);
    else if (!data.session) Alert.alert('Conta criada', 'Confira seu e-mail para confirmar o cadastro.');
  };

  return (
    <KeyboardAvoidingView style={styles.fullScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.authScreen} keyboardShouldPersistTaps="handled">
        <View style={styles.authBrand}><Text style={styles.authCross}>+</Text></View>
        <Text style={styles.authTitle}>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</Text>
        <Text style={styles.authSubtitle}>Acompanhe pedidos, compre novamente e receba benefícios da Drogaria Rocha.</Text>
        <View style={styles.authTabs}>
          <Pressable style={[styles.authTab, mode === 'login' && styles.authTabActive]} onPress={() => setMode('login')}><Text style={[styles.authTabText, mode === 'login' && styles.authTabTextActive]}>Entrar</Text></Pressable>
          <Pressable style={[styles.authTab, mode === 'register' && styles.authTabActive]} onPress={() => setMode('register')}><Text style={[styles.authTabText, mode === 'register' && styles.authTabTextActive]}>Criar conta</Text></Pressable>
        </View>
        {mode === 'register' && (
          <>
            <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" />
            <Field label="Telefone" value={phone} onChangeText={setPhone} placeholder="(89) 99999-9999" keyboardType="phone-pad" />
          </>
        )}
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Senha" value={password} onChangeText={setPassword} placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : 'Sua senha'} secureTextEntry />
        <Pressable style={[styles.primaryButton, busy && { opacity: 0.6 }]} disabled={busy} onPress={submitAuth}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Entrar' : 'Criar minha conta'}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AccountItem({ icon, title, subtitle }: any) {
  return (
    <Pressable style={styles.accountItem}>
      <View style={styles.accountItemIcon}><Text>{icon}</Text></View>
      <View style={styles.flex1}><Text style={styles.accountItemTitle}>{title}</Text><Text style={styles.accountItemSubtitle}>{subtitle}</Text></View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Field(props: any) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.fieldInput} placeholderTextColor="#98A19C" {...inputProps} />
    </View>
  );
}

function CheckoutModal({ visible, onClose, items, total, session, profile, onSuccess }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [storeId, setStoreId] = useState(1);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [payment, setPayment] = useState('pix');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile?.name || session?.user?.user_metadata?.name || '');
      setPhone(profile?.phone || session?.user?.user_metadata?.phone || '');
      setEmail(session?.user?.email || '');
    }
  }, [visible, profile, session]);

  const finish = async () => {
    if (name.trim().length < 2 || digits(phone).length < 10) {
      Alert.alert('Confira seus dados', 'Informe nome e telefone para concluir o pedido.');
      return;
    }
    if (fulfillment === 'delivery' && address.trim().length < 8) {
      Alert.alert('Endereço necessário', 'Informe o endereço de entrega.');
      return;
    }
    setBusy(true);
    const code = makeOrderCode();
    const orderPayload = {
      code,
      user_id: session?.user?.id || null,
      customer_name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      store_id: storeId,
      fulfillment,
      address: fulfillment === 'delivery' ? address.trim() : null,
      payment_method: payment,
      subtotal: total,
      delivery_fee: 0,
      total,
      status: 'received',
    };

    const { data: savedOrder, error } = await supabase.from('orders').insert(orderPayload).select('id,created_at').single();
    if (!error && savedOrder) {
      const orderItems = items.map((item: any) => ({
        order_id: savedOrder.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      }));
      const { error: itemError } = await supabase.from('order_items').insert(orderItems);
      if (!itemError) {
        setBusy(false);
        Alert.alert('Pedido recebido!', `Seu pedido ${code} foi enviado para a Drogaria Rocha.`);
        onSuccess();
        return;
      }
    }

    const localOrder: Order = {
      code,
      customer_name: name.trim(),
      store_id: storeId,
      fulfillment,
      payment_method: payment,
      total,
      status: 'received',
      created_at: new Date().toISOString(),
      local: true,
    };
    const raw = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
    const existing: Order[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([localOrder, ...existing].slice(0, 30)));
    setBusy(false);
    Alert.alert('Pedido salvo', `Pedido ${code} salvo neste aparelho. A sincronização com a loja será tentada quando o serviço estiver disponível.`);
    onSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.checkoutSafe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled">
            <View style={styles.checkoutHeader}>
              <View><Text style={styles.eyebrow}>CHECKOUT</Text><Text style={styles.checkoutTitle}>Finalizar pedido</Text></View>
              <Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeButtonText}>×</Text></Pressable>
            </View>

            <Text style={styles.checkoutSection}>Seus dados</Text>
            <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome completo" />
            <Field label="Telefone" value={phone} onChangeText={setPhone} placeholder="(89) 99999-9999" keyboardType="phone-pad" />
            <Field label="E-mail (opcional)" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.checkoutSection}>Como quer receber?</Text>
            <View style={styles.optionRow}>
              <OptionButton active={fulfillment === 'delivery'} label="🛵 Entrega" onPress={() => setFulfillment('delivery')} />
              <OptionButton active={fulfillment === 'pickup'} label="🛍️ Retirada" onPress={() => setFulfillment('pickup')} />
            </View>
            {fulfillment === 'delivery' && <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, bairro e referência" multiline />}

            <Text style={styles.checkoutSection}>Escolha a loja</Text>
            <View style={styles.optionRow}>
              <OptionButton active={storeId === 1} label="Loja 1" onPress={() => setStoreId(1)} />
              <OptionButton active={storeId === 2} label="Loja 2" onPress={() => setStoreId(2)} />
            </View>

            <Text style={styles.checkoutSection}>Pagamento</Text>
            <View style={styles.paymentGrid}>
              <OptionButton active={payment === 'pix'} label="PIX" onPress={() => setPayment('pix')} />
              <OptionButton active={payment === 'cash'} label="Dinheiro" onPress={() => setPayment('cash')} />
              <OptionButton active={payment === 'credit'} label="Crédito" onPress={() => setPayment('credit')} />
              <OptionButton active={payment === 'debit'} label="Débito" onPress={() => setPayment('debit')} />
            </View>

            <View style={styles.checkoutTotalCard}>
              <Text style={styles.summaryLabel}>{items.length} produto(s)</Text>
              <Text style={styles.checkoutTotal}>{money(total)}</Text>
            </View>
            <Pressable style={[styles.primaryButton, busy && { opacity: 0.6 }]} disabled={busy} onPress={finish}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirmar pedido</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function OptionButton({ active, label, onPress }: any) {
  return (
    <Pressable style={[styles.optionButton, active && styles.optionButtonActive]} onPress={onPress}>
      <Text style={[styles.optionButtonText, active && styles.optionButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ icon, title, text }: any) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Text style={{ fontSize: 30 }}>{icon}</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function BottomNav({ tab, setTab, cartCount }: any) {
  const items = [
    { id: 'home', icon: '⌂', label: 'Início' },
    { id: 'catalog', icon: '⌕', label: 'Catálogo' },
    { id: 'cart', icon: '🛍', label: 'Carrinho' },
    { id: 'orders', icon: '▣', label: 'Pedidos' },
    { id: 'account', icon: '○', label: 'Conta' },
  ];
  return (
    <SafeAreaView edges={['bottom']} style={styles.navSafe}>
      <View style={styles.bottomNav}>
        {items.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable key={item.id} style={styles.navItem} onPress={() => setTab(item.id)}>
              <View>
                <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
                {item.id === 'cart' && cartCount > 0 && <Text style={styles.navBadge}>{cartCount}</Text>}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  app: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },
  fullScreen: { flex: 1 },
  flex1: { flex: 1 },
  screenScroll: { padding: 18, paddingBottom: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: COLORS.green, letterSpacing: 1.4 },
  headerTitle: { fontSize: 23, lineHeight: 29, fontWeight: '800', color: COLORS.text, marginTop: 3 },
  headerCart: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  headerCartIcon: { fontSize: 20 },
  headerCartBadge: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: COLORS.orange, color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  deliveryBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenSoft, borderRadius: 15, padding: 12, marginBottom: 13 },
  deliveryIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  deliveryLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  deliveryValue: { fontSize: 13, color: COLORS.greenDark, fontWeight: '700', marginTop: 2 },
  chevron: { fontSize: 27, color: '#85908A', fontWeight: '300' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, height: 52, paddingHorizontal: 14, marginBottom: 16 },
  searchIcon: { fontSize: 24, color: COLORS.green, marginRight: 7 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, height: '100%' },
  hero: { backgroundColor: COLORS.green, borderRadius: 24, padding: 20, minHeight: 230, flexDirection: 'row', overflow: 'hidden', marginBottom: 26 },
  heroTextArea: { flex: 1.35, zIndex: 2 },
  heroPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, marginBottom: 12 },
  heroPillText: { color: '#DDF5EC', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 31, fontWeight: '900' },
  heroSubtitle: { color: '#CDE7DE', fontSize: 12.5, lineHeight: 18, marginTop: 8, maxWidth: 220 },
  heroButton: { alignSelf: 'flex-start', backgroundColor: COLORS.orange, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 15 },
  heroButtonText: { color: '#3B2900', fontWeight: '800', fontSize: 13 },
  heroArt: { flex: 0.65, alignItems: 'center', justifyContent: 'center' },
  heroArtCross: { position: 'absolute', top: -30, right: -2, fontSize: 160, lineHeight: 160, fontWeight: '300', color: 'rgba(255,255,255,0.07)' },
  heroArtCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: 'rgba(255,255,255,0.15)' },
  heroArtEmoji: { fontSize: 45 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 13 },
  quickGrid: { flexDirection: 'row', gap: 9, marginBottom: 27 },
  quickAction: { flex: 1, minWidth: 0, alignItems: 'center' },
  quickIcon: { width: 60, height: 60, borderRadius: 19, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickEmoji: { fontSize: 25 },
  quickLabel: { fontSize: 10.5, lineHeight: 13, textAlign: 'center', fontWeight: '700', color: COLORS.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: COLORS.green, fontSize: 13, fontWeight: '800', marginTop: -11 },
  horizontalProducts: { gap: 11, paddingRight: 10, paddingBottom: 4 },
  productCard: { width: 170, backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  productCardCompact: { width: 166 },
  productVisual: { height: 105, borderRadius: 14, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  productEmoji: { fontSize: 39 },
  productBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: COLORS.orangeSoft, color: '#7A4B00', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, fontSize: 8, fontWeight: '800' },
  productCategory: { color: COLORS.green, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: 14, lineHeight: 18, color: COLORS.text, fontWeight: '800', marginTop: 4, minHeight: 36 },
  productDescription: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  productBottom: { marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  addButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 22, lineHeight: 25, fontWeight: '500' },
  supportCard: { marginTop: 26, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  supportIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  supportTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  supportText: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  screenHeader: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 },
  screenTitle: { color: COLORS.text, fontSize: 25, fontWeight: '900', marginTop: 3 },
  categoryRow: { paddingHorizontal: 18, gap: 8, paddingBottom: 12 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  categoryChipText: { color: COLORS.muted, fontWeight: '700', fontSize: 12 },
  categoryChipTextActive: { color: '#fff' },
  catalogList: { paddingHorizontal: 18, paddingBottom: 24 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 11, marginBottom: 10 },
  productRowVisual: { width: 70, height: 76, borderRadius: 14, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  productRowInfo: { flex: 1, minWidth: 0 },
  productRowName: { fontSize: 14.5, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  productRowPrice: { fontSize: 14.5, fontWeight: '900', color: COLORS.text, marginTop: 7 },
  rowAddButton: { alignSelf: 'flex-end', paddingHorizontal: 11, paddingVertical: 8, backgroundColor: COLORS.greenSoft, borderRadius: 10, marginLeft: 8 },
  rowAddButtonText: { color: COLORS.greenDark, fontWeight: '800', fontSize: 11 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenSoft, borderRadius: 11, paddingHorizontal: 5, height: 36, gap: 8 },
  qtyButton: { color: COLORS.greenDark, fontSize: 20, width: 22, textAlign: 'center', fontWeight: '700' },
  qtyValue: { color: COLORS.text, fontSize: 13, fontWeight: '800', minWidth: 15, textAlign: 'center' },
  cartList: { paddingHorizontal: 18, paddingBottom: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 11, marginBottom: 9 },
  cartItemVisual: { width: 56, height: 56, borderRadius: 13, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cartItemName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  cartItemPrice: { color: COLORS.green, fontSize: 13, fontWeight: '800', marginTop: 5 },
  cartSummary: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 18 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  summaryLabel: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  deliveryFree: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 5 },
  totalLabel: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  totalValue: { color: COLORS.text, fontSize: 21, fontWeight: '900' },
  primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 14 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35, paddingVertical: 45 },
  emptyIcon: { width: 76, height: 76, borderRadius: 25, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19, marginTop: 7 },
  ordersList: { paddingHorizontal: 18, paddingBottom: 24 },
  orderCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 15, marginBottom: 11 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderCode: { color: COLORS.text, fontSize: 15, fontWeight: '900' },
  orderDate: { color: COLORS.muted, fontSize: 10.5, marginTop: 3 },
  statusChip: { backgroundColor: COLORS.greenSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, alignSelf: 'flex-start' },
  statusChipText: { color: COLORS.greenDark, fontSize: 9.5, fontWeight: '800' },
  orderDetails: { flexDirection: 'row', gap: 14, marginTop: 17 },
  orderDetail: { color: COLORS.muted, fontSize: 11.5, fontWeight: '600' },
  orderBottom: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  localTag: { fontSize: 9, color: COLORS.orange, fontWeight: '700' },
  accountScreen: { alignItems: 'center', padding: 22, paddingBottom: 40 },
  accountAvatar: { width: 84, height: 84, borderRadius: 30, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  accountAvatarText: { color: '#fff', fontSize: 34, fontWeight: '900' },
  accountName: { color: COLORS.text, fontSize: 21, fontWeight: '900', marginTop: 15 },
  accountEmail: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  accountMenu: { width: '100%', marginTop: 24, backgroundColor: COLORS.card, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  accountItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  accountItemIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  accountItemTitle: { color: COLORS.text, fontSize: 13.5, fontWeight: '800' },
  accountItemSubtitle: { color: COLORS.muted, fontSize: 10.5, marginTop: 2 },
  logoutButton: { width: '100%', height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#F0C6C2', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  logoutButtonText: { color: COLORS.danger, fontWeight: '800' },
  authScreen: { padding: 24, paddingBottom: 50 },
  authBrand: { width: 62, height: 62, borderRadius: 22, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 20 },
  authCross: { color: '#fff', fontSize: 42, lineHeight: 45, fontWeight: '300' },
  authTitle: { color: COLORS.text, fontSize: 26, fontWeight: '900' },
  authSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  authTabs: { flexDirection: 'row', backgroundColor: '#ECEFEC', borderRadius: 13, padding: 4, marginBottom: 17 },
  authTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  authTabActive: { backgroundColor: '#fff' },
  authTabText: { color: COLORS.muted, fontWeight: '700', fontSize: 12.5 },
  authTabTextActive: { color: COLORS.greenDark, fontWeight: '900' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { color: COLORS.text, fontSize: 11.5, fontWeight: '800', marginBottom: 6 },
  fieldInput: { minHeight: 50, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, color: COLORS.text, fontSize: 14, textAlignVertical: 'top' },
  checkoutSafe: { flex: 1, backgroundColor: COLORS.background },
  checkoutContent: { padding: 20, paddingBottom: 35 },
  checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21 },
  checkoutTitle: { color: COLORS.text, fontSize: 25, fontWeight: '900', marginTop: 3 },
  closeButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: COLORS.text, fontSize: 26, lineHeight: 29 },
  checkoutSection: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginTop: 8, marginBottom: 10 },
  optionRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  optionButton: { flex: 1, minHeight: 47, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  optionButtonActive: { backgroundColor: COLORS.greenSoft, borderColor: COLORS.green },
  optionButtonText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  optionButtonTextActive: { color: COLORS.greenDark, fontWeight: '900' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkoutTotalCard: { marginTop: 19, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutTotal: { color: COLORS.text, fontSize: 21, fontWeight: '900' },
  navSafe: { backgroundColor: COLORS.card },
  bottomNav: { minHeight: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  navIcon: { color: '#8A948E', fontSize: 21, lineHeight: 24, textAlign: 'center' },
  navIconActive: { color: COLORS.green },
  navLabel: { color: '#8A948E', fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  navLabelActive: { color: COLORS.green, fontWeight: '900' },
  navBadge: { position: 'absolute', top: -6, right: -11, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: COLORS.orange, color: '#fff', textAlign: 'center', lineHeight: 17, fontSize: 9, fontWeight: '800', paddingHorizontal: 3 },
});
