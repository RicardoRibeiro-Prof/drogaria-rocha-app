import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { DEMO_PRODUCTS, Product } from './data/demoProducts';
import { supabase } from './lib/supabase';

type Tab = 'home' | 'catalog' | 'cart' | 'account';
type Cart = Record<number, number>;
type SortMode = 'featured' | 'priceAsc' | 'priceDesc' | 'az';
type AppProduct = Product & { code?: string | null };
type Review = {
  id: number;
  product_id: number;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

const CART_KEY = '@drogaria-rocha/cart-live';
const WHATSAPP_NUMBER = '5589981485863';
const C = {
  orange:'#F47A1F',
  orangeDark:'#D95F09',
  orangeSoft:'#FFF1E6',
  black:'#111111',
  white:'#FFFFFF',
  muted:'#727272',
  border:'#E8E8E8',
  bg:'#F7F7F7',
  whatsapp:'#198754',
  star:'#F6B800',
  green:'#198754',
};
const CATEGORY_ORDER = [
  'Todos','Dermocosméticos','Protetores Solares','Hidratantes','Sabonetes e Limpeza',
  'Higiene Bucal','Higiene Pessoal','Infantil','Cuidados Femininos','Desodorantes',
  'Cabelos','Perfumaria','Repelentes','Vitaminas','Primeiros Socorros','Medicamentos',
];
const money = (v:number) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const digits = (v:string) => v.replace(/\D/g,'');
const shortReviewerName = (name:string) => {
  const parts=String(name||'Cliente').trim().split(/\s+/).filter(Boolean);
  if(parts.length<=1)return parts[0]||'Cliente';
  return `${parts[0]} ${parts[parts.length-1].charAt(0).toUpperCase()}.`;
};
const reviewDate = (iso:string) => {
  try{return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});}catch{return '';}
};

export default function ClientApp() {
  const insets = useSafeAreaInsets();
  const [tab,setTab] = useState<Tab>('home');
  const [products,setProducts] = useState<AppProduct[]>(DEMO_PRODUCTS);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('Todos');
  const [sort,setSort] = useState<SortMode>('featured');
  const [cart,setCart] = useState<Cart>({});
  const [session,setSession] = useState<any>(null);
  const [profile,setProfile] = useState<any>(null);
  const [selectedProduct,setSelectedProduct] = useState<AppProduct|null>(null);

  const loadProducts = useCallback(async()=>{
    setLoading(true);
    const {data,error} = await supabase
      .from('products')
      .select('id,name,description,category,price,badge,image_url,active,code')
      .eq('active',true)
      .order('id');
    if(!error && data?.length) setProducts(data.map((x:any)=>({...x,id:Number(x.id),price:Number(x.price||0)})));
    else setProducts(DEMO_PRODUCTS);
    setLoading(false);
  },[]);

  const loadProfile = useCallback(async(user:any)=>{
    if(!user){ setProfile(null); return; }
    const {data} = await supabase.from('profiles').select('name,phone').eq('user_id',user.id).maybeSingle();
    setProfile(data || {name:user.user_metadata?.name||'',phone:user.user_metadata?.phone||''});
  },[]);

  useEffect(()=>{
    loadProducts();
    AsyncStorage.getItem(CART_KEY).then(v=>{ if(v) try{ setCart(JSON.parse(v)); } catch { AsyncStorage.removeItem(CART_KEY); } });
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); loadProfile(data.session?.user); });
    const {data:l} = supabase.auth.onAuthStateChange((_e,next)=>{ setSession(next); loadProfile(next?.user); });
    return ()=>l.subscription.unsubscribe();
  },[loadProducts,loadProfile]);

  useEffect(()=>{ AsyncStorage.setItem(CART_KEY,JSON.stringify(cart)); },[cart]);

  const categories = useMemo(()=>{
    const available = new Set(products.map(p=>p.category).filter(Boolean));
    const ordered = CATEGORY_ORDER.filter(x=>x==='Todos'||available.has(x));
    const extras = Array.from(available).filter(x=>!CATEGORY_ORDER.includes(x)).sort();
    return [...ordered,...extras];
  },[products]);

  const filtered = useMemo(()=>{
    const t=search.trim().toLowerCase();
    const list=products.filter(p=>(category==='Todos'||p.category===category) && (!t || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(t)));
    if(sort==='priceAsc') return [...list].sort((a,b)=>a.price-b.price);
    if(sort==='priceDesc') return [...list].sort((a,b)=>b.price-a.price);
    if(sort==='az') return [...list].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    return list;
  },[products,search,category,sort]);

  const cartItems = useMemo(()=>products.filter(p=>cart[p.id]>0).map(p=>({...p,quantity:cart[p.id]})),[products,cart]);
  const count = cartItems.reduce((s,x)=>s+x.quantity,0);
  const total = cartItems.reduce((s,x)=>s+x.price*x.quantity,0);
  const add = (p:AppProduct)=>setCart(c=>({...c,[p.id]:(c[p.id]||0)+1}));
  const qty = (id:number,delta:number)=>setCart(c=>{ const n=Math.max(0,(c[id]||0)+delta); const u={...c,[id]:n}; if(!n) delete u[id]; return u; });

  const openCatalog = (cat='Todos') => {
    setSearch('');
    setSort('featured');
    setCategory(cat || 'Todos');
    setTab('catalog');
  };

  const sendCartToWhatsApp = async() => {
    if(!cartItems.length) return Alert.alert('Carrinho vazio','Adicione produtos antes de finalizar.');
    if(!session?.user){
      Alert.alert('Entre na sua conta','Para finalizar a compra pelo WhatsApp, é necessário estar logado.',[
        {text:'Cancelar',style:'cancel'},
        {text:'Entrar',onPress:()=>setTab('account')},
      ]);
      return;
    }

    const customerName = profile?.name || session.user.user_metadata?.name || 'Cliente';
    const customerPhone = profile?.phone || session.user.user_metadata?.phone || '';
    const lines = cartItems.map((x:any,index:number)=>`${index+1}. ${x.name}\nQtd: ${x.quantity} | Unitário: ${money(x.price)} | Subtotal: ${money(x.price*x.quantity)}`).join('\n\n');
    let message = `Olá! Sou ${customerName}. Quero finalizar este pedido da Drogaria Rocha:\n\n${lines}\n\nTOTAL: ${money(total)}`;
    if(customerPhone) message += `\nTelefone: ${customerPhone}`;
    message += '\n\nOs preços acima são os valores exibidos no aplicativo. Pode confirmar a disponibilidade dos itens para concluirmos a compra?';

    try{
      await Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
    }catch{
      Alert.alert('WhatsApp','Não foi possível abrir o WhatsApp neste aparelho.');
    }
  };

  return <View style={s.app}>
    <View style={{height:68+insets.top}} />
    <View style={s.content}>
      {tab==='home'&&<Home products={products} loading={loading} add={add} openProduct={setSelectedProduct} catalog={openCatalog}/>}
      {tab==='catalog'&&<Catalog products={filtered} loading={loading} search={search} setSearch={setSearch} category={category} setCategory={setCategory} categories={categories} sort={sort} setSort={setSort} add={add} openProduct={setSelectedProduct}/>} 
      {tab==='cart'&&<Cart items={cartItems} total={total} qty={qty} catalog={()=>openCatalog('Todos')} checkout={sendCartToWhatsApp} session={session} account={()=>setTab('account')}/>} 
      {tab==='account'&&<Account session={session} profile={profile}/>} 
    </View>
    <Bottom tab={tab} setTab={setTab} count={count}/>
    <ProductDetail
      visible={!!selectedProduct}
      product={selectedProduct}
      session={session}
      profile={profile}
      cartCount={count}
      onClose={()=>setSelectedProduct(null)}
      add={(p:AppProduct)=>add(p)}
    />
  </View>;
}

