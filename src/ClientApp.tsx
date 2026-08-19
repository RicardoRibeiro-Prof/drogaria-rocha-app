import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BannerCarousel from './components/BannerCarousel';
import { CATEGORIES, DEMO_PRODUCTS, Product } from './data/demoProducts';
import { supabase } from './lib/supabase';

type Tab = 'home' | 'catalog' | 'cart' | 'orders' | 'account';
type Cart = Record<number, number>;
type PaymentMethod = {
  code: string;
  label: string;
  instructions: string;
  pix_key?: string | null;
  sort_order: number;
};
type Order = {
  id?: string;
  code: string;
  store_id: number;
  fulfillment: string;
  payment_method: string;
  total: number;
  status: string;
  created_at: string;
};

const CART_KEY = '@drogaria-rocha/cart-live';
const LOCAL_ORDERS_KEY = '@drogaria-rocha/orders-live';
const C = {
  orange: '#F47A1F',
  orangeDark: '#D95F09',
  orangeSoft: '#FFF1E6',
  black: '#111111',
  white: '#FFFFFF',
  muted: '#727272',
  border: '#E8E8E8',
  bg: '#F7F7F7',
};
const money = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (v: string) => v.replace(/\D/g, '');
const STATUS: Record<string, string> = {
  received: 'Pedido recebido',
  confirmed: 'Confirmado',
  separating: 'Em separação',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function orderCode() {
  const d = new Date();
  return `DR${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function ClientApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState<Cart>({});
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkout, setCheckout] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,description,category,price,badge,image_url,active')
      .eq('active', true)
      .order('id');

    if (!error && data?.length) {
      setProducts(data.map((x: any) => ({ ...x, id: Number(x.id), price: Number(x.price || 0) })));
    } else {
      setProducts(DEMO_PRODUCTS);
    }
    setLoading(false);
  }, []);

  const loadProfile = useCallback(async (user: any) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('name,phone').eq('user_id', user.id).maybeSingle();
    setProfile(data || { name: user.user_metadata?.name || '', phone: user.user_metadata?.phone || '' });
  }, []);

  const loadOrders = useCallback(async () => {
    const localRaw = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
    const local: Order[] = localRaw ? JSON.parse(localRaw) : [];
    const { data: auth } = await supabase.auth.getSession();

    if (!auth.session?.user) {
      setOrders(local);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id,code,store_id,fulfillment,payment_method,total,status,created_at')
      .eq('user_id', auth.session.user.id)
      .order('created_at', { ascending: false });

    setOrders(error ? local : [...(data || []).map((x: any) => ({ ...x, total: Number(x.total || 0) })), ...local]);
  }, []);

  useEffect(() => {
    loadProducts();
    AsyncStorage.getItem(CART_KEY).then((value) => {
      if (!value) return;
      try {
        setCart(JSON.parse(value));
      } catch {
        AsyncStorage.removeItem(CART_KEY);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      loadProfile(next?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProducts, loadProfile]);

  useEffect(() => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders, session]);

  const categories = useMemo(
    () => Array.from(new Set([...CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])),
    [products],
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const term = search.trim().toLowerCase();
        return (
          (category === 'Todos' || p.category === category) &&
          (!term || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(term))
        );
      }),
    [products, search, category],
  );

  const cartItems = useMemo(
    () => products.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, quantity: cart[p.id] })),
    [products, cart],
  );
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const add = (p: Product) => setCart((current) => ({ ...current, [p.id]: (current[p.id] || 0) + 1 }));
  const qty = (id: number, delta: number) =>
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current, [id]: next };
      if (!next) delete updated[id];
      return updated;
    });

  return (
    <View style={s.app}>
      <View style={{ height: 68 + insets.top }} />
      <View style={s.content}>
        {tab === 'home' && (
          <Home
            products={products.slice(0, 6)}
            loading={loading}
            add={add}
            catalog={(cat?: string) => {
              if (cat) setCategory(cat);
              setTab('catalog');
            }}
          />
        )}
        {tab === 'catalog' && (
          <Catalog
            products={filtered}
            loading={loading}
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            categories={categories}
            add={add}
          />
        )}
        {tab === 'cart' && (
          <Cart
            items={cartItems}
            total={total}
            qty={qty}
            catalog={() => setTab('catalog')}
            checkout={() =>
              cartItems.length ? setCheckout(true) : Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.')
            }
          />
        )}
        {tab === 'orders' && <Orders orders={orders} />}
        {tab === 'account' && <Account session={session} profile={profile} />}
      </View>
      <Bottom tab={tab} setTab={setTab} count={count} />
      <Checkout
        visible={checkout}
        onClose={() => setCheckout(false)}
        items={cartItems}
        total={total}
        session={session}
        profile={profile}
        done={() => {
          setCart({});
          setCheckout(false);
          setTab('orders');
          loadOrders();
        }}
      />
    </View>
  );
}

function Home({ products, loading, add, catalog }: any) {
  return (
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroSmall}>DROGARIA ROCHA</Text>
          <Text style={s.heroTitle}>Cuidado e praticidade na palma da sua mão.</Text>
          <Text style={s.heroText}>Compre e acompanhe seus pedidos pelo aplicativo.</Text>
          <Pressable style={s.heroBtn} onPress={() => catalog()}>
            <Text style={s.heroBtnText}>Ver produtos</Text>
          </Pressable>
        </View>
        <Ionicons name="medkit" size={70} color={C.orange} />
      </View>

      <BannerCarousel />

      <Text style={s.section}>Acesso rápido</Text>
      <View style={s.quick}>
        <Quick icon="medical-outline" text="Medicamentos" onPress={() => catalog('Medicamentos')} />
        <Quick icon="sparkles-outline" text="Beleza" onPress={() => catalog('Dermocosméticos')} />
        <Quick icon="shield-checkmark-outline" text="Higiene" onPress={() => catalog('Higiene')} />
        <Quick icon="nutrition-outline" text="Vitaminas" onPress={() => catalog('Vitaminas')} />
      </View>

      <Text style={s.section}>Destaques</Text>
      {loading ? (
        <ActivityIndicator color={C.orange} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {products.map((p: Product) => (
            <ProductCard key={p.id} p={p} add={() => add(p)} compact />
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

function Quick({ icon, text, onPress }: any) {
  return (
    <Pressable style={s.quickItem} onPress={onPress}>
      <View style={s.quickIcon}>
        <Ionicons name={icon} size={25} color={C.orange} />
      </View>
      <Text style={s.quickText}>{text}</Text>
    </Pressable>
  );
}

function Catalog({ products, loading, search, setSearch, category, setCategory, categories, add }: any) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>Catálogo</Text>
      <View style={s.search}>
        <Ionicons name="search-outline" size={20} color={C.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produto..."
          placeholderTextColor="#999"
          style={{ flex: 1 }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 12 }}>
        {categories.map((x: string) => (
          <Pressable key={x} style={[s.chip, category === x && s.chipOn]} onPress={() => setCategory(x)}>
            <Text style={[s.chipText, category === x && { color: C.white }]}>{x}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={C.orange} />
      ) : (
        <View style={s.grid}>
          {products.map((p: Product) => (
            <ProductCard key={p.id} p={p} add={() => add(p)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ProductCard({ p, add, compact }: any) {
  return (
    <View style={[s.product, compact && { width: 175 }]}>
      <View style={s.productImg}>
        <Ionicons name="medical-outline" size={40} color={C.orange} />
      </View>
      {p.badge ? <Text style={s.badge}>{p.badge}</Text> : null}
      <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
      <Text style={s.productDesc} numberOfLines={2}>{p.description}</Text>
      <View style={s.productBottom}>
        <Text style={s.price}>{money(p.price)}</Text>
        <Pressable style={s.add} onPress={add}>
          <Ionicons name="add" size={21} color={C.white} />
        </Pressable>
      </View>
    </View>
  );
}

function Cart({ items, total, qty, catalog, checkout }: any) {
  if (!items.length) {
    return (
      <View style={s.empty}>
        <Ionicons name="bag-handle-outline" size={64} color={C.orange} />
        <Text style={s.emptyTitle}>Seu carrinho está vazio</Text>
        <Pressable style={s.primary} onPress={catalog}>
          <Text style={s.primaryText}>Ver catálogo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>Carrinho</Text>
      {items.map((x: any) => (
        <View style={s.cartItem} key={x.id}>
          <View style={{ flex: 1 }}>
            <Text style={s.productName}>{x.name}</Text>
            <Text style={s.muted}>{money(x.price)}</Text>
          </View>
          <View style={s.qty}>
            <Pressable onPress={() => qty(x.id, -1)}><Ionicons name="remove-circle-outline" size={26} /></Pressable>
            <Text style={{ fontWeight: '900' }}>{x.quantity}</Text>
            <Pressable onPress={() => qty(x.id, 1)}><Ionicons name="add-circle" size={26} color={C.orange} /></Pressable>
          </View>
        </View>
      ))}
      <View style={s.total}>
        <Text style={{ color: '#AAA' }}>Total</Text>
        <Text style={s.totalValue}>{money(total)}</Text>
      </View>
      <Pressable style={s.primary} onPress={checkout}>
        <Text style={s.primaryText}>Finalizar pedido</Text>
      </Pressable>
    </ScrollView>
  );
}

function Orders({ orders }: any) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>Meus pedidos</Text>
      {!orders.length ? (
        <View style={s.emptyInline}>
          <Ionicons name="receipt-outline" size={50} color={C.orange} />
          <Text style={s.emptyTitle}>Nenhum pedido ainda</Text>
        </View>
      ) : (
        orders.map((o: Order) => (
          <View key={`${o.id || o.code}-${o.created_at}`} style={s.order}>
            <View style={s.row}>
              <Text style={s.productName}>{o.code}</Text>
              <Text style={s.orderStatus}>{STATUS[o.status] || o.status}</Text>
            </View>
            <Text style={s.muted}>Loja {o.store_id} • {o.fulfillment === 'delivery' ? 'Entrega' : 'Retirada'}</Text>
            <Text style={s.orderTotal}>{money(o.total)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Account({ session, profile }: any) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (session?.user) {
    return (
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.title}>Minha conta</Text>
        <View style={s.account}>
          <View style={s.avatar}><Ionicons name="person" size={28} color={C.white} /></View>
          <View>
            <Text style={s.accountName}>{profile?.name || 'Cliente'}</Text>
            <Text style={s.accountEmail}>{session.user.email}</Text>
          </View>
        </View>
        <Pressable style={s.secondary} onPress={() => supabase.auth.signOut()}>
          <Text style={s.secondaryText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      return Alert.alert('Confira os dados', 'Informe e-mail e senha válidos.');
    }
    setBusy(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) Alert.alert('Login', 'Confira seu e-mail e senha.');
      return;
    }

    if (!name.trim() || digits(phone).length < 10) {
      setBusy(false);
      return Alert.alert('Cadastro', 'Informe nome e telefone.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), phone: phone.trim() } },
    });
    if (!error && data.user) {
      await supabase.from('profiles').upsert(
        { user_id: data.user.id, name: name.trim(), phone: phone.trim() },
        { onConflict: 'user_id' },
      );
    }
    setBusy(false);
    if (error) Alert.alert('Cadastro', error.message);
    else if (!data.session) Alert.alert('Conta criada', 'Confira seu e-mail para confirmar.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
        <View style={s.authTabs}>
          <Pressable style={[s.authTab, mode === 'login' && s.authOn]} onPress={() => setMode('login')}>
            <Text>Entrar</Text>
          </Pressable>
          <Pressable style={[s.authTab, mode === 'register' && s.authOn]} onPress={() => setMode('register')}>
            <Text>Criar conta</Text>
          </Pressable>
        </View>
        {mode === 'register' ? (
          <>
            <Field label="Nome" value={name} onChangeText={setName} />
            <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </>
        ) : null}
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <Pressable style={s.primary} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={C.white} /> : <Text style={s.primaryText}>{mode === 'login' ? 'Entrar' : 'Cadastrar'}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Checkout({ visible, onClose, items, total, session, profile, done }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [store, setStore] = useState(1);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payment, setPayment] = useState('');
  const [changeFor, setChangeFor] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(profile?.name || session?.user?.user_metadata?.name || '');
    setPhone(profile?.phone || session?.user?.user_metadata?.phone || '');
    (async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('code,label,instructions,pix_key,sort_order')
        .eq('active', true)
        .order('sort_order');
      const list: PaymentMethod[] = !error && data?.length
        ? (data as PaymentMethod[])
        : [
            { code: 'pix', label: 'PIX', instructions: '', sort_order: 1 },
            { code: 'cash', label: 'Dinheiro', instructions: '', sort_order: 2 },
            { code: 'credit', label: 'Crédito', instructions: '', sort_order: 3 },
            { code: 'debit', label: 'Débito', instructions: '', sort_order: 4 },
          ];
      setMethods(list);
      setPayment(list[0]?.code || '');
    })();
  }, [visible, profile, session]);

  const selected = methods.find((m) => m.code === payment);

  const submit = async () => {
    if (!name.trim() || digits(phone).length < 10) return Alert.alert('Confira os dados', 'Informe nome e telefone.');
    if (fulfillment === 'delivery' && !address.trim()) return Alert.alert('Endereço', 'Informe o endereço.');
    if (!payment) return Alert.alert('Pagamento', 'Escolha uma forma de pagamento.');

    const change = payment === 'cash' && changeFor.trim() ? Number(changeFor.replace(',', '.')) : null;
    if (payment === 'cash' && change !== null && (!Number.isFinite(change) || change < total)) {
      return Alert.alert('Troco', 'O valor para troco precisa ser maior ou igual ao total.');
    }

    setBusy(true);
    const code = orderCode();
    const payload = {
      code,
      user_id: session?.user?.id || null,
      customer_name: name.trim(),
      phone: phone.trim(),
      email: session?.user?.email || null,
      store_id: store,
      fulfillment,
      address: fulfillment === 'delivery' ? address.trim() : null,
      payment_method: payment,
      change_for: change,
      notes: selected?.instructions || null,
      subtotal: total,
      delivery_fee: 0,
      total,
      status: 'received',
    };

    const { data: order, error } = await supabase.from('orders').insert(payload).select('id').single();
    if (!error && order?.id) {
      await supabase.from('order_items').insert(
        items.map((x: any) => ({
          order_id: order.id,
          product_id: x.id,
          product_name: x.name,
          quantity: x.quantity,
          unit_price: x.price,
          total: x.price * x.quantity,
        })),
      );
    } else {
      const raw = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
      const local = raw ? JSON.parse(raw) : [];
      local.unshift({ ...payload, created_at: new Date().toISOString(), local: true });
      await AsyncStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(local.slice(0, 50)));
    }

    setBusy(false);
    let msg = `Número ${code}`;
    if (payment === 'pix' && selected?.pix_key) msg += `\n\nChave PIX: ${selected.pix_key}`;
    if (selected?.instructions) msg += `\n${selected.instructions}`;
    Alert.alert('Pedido recebido', msg);
    done();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Finalizar pedido</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={26} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={s.fieldLabel}>Loja</Text>
          <Options options={[["1", "Loja 1"], ["2", "Loja 2"]]} value={String(store)} onChange={(v: string) => setStore(Number(v))} />
          <Text style={s.fieldLabel}>Recebimento</Text>
          <Options options={[["delivery", "Entrega"], ["pickup", "Retirada"]]} value={fulfillment} onChange={(v: string) => setFulfillment(v as any)} />
          {fulfillment === 'delivery' ? <Field label="Endereço" value={address} onChangeText={setAddress} /> : null}
          <Text style={s.fieldLabel}>Pagamento</Text>
          <View style={s.paymentList}>
            {methods.map((m) => (
              <Pressable key={m.code} style={[s.paymentOption, payment === m.code && s.paymentOn]} onPress={() => setPayment(m.code)}>
                <Ionicons
                  name={m.code === 'pix' ? 'qr-code-outline' : m.code === 'cash' ? 'cash-outline' : 'card-outline'}
                  size={21}
                  color={payment === m.code ? C.white : C.orange}
                />
                <Text style={[s.paymentLabel, payment === m.code && { color: C.white }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          {selected?.instructions ? (
            <View style={s.instructions}>
              <Text style={s.instructionsText}>{selected.instructions}</Text>
              {payment === 'pix' && selected.pix_key ? <Text style={s.pixKey}>Chave PIX: {selected.pix_key}</Text> : null}
            </View>
          ) : null}
          {payment === 'cash' ? (
            <Field label="Troco para quanto? (opcional)" value={changeFor} onChangeText={setChangeFor} keyboardType="decimal-pad" placeholder={money(total)} />
          ) : null}
          <View style={s.checkoutTotal}>
            <Text>Total</Text>
            <Text style={s.checkoutValue}>{money(total)}</Text>
          </View>
          <Pressable style={s.primary} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={C.white} /> : <Text style={s.primaryText}>Confirmar pedido</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#999" style={s.input} />
    </View>
  );
}

function Options({ options, value, onChange }: any) {
  return (
    <View style={s.options}>
      {options.map(([id, label]: string[]) => (
        <Pressable key={id} style={[s.option, value === id && s.optionOn]} onPress={() => onChange(id)}>
          <Text style={[s.optionText, value === id && { color: C.white }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Bottom({ tab, setTab, count }: any) {
  const inset = useSafeAreaInsets();
  const items = [
    ['home', 'Início', 'home-outline'],
    ['catalog', 'Catálogo', 'search-outline'],
    ['cart', 'Carrinho', 'bag-handle-outline'],
    ['orders', 'Pedidos', 'receipt-outline'],
    ['account', 'Conta', 'person-outline'],
  ];
  return (
    <View style={[s.bottom, { paddingBottom: Math.max(inset.bottom, 6) }]}>
      {items.map(([id, label, icon]) => (
        <Pressable key={id} style={s.nav} onPress={() => setTab(id)}>
          <View>
            <Ionicons name={icon as any} size={23} color={tab === id ? C.orange : C.muted} />
            {id === 'cart' && count > 0 ? (
              <View style={s.navBadge}><Text style={s.navBadgeText}>{count}</Text></View>
            ) : null}
          </View>
          <Text style={[s.navText, tab === id && { color: C.orange }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1 },
  page: { padding: 18, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '900', color: C.black, marginBottom: 16 },
  hero: { backgroundColor: C.black, borderRadius: 23, padding: 20, minHeight: 205, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroSmall: { color: C.orange, fontSize: 11, fontWeight: '900' },
  heroTitle: { color: C.white, fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 7 },
  heroText: { color: '#CCC', fontSize: 13, lineHeight: 18, marginTop: 7 },
  heroBtn: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: C.orange, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11 },
  heroBtnText: { color: C.white, fontWeight: '900' },
  section: { fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 11, color: C.black },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  quickItem: { width: '48%', backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontWeight: '800', fontSize: 12, flex: 1 },
  search: { height: 50, borderRadius: 15, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  chipOn: { backgroundColor: C.black, borderColor: C.black },
  chipText: { fontSize: 11, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  product: { width: '48%', minHeight: 250, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 12 },
  productImg: { height: 94, borderRadius: 14, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', marginTop: 7, fontSize: 9, fontWeight: '900', color: C.orangeDark, backgroundColor: C.orangeSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  productName: { fontSize: 14, fontWeight: '900', color: C.black, marginTop: 7 },
  productDesc: { fontSize: 11, color: C.muted, marginTop: 3 },
  productBottom: { marginTop: 'auto', paddingTop: 9, flexDirection: 'row', alignItems: 'center' },
  price: { fontWeight: '900', fontSize: 15, flex: 1 },
  add: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  emptyInline: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 19, fontWeight: '900', marginTop: 10 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 13 },
  primaryText: { color: C.white, fontWeight: '900' },
  cartItem: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  muted: { fontSize: 12, color: C.muted, marginTop: 4 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  total: { backgroundColor: C.black, borderRadius: 16, padding: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
  totalValue: { color: C.orange, fontWeight: '900', fontSize: 21 },
  order: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 9 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderStatus: { color: C.orangeDark, fontWeight: '900', fontSize: 11 },
  orderTotal: { fontWeight: '900', fontSize: 17, marginTop: 8 },
  account: { backgroundColor: C.black, borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  accountName: { color: C.white, fontWeight: '900', fontSize: 17 },
  accountEmail: { color: '#CCC', fontSize: 12, marginTop: 3 },
  secondary: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  secondaryText: { fontWeight: '900' },
  authTabs: { flexDirection: 'row', backgroundColor: '#EEE', padding: 4, borderRadius: 13, marginBottom: 14 },
  authTab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  authOn: { backgroundColor: C.white },
  fieldLabel: { fontSize: 12, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, color: C.black },
  modal: { flex: 1, backgroundColor: C.bg },
  modalHeader: { height: 62, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  options: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  option: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  optionOn: { backgroundColor: C.black, borderColor: C.black },
  optionText: { fontSize: 11, fontWeight: '800' },
  paymentList: { gap: 8, marginBottom: 12 },
  paymentOption: { minHeight: 48, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  paymentOn: { backgroundColor: C.black, borderColor: C.black },
  paymentLabel: { fontWeight: '900' },
  instructions: { padding: 12, borderRadius: 13, backgroundColor: C.orangeSoft, marginBottom: 12 },
  instructionsText: { fontSize: 11, color: '#333', lineHeight: 16 },
  pixKey: { fontSize: 12, fontWeight: '900', color: C.orangeDark, marginTop: 6 },
  checkoutTotal: { padding: 15, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutValue: { fontSize: 20, fontWeight: '900', color: C.orange },
  bottom: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', paddingTop: 7 },
  nav: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navText: { fontSize: 9, fontWeight: '800', color: C.muted },
  navBadge: { position: 'absolute', right: -9, top: -6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { color: C.white, fontSize: 9, fontWeight: '900' },
});
