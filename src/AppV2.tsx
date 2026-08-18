import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES, DEMO_PRODUCTS, Product } from './data/demoProducts';
import { supabase } from './lib/supabase';

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

type ProductForm = {
  id?: number;
  name: string;
  description: string;
  category: string;
  price: string;
  badge: string;
  image_url: string;
  active: boolean;
};

const CART_KEY = '@drogaria-rocha/cart-v2';
const LOCAL_ORDERS_KEY = '@drogaria-rocha/orders-v2';

const COLORS = {
  orange: '#F47A1F',
  orangeDark: '#D95F09',
  orangeSoft: '#FFF1E6',
  black: '#111111',
  graphite: '#2B2B2B',
  muted: '#727272',
  white: '#FFFFFF',
  background: '#F7F7F7',
  border: '#E8E8E8',
  success: '#17803D',
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

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (value: string) => value.replace(/\D/g, '');

function makeOrderCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `DR${y}${m}${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function AppV2() {
  return (
    <SafeAreaProvider>
      <DrogariaRochaApp />
    </SafeAreaProvider>
  );
}

function DrogariaRochaApp() {
  const [tab, setTab] = useState<Tab>('home');
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState<Cart>({});
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,category,price,badge,image_url,active')
      .eq('active', true)
      .order('id');

    if (!error && data?.length) {
      setProducts(data.map((item: any) => ({
        id: Number(item.id),
        name: item.name,
        description: item.description || '',
        category: item.category || 'Outros',
        price: Number(item.price || 0),
        badge: item.badge || undefined,
        active: item.active,
        image_url: item.image_url,
      })));
    } else {
      setProducts(DEMO_PRODUCTS);
    }
    setLoadingProducts(false);
  }, []);

  const loadAdminProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,category,price,badge,image_url,active')
      .order('id', { ascending: false });
    if (!error) {
      setAdminProducts((data || []).map((item: any) => ({
        ...item,
        id: Number(item.id),
        price: Number(item.price || 0),
      })));
    }
  }, []);

  const loadProfile = useCallback(async (user: any) => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: profileData }, { data: adminData }] = await Promise.all([
      supabase.from('profiles').select('name,phone,cpf,birth_date').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('is_admin'),
    ]);
    setProfile(profileData || {
      name: user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
    });
    setIsAdmin(adminData === true);
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
    setOrders(error ? localOrders : [
      ...(data || []).map((order: any) => ({ ...order, total: Number(order.total) })),
      ...localOrders,
    ]);
  }, []);

  useEffect(() => {
    loadProducts();
    AsyncStorage.getItem(CART_KEY).then((value) => value && setCart(JSON.parse(value)));
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

  const categories = useMemo(() => {
    const dynamic = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...CATEGORIES, ...dynamic]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchCategory = category === 'Todos' || product.category === category;
      const matchSearch = !term || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [products, search, category]);

  const cartItems = useMemo(() => products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] })), [products, cart]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product) => setCart((current) => ({
    ...current,
    [product.id]: (current[product.id] || 0) + 1,
  }));

  const changeQuantity = (productId: number, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[productId] || 0) + delta);
      const updated = { ...current, [productId]: next };
      if (next === 0) delete updated[productId];
      return updated;
    });
  };

  const openAdmin = async () => {
    await loadAdminProducts();
    setAdminOpen(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header cartCount={cartCount} setTab={setTab} />
        <View style={styles.content}>
          {tab === 'home' && (
            <HomeScreen
              products={products.slice(0, 6)}
              loading={loadingProducts}
              addToCart={addToCart}
              goCatalog={(selected) => {
                if (selected) setCategory(selected);
                setTab('catalog');
              }}
            />
          )}
          {tab === 'catalog' && (
            <CatalogScreen
              products={filteredProducts}
              loading={loadingProducts}
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              categories={categories}
              addToCart={addToCart}
            />
          )}
          {tab === 'cart' && (
            <CartScreen
              items={cartItems}
              total={cartTotal}
              changeQuantity={changeQuantity}
              checkout={() => cartItems.length ? setCheckoutOpen(true) : Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.')}
              goCatalog={() => setTab('catalog')}
            />
          )}
          {tab === 'orders' && <OrdersScreen orders={orders} loading={false} />}
          {tab === 'account' && (
            <AccountScreen
              session={session}
              profile={profile}
              isAdmin={isAdmin}
              onAdmin={openAdmin}
              onAuthenticated={() => loadProfile(session?.user)}
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
        onFinished={() => {
          setCart({});
          setCheckoutOpen(false);
          setTab('orders');
          loadOrders();
        }}
      />

      <AdminProductsModal
        visible={adminOpen}
        products={adminProducts}
        onClose={() => setAdminOpen(false)}
        onCreate={() => {
          setEditingProduct(null);
          setProductFormOpen(true);
        }}
        onEdit={(product) => {
          setEditingProduct(product);
          setProductFormOpen(true);
        }}
      />

      <ProductFormModal
        visible={productFormOpen}
        product={editingProduct}
        onClose={() => setProductFormOpen(false)}
        onSaved={async () => {
          setProductFormOpen(false);
          await Promise.all([loadAdminProducts(), loadProducts()]);
        }}
      />
    </SafeAreaView>
  );
}

function Header({ cartCount, setTab }: { cartCount: number; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => setTab('home')} style={styles.brandWrap}>
        <Image source={require('../assets/logo-rocha-oficial.webp')} style={styles.logo} resizeMode="contain" />
      </Pressable>
      <Pressable style={styles.headerCart} onPress={() => setTab('cart')}>
        <Ionicons name="bag-handle-outline" size={25} color={COLORS.black} />
        {cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>}
      </Pressable>
    </View>
  );
}

function HomeScreen({ products, loading, addToCart, goCatalog }: {
  products: Product[];
  loading: boolean;
  addToCart: (product: Product) => void;
  goCatalog: (category?: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>DROGARIA ROCHA</Text>
          <Text style={styles.heroTitle}>Cuidado e praticidade na palma da sua mão.</Text>
          <Text style={styles.heroSubtitle}>Compre, acompanhe e repita seus pedidos pelo aplicativo.</Text>
          <Pressable style={styles.heroButton} onPress={() => goCatalog()}>
            <Text style={styles.heroButtonText}>Ver produtos</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </Pressable>
        </View>
        <Ionicons name="medkit" size={74} color={COLORS.orange} />
      </View>

      <SectionTitle title="Acesso rápido" />
      <View style={styles.quickGrid}>
        <QuickAction icon="medical-outline" title="Medicamentos" onPress={() => goCatalog('Medicamentos')} />
        <QuickAction icon="sparkles-outline" title="Beleza" onPress={() => goCatalog('Dermocosméticos')} />
        <QuickAction icon="shield-checkmark-outline" title="Higiene" onPress={() => goCatalog('Higiene')} />
        <QuickAction icon="nutrition-outline" title="Vitaminas" onPress={() => goCatalog('Vitaminas')} />
      </View>

      <SectionTitle title="Destaques" action="Ver todos" onAction={() => goCatalog()} />
      {loading ? <ActivityIndicator color={COLORS.orange} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
          {products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} compact />)}
        </ScrollView>
      )}
    </ScrollView>
  );
}

function CatalogScreen({ products, loading, search, setSearch, category, setCategory, categories, addToCart }: {
  products: Product[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  categories: string[];
  addToCart: (product: Product) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Catálogo</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={21} color={COLORS.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar produto, categoria..." placeholderTextColor="#999" style={styles.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((item) => (
          <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={COLORS.orange} /> : (
        <View style={styles.productGrid}>
          {products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} />)}
        </View>
      )}
    </ScrollView>
  );
}

function ProductCard({ product, onAdd, compact = false }: { product: Product; onAdd: () => void; compact?: boolean }) {
  return (
    <View style={[styles.productCard, compact && styles.productCardCompact]}>
      <View style={styles.productImageBox}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
        ) : (
          <Ionicons name="medical" size={42} color={COLORS.orange} />
        )}
      </View>
      {!!product.badge && <Text style={styles.badge}>{product.badge}</Text>}
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{money(product.price)}</Text>
        <Pressable style={styles.addButton} onPress={onAdd}><Ionicons name="add" size={22} color={COLORS.white} /></Pressable>
      </View>
    </View>
  );
}

function CartScreen({ items, total, changeQuantity, checkout, goCatalog }: any) {
  if (!items.length) {
    return (
      <View style={styles.emptyPage}>
        <Ionicons name="bag-handle-outline" size={66} color={COLORS.orange} />
        <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
        <Text style={styles.emptyText}>Adicione produtos para começar seu pedido.</Text>
        <Pressable style={styles.primaryButton} onPress={goCatalog}><Text style={styles.primaryButtonText}>Ir para o catálogo</Text></Pressable>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.pageTitle}>Carrinho</Text>
      {items.map((item: any) => (
        <View key={item.id} style={styles.cartItem}>
          <View style={styles.cartItemIcon}><Ionicons name="cube-outline" size={25} color={COLORS.orange} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartItemName}>{item.name}</Text>
            <Text style={styles.cartItemPrice}>{money(item.price)}</Text>
          </View>
          <View style={styles.quantityControl}>
            <Pressable onPress={() => changeQuantity(item.id, -1)}><Ionicons name="remove-circle-outline" size={25} color={COLORS.black} /></Pressable>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <Pressable onPress={() => changeQuantity(item.id, 1)}><Ionicons name="add-circle" size={25} color={COLORS.orange} /></Pressable>
          </View>
        </View>
      ))}
      <View style={styles.totalCard}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{money(total)}</Text></View>
      <Pressable style={styles.primaryButton} onPress={checkout}><Text style={styles.primaryButtonText}>Finalizar pedido</Text><Ionicons name="arrow-forward" size={18} color={COLORS.white} /></Pressable>
    </ScrollView>
  );
}

function OrdersScreen({ orders }: { orders: Order[]; loading: boolean }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.pageTitle}>Meus pedidos</Text>
      {!orders.length ? (
        <View style={styles.emptyInline}><Ionicons name="receipt-outline" size={50} color={COLORS.orange} /><Text style={styles.emptyTitle}>Nenhum pedido ainda</Text></View>
      ) : orders.map((order) => (
        <View key={`${order.id || order.code}-${order.created_at}`} style={styles.orderCard}>
          <View style={styles.orderHeader}><Text style={styles.orderCode}>{order.code}</Text><Text style={styles.orderStatus}>{STATUS_LABELS[order.status] || order.status}</Text></View>
          <Text style={styles.orderMeta}>Loja {order.store_id} • {order.fulfillment === 'delivery' ? 'Entrega' : 'Retirada'}</Text>
          <Text style={styles.orderTotal}>{money(order.total)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function AccountScreen({ session, profile, isAdmin, onAdmin, onAuthenticated }: any) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (session?.user) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.pageTitle}>Minha conta</Text>
        <View style={styles.accountCard}>
          <View style={styles.avatar}><Ionicons name="person" size={30} color={COLORS.white} /></View>
          <View style={{ flex: 1 }}><Text style={styles.accountName}>{profile?.name || 'Cliente'}</Text><Text style={styles.accountEmail}>{session.user.email}</Text></View>
        </View>
        {isAdmin && (
          <Pressable style={styles.adminAccess} onPress={onAdmin}>
            <View style={styles.adminIcon}><Ionicons name="settings-outline" size={24} color={COLORS.white} /></View>
            <View style={{ flex: 1 }}><Text style={styles.adminAccessTitle}>Área administrativa</Text><Text style={styles.adminAccessText}>Cadastrar e editar produtos</Text></View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.black} />
          </Pressable>
        )}
        <Pressable style={styles.secondaryButton} onPress={async () => { await supabase.auth.signOut(); onAuthenticated(); }}><Ionicons name="log-out-outline" size={20} color={COLORS.black} /><Text style={styles.secondaryButtonText}>Sair da conta</Text></Pressable>
      </ScrollView>
    );
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) return Alert.alert('Confira os dados', 'Informe e-mail e senha válidos.');
    setBusy(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) Alert.alert('Não foi possível entrar', 'Confira seu e-mail e senha.');
    } else {
      if (!name.trim() || digits(phone).length < 10) {
        setBusy(false);
        return Alert.alert('Confira os dados', 'Informe nome e telefone válidos.');
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim(), phone: phone.trim() } },
      });
      if (!error && data.user) {
        await supabase.from('profiles').upsert({ user_id: data.user.id, name: name.trim(), phone: phone.trim() }, { onConflict: 'user_id' });
      }
      setBusy(false);
      if (error) Alert.alert('Cadastro não concluído', error.message);
      else if (!data.session) Alert.alert('Conta criada', 'Confira seu e-mail para confirmar o cadastro.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
        <View style={styles.authTabs}>
          <Pressable style={[styles.authTab, mode === 'login' && styles.authTabActive]} onPress={() => setMode('login')}><Text style={[styles.authTabText, mode === 'login' && styles.authTabTextActive]}>Entrar</Text></Pressable>
          <Pressable style={[styles.authTab, mode === 'register' && styles.authTabActive]} onPress={() => setMode('register')}><Text style={[styles.authTabText, mode === 'register' && styles.authTabTextActive]}>Criar conta</Text></Pressable>
        </View>
        {mode === 'register' && <><Field label="Nome completo" value={name} onChangeText={setName} /><Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></>}
        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Entrar' : 'Criar minha conta'}</Text>}</Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CheckoutModal({ visible, onClose, items, total, session, profile, onFinished }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [storeId, setStoreId] = useState(1);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [payment, setPayment] = useState('pix');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(profile?.name || session?.user?.user_metadata?.name || '');
      setPhone(profile?.phone || session?.user?.user_metadata?.phone || '');
    }
  }, [visible, profile, session]);

  const submit = async () => {
    if (!name.trim() || digits(phone).length < 10) return Alert.alert('Confira os dados', 'Informe nome e telefone.');
    if (fulfillment === 'delivery' && !address.trim()) return Alert.alert('Endereço', 'Informe o endereço de entrega.');
    setBusy(true);
    const code = makeOrderCode();
    const orderPayload = {
      code,
      user_id: session?.user?.id || null,
      customer_name: name.trim(),
      phone: phone.trim(),
      email: session?.user?.email || null,
      store_id: storeId,
      fulfillment,
      address: fulfillment === 'delivery' ? address.trim() : null,
      payment_method: payment,
      subtotal: total,
      delivery_fee: 0,
      total,
      status: 'received',
    };
    const { data: order, error } = await supabase.from('orders').insert(orderPayload).select('id').single();
    if (!error && order?.id) {
      await supabase.from('order_items').insert(items.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
      })));
    } else {
      const raw = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
      const local = raw ? JSON.parse(raw) : [];
      local.unshift({ ...orderPayload, created_at: new Date().toISOString(), local: true });
      await AsyncStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(local.slice(0, 50)));
    }
    setBusy(false);
    Alert.alert('Pedido recebido', `Número ${code}`);
    onFinished();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <ModalHeader title="Finalizar pedido" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>Loja</Text>
          <OptionRow options={[['1', 'Loja 1'], ['2', 'Loja 2']]} value={String(storeId)} onChange={(v) => setStoreId(Number(v))} />
          <Text style={styles.fieldLabel}>Recebimento</Text>
          <OptionRow options={[['delivery', 'Entrega'], ['pickup', 'Retirada']]} value={fulfillment} onChange={(v) => setFulfillment(v as any)} />
          {fulfillment === 'delivery' && <Field label="Endereço" value={address} onChangeText={setAddress} />}
          <Text style={styles.fieldLabel}>Pagamento</Text>
          <OptionRow options={[['pix', 'PIX'], ['cash', 'Dinheiro'], ['credit', 'Crédito'], ['debit', 'Débito']]} value={payment} onChange={setPayment} />
          <View style={styles.checkoutTotal}><Text style={styles.totalLabel}>Total do pedido</Text><Text style={styles.totalValue}>{money(total)}</Text></View>
          <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Confirmar pedido</Text>}</Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AdminProductsModal({ visible, products, onClose, onCreate, onEdit }: any) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <ModalHeader title="Produtos" onClose={onClose} />
        <View style={styles.adminTop}>
          <View><Text style={styles.adminTitle}>Catálogo da Drogaria</Text><Text style={styles.adminSubtitle}>{products.length} produto(s) cadastrado(s)</Text></View>
          <Pressable style={styles.adminNewButton} onPress={onCreate}><Ionicons name="add" size={20} color={COLORS.white} /><Text style={styles.adminNewButtonText}>Novo</Text></Pressable>
        </View>
        <FlatList
          data={products}
          keyExtractor={(item: Product) => String(item.id)}
          contentContainerStyle={styles.adminList}
          ListEmptyComponent={<View style={styles.emptyInline}><Ionicons name="cube-outline" size={52} color={COLORS.orange} /><Text style={styles.emptyTitle}>Nenhum produto cadastrado</Text><Text style={styles.emptyText}>Toque em “Novo” para cadastrar o primeiro.</Text></View>}
          renderItem={({ item }) => (
            <Pressable style={styles.adminProduct} onPress={() => onEdit(item)}>
              <View style={styles.adminProductImage}>{item.image_url ? <Image source={{ uri: item.image_url }} style={styles.adminProductImageReal} resizeMode="contain" /> : <Ionicons name="cube-outline" size={28} color={COLORS.orange} />}</View>
              <View style={{ flex: 1 }}><Text style={styles.adminProductName}>{item.name}</Text><Text style={styles.adminProductMeta}>{item.category} • {money(item.price)}</Text><Text style={[styles.adminStatus, { color: item.active === false ? COLORS.danger : COLORS.success }]}>{item.active === false ? 'Inativo' : 'Ativo'}</Text></View>
              <Ionicons name="create-outline" size={22} color={COLORS.black} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function ProductFormModal({ visible, product, onClose, onSaved }: any) {
  const empty: ProductForm = { name: '', description: '', category: '', price: '', badge: '', image_url: '', active: true };
  const [form, setForm] = useState<ProductForm>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(product ? {
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: String(product.price ?? ''),
      badge: product.badge || '',
      image_url: product.image_url || '',
      active: product.active !== false,
    } : empty);
  }, [visible, product]);

  const update = (key: keyof ProductForm, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const price = Number(form.price.replace(',', '.'));
    if (!form.name.trim() || !form.category.trim() || !Number.isFinite(price) || price < 0) return Alert.alert('Confira os dados', 'Nome, categoria e preço são obrigatórios.');
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      price,
      badge: form.badge.trim(),
      image_url: form.image_url.trim() || null,
      active: form.active,
    };
    const { error } = form.id
      ? await supabase.from('products').update(payload).eq('id', form.id)
      : await supabase.from('products').insert(payload);
    setBusy(false);
    if (error) return Alert.alert('Não foi possível salvar', error.message);
    Alert.alert('Produto salvo', form.id ? 'Alterações atualizadas.' : 'Produto cadastrado com sucesso.');
    onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalPage}>
        <ModalHeader title={form.id ? 'Editar produto' : 'Novo produto'} onClose={onClose} />
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Field label="Nome do produto" value={form.name} onChangeText={(v: string) => update('name', v)} />
          <Field label="Descrição" value={form.description} onChangeText={(v: string) => update('description', v)} multiline />
          <Field label="Categoria" value={form.category} onChangeText={(v: string) => update('category', v)} placeholder="Ex.: Medicamentos" />
          <Field label="Preço" value={form.price} onChangeText={(v: string) => update('price', v)} keyboardType="decimal-pad" placeholder="0,00" />
          <Field label="Selo / destaque" value={form.badge} onChangeText={(v: string) => update('badge', v)} placeholder="Ex.: Oferta" />
          <Field label="URL da imagem" value={form.image_url} onChangeText={(v: string) => update('image_url', v)} autoCapitalize="none" placeholder="https://..." />
          <View style={styles.switchRow}><View><Text style={styles.fieldLabel}>Produto ativo</Text><Text style={styles.switchHint}>Ativos aparecem no catálogo do cliente.</Text></View><Switch value={form.active} onValueChange={(v) => update('active', v)} trackColor={{ false: '#CCC', true: COLORS.orangeSoft }} thumbColor={form.active ? COLORS.orange : '#888'} /></View>
          <Pressable style={styles.primaryButton} onPress={save} disabled={busy}>{busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Salvar produto</Text>}</Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function BottomNav({ tab, setTab, cartCount }: { tab: Tab; setTab: (tab: Tab) => void; cartCount: number }) {
  const items: { id: Tab; label: string; icon: any; activeIcon: any }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline', activeIcon: 'home' },
    { id: 'catalog', label: 'Catálogo', icon: 'search-outline', activeIcon: 'search' },
    { id: 'cart', label: 'Carrinho', icon: 'bag-handle-outline', activeIcon: 'bag-handle' },
    { id: 'orders', label: 'Pedidos', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'account', label: 'Conta', icon: 'person-outline', activeIcon: 'person' },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <Pressable key={item.id} style={styles.navItem} onPress={() => setTab(item.id)}>
            <View>
              <Ionicons name={active ? item.activeIcon : item.icon} size={23} color={active ? COLORS.orange : COLORS.muted} />
              {item.id === 'cart' && cartCount > 0 && <View style={styles.navBadge}><Text style={styles.navBadgeText}>{cartCount}</Text></View>}
            </View>
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickAction({ icon, title, onPress }: any) {
  return <Pressable style={styles.quickAction} onPress={onPress}><View style={styles.quickIcon}><Ionicons name={icon} size={27} color={COLORS.orange} /></View><Text style={styles.quickTitle}>{title}</Text></Pressable>;
}

function SectionTitle({ title, action, onAction }: any) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{title}</Text>{action && <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable>}</View>;
}

function Field({ label, ...props }: any) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#9A9A9A" style={[styles.input, props.multiline && styles.inputMultiline]} /></View>;
}

function OptionRow({ options, value, onChange }: { options: string[][]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.optionRow}>{options.map(([id, label]) => <Pressable key={id} onPress={() => onChange(id)} style={[styles.option, value === id && styles.optionActive]}><Text style={[styles.optionText, value === id && styles.optionTextActive]}>{label}</Text></Pressable>)}</View>;
}

function ModalHeader({ title, onClose }: any) {
  return <View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.modalClose}><Ionicons name="close" size={24} color={COLORS.black} /></Pressable><Text style={styles.modalTitle}>{title}</Text><View style={{ width: 40 }} /></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  app: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 68, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  brandWrap: { height: 50, width: 155, justifyContent: 'center' },
  logo: { width: 150, height: 46 },
  headerCart: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', right: -2, top: -2, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  content: { flex: 1 },
  page: { padding: 18, paddingBottom: 36 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: COLORS.black, marginBottom: 18 },
  hero: { minHeight: 210, borderRadius: 24, backgroundColor: COLORS.black, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  heroText: { flex: 1 },
  heroEyebrow: { color: COLORS.orange, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginBottom: 8 },
  heroTitle: { color: COLORS.white, fontSize: 25, lineHeight: 30, fontWeight: '900' },
  heroSubtitle: { color: '#D7D7D7', fontSize: 14, lineHeight: 20, marginTop: 8 },
  heroButton: { marginTop: 16, alignSelf: 'flex-start', height: 44, borderRadius: 14, paddingHorizontal: 16, backgroundColor: COLORS.orange, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { color: COLORS.white, fontWeight: '800' },
  sectionTitle: { marginTop: 24, marginBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleText: { fontSize: 20, fontWeight: '900', color: COLORS.black },
  sectionAction: { color: COLORS.orangeDark, fontWeight: '800' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '48%', backgroundColor: COLORS.white, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { flex: 1, color: COLORS.black, fontWeight: '800', fontSize: 14 },
  horizontalProducts: { gap: 12, paddingRight: 18 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '48%', minHeight: 275, backgroundColor: COLORS.white, borderRadius: 20, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  productCardCompact: { width: 178 },
  productImageBox: { height: 105, borderRadius: 16, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  productImage: { width: '90%', height: '90%' },
  badge: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '900', color: COLORS.orangeDark, backgroundColor: COLORS.orangeSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, marginBottom: 7 },
  productName: { color: COLORS.black, fontSize: 15, fontWeight: '900', lineHeight: 19 },
  productDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  productBottom: { marginTop: 'auto', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { color: COLORS.black, fontSize: 16, fontWeight: '900', flex: 1 },
  addButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  searchBox: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  searchInput: { flex: 1, color: COLORS.black, fontSize: 15 },
  chips: { gap: 8, paddingVertical: 14 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipText: { color: COLORS.graphite, fontWeight: '700' },
  chipTextActive: { color: COLORS.white },
  emptyPage: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyInline: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 14, fontSize: 20, color: COLORS.black, fontWeight: '900', textAlign: 'center' },
  emptyText: { marginTop: 7, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  cartItem: { backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartItemIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  cartItemName: { color: COLORS.black, fontWeight: '800' },
  cartItemPrice: { color: COLORS.muted, marginTop: 4 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityText: { minWidth: 20, textAlign: 'center', fontWeight: '900', color: COLORS.black },
  totalCard: { backgroundColor: COLORS.black, borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 14 },
  totalLabel: { color: COLORS.muted, fontWeight: '700' },
  totalValue: { color: COLORS.orange, fontWeight: '900', fontSize: 21 },
  primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: COLORS.orange, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  secondaryButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryButtonText: { color: COLORS.black, fontWeight: '800' },
  orderCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  orderCode: { color: COLORS.black, fontWeight: '900', flex: 1 },
  orderStatus: { color: COLORS.orangeDark, fontWeight: '800', fontSize: 12 },
  orderMeta: { color: COLORS.muted, marginTop: 9 },
  orderTotal: { color: COLORS.black, fontSize: 18, fontWeight: '900', marginTop: 10 },
  accountCard: { backgroundColor: COLORS.black, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 55, height: 55, borderRadius: 18, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  accountName: { color: COLORS.white, fontSize: 19, fontWeight: '900' },
  accountEmail: { color: '#CFCFCF', marginTop: 4 },
  adminAccess: { marginTop: 14, borderRadius: 19, padding: 15, backgroundColor: COLORS.orangeSoft, borderWidth: 1, borderColor: '#FFD4B5', flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  adminAccessTitle: { color: COLORS.black, fontWeight: '900', fontSize: 16 },
  adminAccessText: { color: COLORS.muted, marginTop: 3, fontSize: 12 },
  authTabs: { flexDirection: 'row', padding: 4, backgroundColor: '#EEEEEE', borderRadius: 14, marginBottom: 16 },
  authTab: { flex: 1, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  authTabActive: { backgroundColor: COLORS.white },
  authTabText: { color: COLORS.muted, fontWeight: '800' },
  authTabTextActive: { color: COLORS.orangeDark },
  field: { marginBottom: 13 },
  fieldLabel: { color: COLORS.black, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 14, color: COLORS.black, fontSize: 15 },
  inputMultiline: { minHeight: 96, paddingTop: 13, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  option: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  optionActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  optionText: { color: COLORS.graphite, fontWeight: '800', fontSize: 12 },
  optionTextActive: { color: COLORS.white },
  checkoutTotal: { marginTop: 8, padding: 16, backgroundColor: COLORS.orangeSoft, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPage: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { height: 62, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  modalClose: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F1F1F1', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.black },
  modalContent: { padding: 18, paddingBottom: 40 },
  adminTop: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminTitle: { fontSize: 21, fontWeight: '900', color: COLORS.black },
  adminSubtitle: { color: COLORS.muted, marginTop: 4 },
  adminNewButton: { height: 44, borderRadius: 14, backgroundColor: COLORS.orange, paddingHorizontal: 14, flexDirection: 'row', gap: 5, alignItems: 'center' },
  adminNewButtonText: { color: COLORS.white, fontWeight: '900' },
  adminList: { paddingHorizontal: 18, paddingBottom: 35 },
  adminProduct: { backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminProductImage: { width: 54, height: 54, borderRadius: 14, backgroundColor: COLORS.orangeSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  adminProductImageReal: { width: '90%', height: '90%' },
  adminProductName: { color: COLORS.black, fontWeight: '900' },
  adminProductMeta: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  adminStatus: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  switchRow: { paddingVertical: 12, marginBottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchHint: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  bottomNav: { height: 72, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', paddingHorizontal: 4, paddingBottom: Platform.OS === 'ios' ? 5 : 0 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  navTextActive: { color: COLORS.orangeDark, fontWeight: '900' },
  navBadge: { position: 'absolute', right: -9, top: -6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
});