function Home({products,loading,add,openProduct,catalog}:any){
  const featured=useMemo(()=>{
    const marked=products.filter((p:AppProduct)=>Boolean(p.badge));
    const newest=[...products].reverse();
    const ids=new Set(marked.map((p:AppProduct)=>p.id));
    return [...marked,...newest.filter((p:AppProduct)=>!ids.has(p.id))].slice(0,8);
  },[products]);

  const sections=[
    ['Infantil','Infantil'],
    ['Dermocosméticos','Dermocosméticos'],
    ['Protetores Solares','Protetores Solares'],
    ['Hidratantes','Hidratantes'],
    ['Sabonetes e Limpeza','Sabonetes e Limpeza'],
    ['Cuidados com os Cabelos','Cabelos'],
    ['Perfumaria','Perfumaria'],
  ];

  return <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
    <View style={s.hero}><View style={{flex:1}}><Text style={s.heroSmall}>DROGARIA ROCHA</Text><Text style={s.heroTitle}>Cuidado e praticidade na palma da sua mão.</Text><Text style={s.heroText}>Escolha seus produtos e finalize a compra pelo WhatsApp.</Text><Pressable style={s.heroBtn} onPress={()=>catalog('Todos')}><Text style={s.heroBtnText}>Ver produtos</Text></Pressable></View><Ionicons name="medkit" size={70} color={C.orange}/></View>
    <Text style={s.section}>Acesso rápido</Text><View style={s.quick}><Quick icon="happy-outline" text="Infantil" onPress={()=>catalog('Infantil')}/><Quick icon="sparkles-outline" text="Dermocosméticos" onPress={()=>catalog('Dermocosméticos')}/><Quick icon="sunny-outline" text="Protetores" onPress={()=>catalog('Protetores Solares')}/><Quick icon="water-outline" text="Hidratantes" onPress={()=>catalog('Hidratantes')}/></View>
    {loading?<ActivityIndicator style={{marginTop:26}} color={C.orange}/>:<>
      <HomeSection title="Destaques" products={featured} onMore={()=>catalog('Todos')} add={add} openProduct={openProduct}/>
      {sections.map(([title,cat])=>{
        const list=products.filter((p:AppProduct)=>p.category===cat).slice(0,8);
        return <HomeSection key={cat} title={title} products={list} onMore={()=>catalog(cat)} add={add} openProduct={openProduct}/>;
      })}
    </>}
  </ScrollView>;
}

function HomeSection({title,products,onMore,add,openProduct}:any){
  if(!products?.length)return null;
  return <View style={s.homeSection}>
    <View style={s.homeSectionHeader}>
      <Text style={s.homeSectionTitle}>{title}</Text>
      <Pressable style={s.seeMore} onPress={onMore}><Text style={s.seeMoreText}>Ver mais</Text><Ionicons name="chevron-forward" size={15} color={C.orangeDark}/></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.homeCarousel}>
      {products.map((p:AppProduct)=><ProductCard key={p.id} p={p} add={()=>add(p)} open={()=>openProduct(p)} compact/>)}
    </ScrollView>
  </View>;
}

function Quick({icon,text,onPress}:any){return <Pressable style={s.quickItem} onPress={onPress}><View style={s.quickIcon}><Ionicons name={icon} size={25} color={C.orange}/></View><Text style={s.quickText}>{text}</Text></Pressable>}

function Catalog({products,loading,search,setSearch,category,setCategory,categories,sort,setSort,add,openProduct}:any){
  const sorts:[SortMode,string][]=[['featured','Padrão'],['priceAsc','Menor preço'],['priceDesc','Maior preço'],['az','A–Z']];
  const hasFilters=category!=='Todos'||search.trim()||sort!=='featured';
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>Catálogo</Text>
    <View style={s.search}><Ionicons name="search-outline" size={20} color={C.muted}/><TextInput value={search} onChangeText={setSearch} placeholder="Buscar produto..." placeholderTextColor="#999" style={{flex:1}}/>{search?<Pressable onPress={()=>setSearch('')}><Ionicons name="close-circle" size={20} color={C.muted}/></Pressable>:null}</View>
    <Text style={s.filterLabel}>Categorias</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:10}}>{categories.map((x:string)=><Pressable key={x} style={[s.chip,category===x&&s.chipOn]} onPress={()=>setCategory(x)}><Text style={[s.chipText,category===x&&{color:C.white}]}>{x}</Text></Pressable>)}</ScrollView>
    <Text style={s.filterLabel}>Ordenar</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortRow}>{sorts.map(([id,label])=><Pressable key={id} style={[s.sortChip,sort===id&&s.sortChipOn]} onPress={()=>setSort(id)}><Text style={[s.sortText,sort===id&&{color:C.orangeDark}]}>{label}</Text></Pressable>)}</ScrollView>
    <View style={s.catalogSummary}><Text style={s.resultCount}>{loading?'Carregando...':`${products.length} ${products.length===1?'produto':'produtos'}`}</Text>{hasFilters?<Pressable onPress={()=>{setCategory('Todos');setSearch('');setSort('featured');}}><Text style={s.clearFilters}>Limpar filtros</Text></Pressable>:null}</View>
    {loading?<ActivityIndicator color={C.orange}/>:products.length?<View style={s.grid}>{products.map((p:AppProduct)=><ProductCard key={p.id} p={p} add={()=>add(p)} open={()=>openProduct(p)}/>)}</View>:<View style={s.emptyCatalog}><Ionicons name="search-outline" size={42} color={C.orange}/><Text style={s.emptyTitle}>Nenhum produto encontrado</Text><Text style={s.muted}>Tente outra categoria ou limpe os filtros.</Text></View>}
  </ScrollView>;
}

function ProductImage({uri,style}:any){
  const[failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[uri]);
  if(!uri||failed) return <View style={[style,s.imageFallback]}><Ionicons name="medical-outline" size={40} color={C.orange}/></View>;
  return <ExpoImage key={uri} source={uri} style={style} contentFit="contain" cachePolicy="memory-disk" recyclingKey={uri} transition={120} onError={()=>setFailed(true)}/>;
}

function ProductCard({p,add,open,compact}:any){
  return <Pressable style={[s.product,compact&&s.productCompact]} onPress={open}>
    <View style={s.productImg}><ProductImage uri={p.image_url} style={s.productImageReal}/></View>
    {p.badge?<Text style={s.badge}>{p.badge}</Text>:null}
    <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
    <Text style={s.productDesc} numberOfLines={2}>{p.description}</Text>
    <View style={s.productBottom}>
      <Text style={s.price}>{money(p.price)}</Text>
      <Pressable style={s.add} onPress={(event)=>{event.stopPropagation();add();}}><Ionicons name="add" size={21} color={C.white}/></Pressable>
    </View>
    <Text style={s.detailsHint}>Toque para ver detalhes</Text>
  </Pressable>;
}

function Stars({value,size=18,onChange}:any){
  return <View style={s.starsRow}>{[1,2,3,4,5].map(n=>{
    const icon=n<=Math.round(Number(value)||0)?'star':'star-outline';
    if(onChange)return <Pressable key={n} onPress={()=>onChange(n)} hitSlop={5}><Ionicons name={icon} size={size} color={C.star}/></Pressable>;
    return <Ionicons key={n} name={icon} size={size} color={C.star}/>;
  })}</View>;
}

function ProductDetail({visible,product,onClose,add,session,profile,cartCount}:any){
  const[detailImageFailed,setDetailImageFailed]=useState(false);
  const[reviews,setReviews]=useState<Review[]>([]);
  const[reviewsLoading,setReviewsLoading]=useState(false);
  const[reviewRating,setReviewRating]=useState(0);
  const[reviewComment,setReviewComment]=useState('');
  const[savingReview,setSavingReview]=useState(false);

  const loadReviews=useCallback(async()=>{
    if(!product?.id)return;
    setReviewsLoading(true);
    const{data,error}=await supabase
      .from('product_reviews')
      .select('id,product_id,user_id,reviewer_name,rating,comment,created_at')
      .eq('product_id',product.id)
      .order('created_at',{ascending:false});
    const list=!error&&data?data.map((x:any)=>({...x,id:Number(x.id),product_id:Number(x.product_id),rating:Number(x.rating)})):[];
    setReviews(list);
    const mine=session?.user?.id?list.find((x:Review)=>x.user_id===session.user.id):null;
    setReviewRating(mine?.rating||0);
    setReviewComment(mine?.comment||'');
    setReviewsLoading(false);
  },[product?.id,session?.user?.id]);

  useEffect(()=>{
    setDetailImageFailed(false);
    if(visible&&product?.id)loadReviews();
  },[product?.id,product?.image_url,visible,loadReviews]);

  const saveReview=async()=>{
    if(!session?.user)return Alert.alert('Entre na sua conta','É necessário estar logado para avaliar um produto.');
    if(reviewRating<1)return Alert.alert('Avaliação','Escolha de 1 a 5 estrelas.');
    setSavingReview(true);
    const rawName=profile?.name||session.user.user_metadata?.name||'Cliente';
    const payload={
      product_id:product.id,
      user_id:session.user.id,
      reviewer_name:shortReviewerName(rawName),
      rating:reviewRating,
      comment:reviewComment.trim(),
      updated_at:new Date().toISOString(),
    };
    const{error}=await supabase.from('product_reviews').upsert(payload,{onConflict:'product_id,user_id'});
    setSavingReview(false);
    if(error)return Alert.alert('Avaliação','Não foi possível salvar sua avaliação agora.');
    await loadReviews();
    Alert.alert('Obrigado!','Sua avaliação foi salva.');
  };

  if(!product)return null;

  const average=reviews.length?reviews.reduce((sum,x)=>sum+x.rating,0)/reviews.length:0;
  const recommend=reviews.length?Math.round((reviews.filter(x=>x.rating>=4).length/reviews.length)*100):0;
  const detailImageUri=product.image_url?`${product.image_url}${product.image_url.includes('?')?'&':'?'}detail=${product.id}`:'';

  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={s.modal} edges={['top','bottom','left','right']}>
      <View style={s.detailHeader}>
        <Pressable style={s.backBtn} onPress={onClose}><Ionicons name="arrow-back" size={25} color={C.black}/></Pressable>
        <Text style={s.detailHeaderTitle}>Detalhes do produto</Text>
        <View style={s.detailCartIcon}><Ionicons name="bag-handle-outline" size={25} color={C.black}/>{cartCount>0?<View style={s.detailCartBadge}><Text style={s.detailCartBadgeText}>{cartCount}</Text></View>:null}</View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={s.detailPage} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.detailImageBox}>
          {detailImageUri&&!detailImageFailed?<Image key={`${product.id}-${detailImageUri}`} source={{uri:detailImageUri}} style={s.detailImage} resizeMode="contain" onError={()=>setDetailImageFailed(true)}/>:<View style={[s.detailImage,s.imageFallback]}><Ionicons name="medical-outline" size={58} color={C.orange}/></View>}
        </View>

        <View style={s.detailMetaRow}>
          <Text style={s.detailCategory}>{product.category}</Text>
          {product.code?<Text style={s.detailSku}>SKU: {product.code}</Text>:null}
        </View>
        {product.badge?<Text style={s.detailBadge}>{product.badge}</Text>:null}
        <Text style={s.detailName}>{product.name}</Text>
        <Text style={s.detailSeller}>Vendido por <Text style={{fontWeight:'900'}}>Drogaria Rocha</Text></Text>
        <Text style={s.detailDescriptionTop}>{product.description?.trim()||'Informações do produto disponíveis no atendimento da Drogaria Rocha.'}</Text>

        <View style={s.priceCard}>
          <View><Text style={s.priceCardLabel}>Preço no aplicativo</Text><Text style={s.priceCardValue}>{money(product.price)}</Text></View>
          <View style={s.priceCardTag}><Ionicons name="checkmark-circle" size={16} color={C.green}/><Text style={s.priceCardTagText}>Preço do pedido</Text></View>
        </View>

        <View style={s.detailSection}>
          <Text style={s.detailSectionTitle}>Descrição</Text>
          <Text style={s.detailDescription}>{product.description?.trim() || 'Descrição não informada.'}</Text>
        </View>

        {product.category==='Medicamentos'?<View style={s.detailInfo}><Ionicons name="information-circle-outline" size={21} color={C.orange}/><Text style={s.detailInfoText}>A dispensação de medicamentos segue as exigências legais e pode depender de análise de receita.</Text></View>:null}

        <View style={s.reviewSection}>
          <Text style={s.reviewTitle}>Avaliações dos clientes</Text>
          {reviewsLoading?<ActivityIndicator color={C.orange} style={{marginVertical:24}}/>:<>
            {reviews.length?<>
              <View style={s.reviewSummary}>
                <View style={{flex:1}}><View style={s.reviewScoreLine}><Text style={s.reviewScore}>{average.toFixed(1)}</Text><Stars value={average} size={25}/></View><Text style={s.reviewBased}>Baseado em {reviews.length} {reviews.length===1?'avaliação':'avaliações'}</Text></View>
                <View style={s.recommendCircle}><Text style={s.recommendNumber}>{recommend}%</Text><Text style={s.recommendLabel}>recomendam</Text></View>
              </View>
              <View style={s.histogram}>
                {[5,4,3,2,1].map(star=>{
                  const amount=reviews.filter(x=>x.rating===star).length;
                  const pct=reviews.length?(amount/reviews.length)*100:0;
                  return <View key={star} style={s.histRow}><View style={s.histStars}><Text style={s.histNumber}>{star}</Text><Ionicons name="star" size={14} color={C.star}/></View><View style={s.histTrack}><View style={[s.histFill,{width:`${pct}%`}]} /></View><Text style={s.histCount}>{amount}</Text></View>;
                })}
              </View>
            </>:<View style={s.noReviews}><Ionicons name="chatbox-ellipses-outline" size={36} color={C.orange}/><Text style={s.noReviewsTitle}>Ainda sem avaliações</Text><Text style={s.noReviewsText}>Se você já conhece este produto, seja o primeiro a avaliá-lo.</Text></View>}

            <View style={s.reviewForm}>
              <Text style={s.reviewFormTitle}>{session?.user?'Sua avaliação':'Quer avaliar este produto?'}</Text>
              {session?.user?<>
                <Text style={s.reviewFormHint}>Toque nas estrelas para dar sua nota.</Text>
                <Stars value={reviewRating} size={31} onChange={setReviewRating}/>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Conte como foi sua experiência com o produto..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={1000}
                  style={s.reviewInput}
                />
                <Pressable style={s.reviewButton} onPress={saveReview} disabled={savingReview}>{savingReview?<ActivityIndicator color={C.white}/>:<Text style={s.reviewButtonText}>Salvar avaliação</Text>}</Pressable>
              </>:<View style={s.reviewLoginNote}><Ionicons name="person-circle-outline" size={22} color={C.orange}/><Text style={s.reviewLoginText}>Entre na sua conta para publicar uma avaliação.</Text></View>}
            </View>

            {reviews.length?<View style={s.reviewList}>
              <Text style={s.reviewListTitle}>Principais avaliações</Text>
              {reviews.map(r=><View key={r.id} style={s.reviewCard}>
                <View style={s.reviewCardTop}><Text style={s.reviewerName}>{r.reviewer_name||'Cliente'}</Text><Text style={s.reviewDate}>{reviewDate(r.created_at)}</Text></View>
                <Stars value={r.rating} size={19}/>
                {r.comment?<Text style={s.reviewComment}>{r.comment}</Text>:<Text style={s.reviewCommentMuted}>O cliente avaliou o produto sem deixar comentário.</Text>}
              </View>)}
            </View>:null}
          </>}
        </View>
      </ScrollView>

      <View style={s.detailBottomBar}>
        <View style={{flex:1}}><Text style={s.detailBottomLabel}>Preço</Text><Text style={s.detailBottomPrice}>{money(product.price)}</Text></View>
        <Pressable style={s.detailBuyButton} onPress={()=>{add(product);Alert.alert('Carrinho','Produto adicionado ao carrinho.');}}><Ionicons name="bag-add-outline" size={22} color={C.white}/><Text style={s.detailBuyText}>Adicionar</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}

function Cart({items,total,qty,catalog,checkout,session,account}:any){
  if(!items.length)return <View style={s.empty}><Ionicons name="bag-handle-outline" size={64} color={C.orange}/><Text style={s.emptyTitle}>Seu carrinho está vazio</Text><Pressable style={s.primary} onPress={catalog}><Text style={s.primaryText}>Ver catálogo</Text></Pressable></View>;
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.title}>Carrinho</Text>
    {items.map((x:any)=><View style={s.cartItem} key={x.id}><View style={{flex:1}}><Text style={s.productName}>{x.name}</Text><Text style={s.muted}>{money(x.price)} cada</Text></View><View style={s.qty}><Pressable onPress={()=>qty(x.id,-1)}><Ionicons name="remove-circle-outline" size={26}/></Pressable><Text style={{fontWeight:'900'}}>{x.quantity}</Text><Pressable onPress={()=>qty(x.id,1)}><Ionicons name="add-circle" size={26} color={C.orange}/></Pressable></View></View>)}
    <View style={s.total}><Text style={{color:'#AAA'}}>Total</Text><Text style={s.totalValue}>{money(total)}</Text></View>
    <View style={s.whatsappNotice}><Ionicons name="logo-whatsapp" size={21} color={C.whatsapp}/><Text style={s.whatsappNoticeText}>Os preços exibidos no app são os preços do pedido. Pelo WhatsApp confirmamos a disponibilidade dos itens e concluímos o atendimento.</Text></View>
    {!session?.user?<View style={s.loginRequired}><Ionicons name="lock-closed-outline" size={20} color={C.orange}/><View style={{flex:1}}><Text style={s.loginRequiredTitle}>Login obrigatório</Text><Text style={s.loginRequiredText}>Entre na sua conta para finalizar pelo WhatsApp.</Text></View></View>:null}
    <Pressable style={s.whatsappButton} onPress={session?.user?checkout:account}><Ionicons name="logo-whatsapp" size={21} color={C.white}/><Text style={s.primaryText}>{session?.user?'Finalizar no WhatsApp':'Entrar para continuar'}</Text></Pressable>
  </ScrollView>;
}

function Account({session,profile}:any){
  const[mode,setMode]=useState<'login'|'register'>('login');
  const[name,setName]=useState('');
  const[phone,setPhone]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[busy,setBusy]=useState(false);
  if(session?.user)return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>Minha conta</Text><View style={s.account}><View style={s.avatar}><Ionicons name="person" size={28} color={C.white}/></View><View style={{flex:1}}><Text style={s.accountName}>{profile?.name||'Cliente'}</Text><Text style={s.accountEmail}>{session.user.email}</Text><Text style={s.accountActive}>Conta atualmente conectada</Text></View></View><Pressable style={s.secondary} onPress={()=>supabase.auth.signOut()}><Text style={s.secondaryText}>Sair da conta</Text></Pressable></ScrollView>;
  const submit=async()=>{
    if(!email.trim()||password.length<6)return Alert.alert('Confira os dados','Informe e-mail e senha válidos.');
    setBusy(true);
    if(mode==='login'){
      const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});setBusy(false);if(error)Alert.alert('Login','Confira seu e-mail e senha.');return;
    }
    if(!name.trim()||digits(phone).length<10){setBusy(false);return Alert.alert('Cadastro','Informe nome e telefone.');}
    const{data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{name:name.trim(),phone:phone.trim()}}});
    if(!error&&data.user)await supabase.from('profiles').upsert({user_id:data.user.id,name:name.trim(),phone:phone.trim()},{onConflict:'user_id'});
    setBusy(false);if(error)Alert.alert('Cadastro',error.message);else if(!data.session)Alert.alert('Conta criada','Confira seu e-mail para confirmar.');
  };
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Text style={s.title}>{mode==='login'?'Entrar':'Criar conta'}</Text><View style={s.authTabs}><Pressable style={[s.authTab,mode==='login'&&s.authOn]} onPress={()=>setMode('login')}><Text>Entrar</Text></Pressable><Pressable style={[s.authTab,mode==='register'&&s.authOn]} onPress={()=>setMode('register')}><Text>Criar conta</Text></Pressable></View>{mode==='register'?<><Field label="Nome" value={name} onChangeText={setName}/><Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/></>:null}<Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/><Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry/><Pressable style={s.primary} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color={C.white}/>:<Text style={s.primaryText}>{mode==='login'?'Entrar':'Cadastrar'}</Text>}</Pressable></ScrollView></KeyboardAvoidingView>;
}

function Field({label,...props}:any){return <View style={{marginBottom:12}}><Text style={s.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#999" style={s.input}/></View>}
function Bottom({tab,setTab,count}:any){const inset=useSafeAreaInsets();const items:[Tab,string,any][]=[['home','Início','home-outline'],['catalog','Catálogo','search-outline'],['cart','Carrinho','bag-handle-outline'],['account','Conta','person-outline']];return <View style={[s.bottom,{paddingBottom:Math.max(inset.bottom,6)}]}>{items.map(([id,label,icon])=><Pressable key={id} style={s.nav} onPress={()=>setTab(id)}><View><Ionicons name={icon} size={23} color={tab===id?C.orange:C.muted}/>{id==='cart'&&count>0?<View style={s.navBadge}><Text style={s.navBadgeText}>{count}</Text></View>:null}</View><Text style={[s.navText,tab===id&&{color:C.orange}]}>{label}</Text></Pressable>)}</View>}

const s=StyleSheet.create({
  app:{flex:1,backgroundColor:C.bg},content:{flex:1},page:{padding:18,paddingBottom:36},title:{fontSize:28,fontWeight:'900',color:C.black,marginBottom:16},
  hero:{backgroundColor:C.black,borderRadius:23,padding:20,minHeight:205,flexDirection:'row',alignItems:'center',gap:10},heroSmall:{color:C.orange,fontSize:11,fontWeight:'900'},heroTitle:{color:C.white,fontSize:24,lineHeight:29,fontWeight:'900',marginTop:7},heroText:{color:'#CCC',fontSize:13,lineHeight:18,marginTop:7},heroBtn:{marginTop:14,alignSelf:'flex-start',backgroundColor:C.orange,borderRadius:12,paddingHorizontal:15,paddingVertical:11},heroBtnText:{color:C.white,fontWeight:'900'},
  section:{fontSize:19,fontWeight:'900',marginTop:22,marginBottom:11,color:C.black},quick:{flexDirection:'row',flexWrap:'wrap',gap:9},quickItem:{width:'48%',backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.border,padding:13,flexDirection:'row',alignItems:'center',gap:8},quickIcon:{width:40,height:40,borderRadius:12,backgroundColor:C.orangeSoft,alignItems:'center',justifyContent:'center'},quickText:{fontWeight:'800',fontSize:12,flex:1},
  homeSection:{marginTop:26},homeSectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11},homeSectionTitle:{fontSize:20,fontWeight:'900',color:C.black,flex:1},seeMore:{flexDirection:'row',alignItems:'center',paddingVertical:6,paddingLeft:12},seeMoreText:{fontSize:12,fontWeight:'900',color:C.orangeDark},homeCarousel:{gap:10,paddingRight:6},
  search:{height:50,borderRadius:15,backgroundColor:C.white,borderWidth:1,borderColor:C.border,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:8},filterLabel:{fontSize:12,fontWeight:'900',color:C.black,marginTop:14,marginBottom:8},chip:{height:38,paddingHorizontal:13,borderRadius:19,backgroundColor:C.white,borderWidth:1,borderColor:C.border,justifyContent:'center'},chipOn:{backgroundColor:C.black,borderColor:C.black},chipText:{fontSize:11,fontWeight:'800'},sortRow:{gap:7,paddingBottom:10},sortChip:{height:34,paddingHorizontal:11,borderRadius:11,backgroundColor:C.white,borderWidth:1,borderColor:C.border,justifyContent:'center'},sortChipOn:{backgroundColor:C.orangeSoft,borderColor:C.orange},sortText:{fontSize:10,fontWeight:'900',color:C.muted},catalogSummary:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4,marginBottom:12},resultCount:{fontSize:12,fontWeight:'900',color:C.black},clearFilters:{fontSize:11,fontWeight:'900',color:C.orangeDark},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},emptyCatalog:{alignItems:'center',justifyContent:'center',paddingVertical:50},
  product:{width:'48%',minHeight:265,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:12},productCompact:{width:152,minHeight:255},productImg:{height:104,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:'#EFEFEF',overflow:'hidden',alignItems:'center',justifyContent:'center'},productImageReal:{width:'100%',height:'100%'},imageFallback:{alignItems:'center',justifyContent:'center',backgroundColor:C.orangeSoft},badge:{alignSelf:'flex-start',marginTop:7,fontSize:9,fontWeight:'900',color:C.orangeDark,backgroundColor:C.orangeSoft,paddingHorizontal:7,paddingVertical:3,borderRadius:6},productName:{fontSize:14,fontWeight:'900',color:C.black,marginTop:7},productDesc:{fontSize:11,color:C.muted,marginTop:3},productBottom:{marginTop:'auto',paddingTop:9,flexDirection:'row',alignItems:'center'},price:{fontWeight:'900',fontSize:15,flex:1},add:{width:34,height:34,borderRadius:11,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},detailsHint:{fontSize:9,color:C.orangeDark,fontWeight:'800',marginTop:7},

  detailHeader:{height:62,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:C.border,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backBtn:{width:42,height:42,borderRadius:13,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},detailHeaderTitle:{fontSize:18,fontWeight:'900',color:C.black},detailCartIcon:{width:42,height:42,alignItems:'center',justifyContent:'center'},detailCartBadge:{position:'absolute',right:0,top:0,minWidth:18,height:18,borderRadius:9,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},detailCartBadgeText:{color:C.white,fontSize:9,fontWeight:'900'},detailPage:{padding:18,paddingBottom:35},detailImageBox:{height:330,width:'100%',backgroundColor:C.white,alignItems:'center',justifyContent:'center',overflow:'hidden'},detailImage:{width:'100%',height:'100%'},detailMetaRow:{marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},detailCategory:{fontSize:14,color:C.orangeDark,fontWeight:'900',flex:1},detailSku:{fontSize:11,color:C.muted,fontWeight:'700'},detailBadge:{alignSelf:'flex-start',marginTop:12,backgroundColor:C.orangeSoft,color:C.orangeDark,fontWeight:'900',fontSize:11,paddingHorizontal:10,paddingVertical:6,borderRadius:8},detailName:{fontSize:28,lineHeight:34,fontWeight:'900',color:C.black,marginTop:12},detailSeller:{fontSize:13,color:'#555',marginTop:9},detailDescriptionTop:{fontSize:14,color:C.muted,lineHeight:20,marginTop:13},priceCard:{marginTop:20,borderRadius:18,borderWidth:2,borderColor:C.orange,padding:16,backgroundColor:C.white,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},priceCardLabel:{fontSize:11,color:C.muted,fontWeight:'800'},priceCardValue:{fontSize:28,fontWeight:'900',color:C.black,marginTop:3},priceCardTag:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#EAF8EF',paddingHorizontal:9,paddingVertical:7,borderRadius:9},priceCardTagText:{fontSize:10,fontWeight:'900',color:C.green},detailSection:{marginTop:24,paddingTop:19,borderTopWidth:1,borderTopColor:C.border},detailSectionTitle:{fontSize:18,fontWeight:'900',marginBottom:9},detailDescription:{fontSize:14,color:'#444',lineHeight:21},detailInfo:{marginTop:18,backgroundColor:C.orangeSoft,borderRadius:14,padding:12,flexDirection:'row',gap:8},detailInfoText:{flex:1,fontSize:11,color:'#333',lineHeight:16},

  reviewSection:{marginTop:28,paddingTop:23,borderTopWidth:1,borderTopColor:C.border},reviewTitle:{fontSize:22,fontWeight:'900',color:C.black,marginBottom:17},starsRow:{flexDirection:'row',alignItems:'center',gap:3},reviewSummary:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:17,flexDirection:'row',alignItems:'center',gap:14},reviewScoreLine:{flexDirection:'row',alignItems:'center',gap:10},reviewScore:{fontSize:38,fontWeight:'900',color:C.black},reviewBased:{fontSize:12,color:C.muted,marginTop:5},recommendCircle:{width:84,height:84,borderRadius:42,borderWidth:5,borderColor:C.green,alignItems:'center',justifyContent:'center'},recommendNumber:{fontSize:19,fontWeight:'900',color:C.green},recommendLabel:{fontSize:9,color:C.muted,fontWeight:'800'},histogram:{marginTop:16,backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.border,padding:14,gap:8},histRow:{flexDirection:'row',alignItems:'center',gap:8},histStars:{width:35,flexDirection:'row',alignItems:'center',gap:3},histNumber:{fontSize:11,fontWeight:'900'},histTrack:{height:9,backgroundColor:'#ECEFF1',borderRadius:6,overflow:'hidden',flex:1},histFill:{height:'100%',backgroundColor:C.star,borderRadius:6},histCount:{width:20,textAlign:'right',fontSize:11,color:C.muted,fontWeight:'800'},noReviews:{alignItems:'center',backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:22},noReviewsTitle:{fontSize:17,fontWeight:'900',marginTop:8},noReviewsText:{fontSize:12,color:C.muted,textAlign:'center',lineHeight:18,marginTop:5},reviewForm:{marginTop:17,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:18,padding:16},reviewFormTitle:{fontSize:17,fontWeight:'900'},reviewFormHint:{fontSize:11,color:C.muted,marginTop:5,marginBottom:10},reviewInput:{minHeight:95,marginTop:14,borderWidth:1,borderColor:C.border,borderRadius:13,padding:12,textAlignVertical:'top',color:C.black,backgroundColor:'#FAFAFA'},reviewButton:{height:48,marginTop:11,borderRadius:13,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},reviewButtonText:{color:C.white,fontWeight:'900'},reviewLoginNote:{marginTop:10,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:C.orangeSoft,borderRadius:12,padding:11},reviewLoginText:{flex:1,fontSize:11,color:'#444',fontWeight:'700'},reviewList:{marginTop:23},reviewListTitle:{fontSize:19,fontWeight:'900',marginBottom:11},reviewCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:16,padding:15,marginBottom:10},reviewCardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:7},reviewerName:{fontSize:14,fontWeight:'900',color:C.black},reviewDate:{fontSize:10,color:C.muted},reviewComment:{fontSize:13,color:'#333',lineHeight:19,marginTop:10},reviewCommentMuted:{fontSize:12,color:C.muted,lineHeight:18,marginTop:10,fontStyle:'italic'},

  detailBottomBar:{minHeight:78,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,paddingHorizontal:18,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:14},detailBottomLabel:{fontSize:10,color:C.muted,fontWeight:'800'},detailBottomPrice:{fontSize:25,fontWeight:'900',color:C.black,marginTop:2},detailBuyButton:{minWidth:158,height:54,borderRadius:14,backgroundColor:C.orange,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingHorizontal:17},detailBuyText:{color:C.white,fontSize:15,fontWeight:'900'},

  empty:{flex:1,alignItems:'center',justifyContent:'center',padding:25},emptyTitle:{fontSize:19,fontWeight:'900',marginTop:10},primary:{minHeight:50,borderRadius:14,backgroundColor:C.orange,alignItems:'center',justifyContent:'center',paddingHorizontal:18,marginTop:13,flexDirection:'row',gap:7},primaryText:{color:C.white,fontWeight:'900'},cartItem:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:16,padding:13,marginBottom:9,flexDirection:'row',alignItems:'center'},muted:{fontSize:12,color:C.muted,marginTop:4},qty:{flexDirection:'row',alignItems:'center',gap:7},total:{backgroundColor:C.black,borderRadius:16,padding:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:7},totalValue:{color:C.orange,fontWeight:'900',fontSize:21},loginRequired:{marginTop:12,padding:12,borderRadius:14,backgroundColor:C.orangeSoft,flexDirection:'row',alignItems:'center',gap:8},loginRequiredTitle:{fontSize:12,fontWeight:'900'},loginRequiredText:{fontSize:10,color:C.muted,marginTop:2},whatsappNotice:{marginTop:12,padding:12,borderRadius:14,backgroundColor:'#EAF8EF',borderWidth:1,borderColor:'#CBEBD7',flexDirection:'row',alignItems:'center',gap:9},whatsappNoticeText:{flex:1,fontSize:11,color:'#23452E',lineHeight:16,fontWeight:'700'},whatsappButton:{minHeight:52,borderRadius:14,backgroundColor:C.whatsapp,alignItems:'center',justifyContent:'center',paddingHorizontal:16,marginTop:14,flexDirection:'row',gap:8},
  account:{backgroundColor:C.black,borderRadius:20,padding:17,flexDirection:'row',alignItems:'center',gap:11},avatar:{width:50,height:50,borderRadius:16,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},accountName:{color:C.white,fontWeight:'900',fontSize:17},accountEmail:{color:'#CCC',fontSize:12,marginTop:3},accountActive:{color:C.orange,fontSize:10,fontWeight:'900',marginTop:5},secondary:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:C.white,alignItems:'center',justifyContent:'center',marginTop:13},secondaryText:{fontWeight:'900'},authTabs:{flexDirection:'row',backgroundColor:'#EEE',padding:4,borderRadius:13,marginBottom:14},authTab:{flex:1,height:40,alignItems:'center',justifyContent:'center',borderRadius:10},authOn:{backgroundColor:C.white},fieldLabel:{fontSize:12,fontWeight:'900',marginBottom:6},input:{minHeight:48,borderRadius:13,backgroundColor:C.white,borderWidth:1,borderColor:C.border,paddingHorizontal:12,color:C.black},
  modal:{flex:1,backgroundColor:C.bg},
  bottom:{backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,flexDirection:'row',paddingTop:7},nav:{flex:1,alignItems:'center',justifyContent:'center',gap:3},navText:{fontSize:9,fontWeight:'800',color:C.muted},navBadge:{position:'absolute',right:-9,top:-6,minWidth:17,height:17,borderRadius:9,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'},navBadgeText:{color:C.white,fontSize:9,fontWeight:'900'}
});
