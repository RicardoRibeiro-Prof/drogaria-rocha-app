import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';

type Banner={
  id:number;
  title:string;
  subtitle:string;
  button_text:string;
  image_url?:string|null;
  target_type:'all'|'category'|'search';
  target_value:string;
  sort_order:number;
  active:boolean;
};

type Form={
  id?:number;
  title:string;
  subtitle:string;
  button_text:string;
  image_url:string;
  target_type:'all'|'category'|'search';
  target_value:string;
  sort_order:string;
  active:boolean;
};

const C={orange:'#F47A1F',orangeDark:'#D95F09',orangeSoft:'#FFF1E6',black:'#111',white:'#FFF',bg:'#F4F4F4',border:'#E5E5E5',muted:'#777',dark:'#171717',danger:'#B42318',success:'#177A3F'};
const CATEGORIES=['Infantil','Dermocosméticos','Protetores Solares','Hidratantes','Sabonetes e Limpeza','Higiene Bucal','Higiene Pessoal','Cuidados Femininos','Desodorantes','Cabelos','Perfumaria','Repelentes','Vitaminas','Primeiros Socorros','Medicamentos'];

export default function BannerManager(){
  const[banners,setBanners]=useState<Banner[]>([]);
  const[loading,setLoading]=useState(true);
  const[open,setOpen]=useState(false);
  const[editing,setEditing]=useState<Banner|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const{data,error}=await supabase.from('home_banners').select('*').order('sort_order',{ascending:true});
    if(error)Alert.alert('Banners',error.message);
    setBanners((data||[]).map((x:any)=>({...x,id:Number(x.id),sort_order:Number(x.sort_order||0)})));
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const remove=(banner:Banner)=>Alert.alert('Excluir banner',`Deseja excluir “${banner.title}”?`,[
    {text:'Cancelar',style:'cancel'},
    {text:'Excluir',style:'destructive',onPress:async()=>{
      const{error}=await supabase.from('home_banners').delete().eq('id',banner.id);
      if(error)return Alert.alert('Banners',error.message);
      load();
    }},
  ]);

  if(loading)return <View style={s.loading}><ActivityIndicator color={C.orange}/><Text style={s.meta}>Carregando banners...</Text></View>;

  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.headRow}><View style={{flex:1}}><Text style={s.title}>Banners da Home</Text><Text style={s.subtitle}>Troque campanhas sem gerar um novo APK.</Text></View><Pressable style={s.newBtn} onPress={()=>{setEditing(null);setOpen(true);}}><Ionicons name="add" size={18} color={C.white}/><Text style={s.newText}>Novo</Text></Pressable></View>
    <View style={s.notice}><Ionicons name="information-circle-outline" size={21} color={C.orange}/><Text style={s.noticeText}>A ordem menor aparece primeiro. O app mostra apenas banners ativos e atualiza ao abrir novamente a tela inicial.</Text></View>
    {banners.map(b=><View key={b.id} style={s.card}>
      <View style={s.preview}>{b.image_url?<Image source={{uri:b.image_url}} style={s.image} resizeMode="contain"/>:<Ionicons name="image-outline" size={38} color={C.orange}/>}</View>
      <View style={{flex:1}}><Text style={s.bold}>{b.title}</Text><Text style={s.meta} numberOfLines={2}>{b.subtitle||'Sem subtítulo'}</Text><Text style={s.target}>{b.target_type==='all'?'Todos os produtos':b.target_type==='category'?`Categoria: ${b.target_value}`:`Busca: ${b.target_value}`}</Text><Text style={[s.status,{color:b.active?C.success:C.danger}]}>{b.active?'Ativo':'Inativo'} • Ordem {b.sort_order}</Text></View>
      <View style={s.actions}><Pressable style={s.iconBtn} onPress={()=>{setEditing(b);setOpen(true);}}><Ionicons name="create-outline" size={20} color={C.black}/></Pressable><Pressable style={s.deleteBtn} onPress={()=>remove(b)}><Ionicons name="trash-outline" size={19} color={C.danger}/></Pressable></View>
    </View>)}
    {!banners.length?<View style={s.empty}><Ionicons name="images-outline" size={46} color={C.orange}/><Text style={s.bold}>Nenhum banner cadastrado</Text></View>:null}
    <BannerModal visible={open} banner={editing} onClose={()=>setOpen(false)} onSaved={async()=>{setOpen(false);await load();}}/>
  </ScrollView>;
}

function BannerModal({visible,banner,onClose,onSaved}:any){
  const empty:Form={title:'',subtitle:'',button_text:'Ver produtos',image_url:'',target_type:'all',target_value:'',sort_order:'1',active:true};
  const[form,setForm]=useState<Form>(empty);
  const[busy,setBusy]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[previewFailed,setPreviewFailed]=useState(false);

  useEffect(()=>{
    if(!visible)return;
    setPreviewFailed(false);
    setForm(banner?{id:banner.id,title:banner.title||'',subtitle:banner.subtitle||'',button_text:banner.button_text||'Ver produtos',image_url:banner.image_url||'',target_type:banner.target_type||'all',target_value:banner.target_value||'',sort_order:String(banner.sort_order??1),active:banner.active!==false}:empty);
  },[visible,banner]);

  const set=(k:keyof Form,v:any)=>setForm(x=>({...x,[k]:v}));

  const pickImage=async()=>{
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted)return Alert.alert('Permissão necessária','Permita acesso às fotos para escolher o banner.');
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[16,9],quality:0.88});
    if(result.canceled||!result.assets?.length)return;
    const image=result.assets[0];
    setUploading(true);
    try{
      const response=await fetch(image.uri);if(!response.ok)throw new Error('Não foi possível ler a imagem.');
      const bytes=await response.arrayBuffer();
      const candidate=(image.fileName?.split('.').pop()||image.uri.split('.').pop()||'jpg').toLowerCase().split('?')[0];
      const ext=['jpg','jpeg','png','webp'].includes(candidate)?candidate:'jpg';
      const contentType=image.mimeType||(ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg');
      const path=`banners/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
      const{error}=await supabase.storage.from('product-images').upload(path,bytes,{contentType,cacheControl:'3600',upsert:false});
      if(error)throw error;
      const{data}=supabase.storage.from('product-images').getPublicUrl(path);
      set('image_url',data.publicUrl);setPreviewFailed(false);
    }catch(e:any){Alert.alert('Banner',e?.message||'Não foi possível enviar a imagem.');}
    finally{setUploading(false);}
  };

  const save=async()=>{
    if(!form.title.trim())return Alert.alert('Banner','Informe o título.');
    if(form.target_type!=='all'&&!form.target_value.trim())return Alert.alert('Banner','Informe o destino do clique.');
    const sortOrder=Number(form.sort_order||0);
    setBusy(true);
    const payload={title:form.title.trim(),subtitle:form.subtitle.trim(),button_text:form.button_text.trim()||'Ver produtos',image_url:form.image_url.trim()||null,target_type:form.target_type,target_value:form.target_type==='all'?'':form.target_value.trim(),sort_order:Number.isFinite(sortOrder)?sortOrder:0,active:form.active};
    const{error}=form.id?await supabase.from('home_banners').update(payload).eq('id',form.id):await supabase.from('home_banners').insert(payload);
    setBusy(false);
    if(error)return Alert.alert('Banner',error.message);
    onSaved();
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={s.modal} edges={['top','bottom']}>
      <View style={s.modalHeader}><View><Text style={s.eyebrow}>BANNERS DA HOME</Text><Text style={s.modalTitle}>{form.id?'Editar banner':'Novo banner'}</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={25} color={C.white}/></Pressable></View>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Field label="Título" value={form.title} onChangeText={(v:string)=>set('title',v)}/>
        <Field label="Subtítulo" value={form.subtitle} onChangeText={(v:string)=>set('subtitle',v)} multiline/>
        <Field label="Texto do botão" value={form.button_text} onChangeText={(v:string)=>set('button_text',v)}/>
        <Text style={s.fieldLabel}>Imagem do banner</Text>
        <View style={s.imageCard}>{form.image_url&&!previewFailed?<Image source={{uri:form.image_url}} style={s.bannerPreview} resizeMode="contain" onError={()=>setPreviewFailed(true)}/>:<View style={s.imagePlaceholder}><Ionicons name="images-outline" size={42} color={C.orange}/><Text style={s.meta}>Você pode usar banner só com texto ou adicionar uma imagem.</Text></View>}<Pressable style={s.imageButton} onPress={pickImage} disabled={uploading}>{uploading?<ActivityIndicator color={C.white}/>:<><Ionicons name="images-outline" size={19} color={C.white}/><Text style={s.imageButtonText}>{form.image_url?'Trocar imagem':'Adicionar imagem'}</Text></>}</Pressable></View>
        <Text style={s.fieldLabel}>Ao tocar no banner</Text>
        <View style={s.typeRow}>{([['all','Todos'],['category','Categoria'],['search','Busca']] as const).map(([id,label])=><Pressable key={id} onPress={()=>set('target_type',id)} style={[s.typeBtn,form.target_type===id&&s.typeOn]}><Text style={[s.typeText,form.target_type===id&&s.typeTextOn]}>{label}</Text></Pressable>)}</View>
        {form.target_type==='category'?<><Text style={s.fieldLabel}>Categoria</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>{CATEGORIES.map(cat=><Pressable key={cat} style={[s.categoryBtn,form.target_value===cat&&s.categoryOn]} onPress={()=>set('target_value',cat)}><Text style={[s.categoryText,form.target_value===cat&&s.categoryTextOn]}>{cat}</Text></Pressable>)}</ScrollView></>:null}
        {form.target_type==='search'?<Field label="Texto que será pesquisado" value={form.target_value} onChangeText={(v:string)=>set('target_value',v)} placeholder="Ex.: Principia"/>:null}
        <Field label="Ordem" value={form.sort_order} onChangeText={(v:string)=>set('sort_order',v)} keyboardType="number-pad"/>
        <View style={s.switchRow}><View style={{flex:1}}><Text style={s.fieldLabel}>Banner ativo</Text><Text style={s.meta}>Desative sem excluir para usar novamente depois.</Text></View><Switch value={form.active} onValueChange={v=>set('active',v)}/></View>
        <Pressable style={s.save} onPress={save} disabled={busy||uploading}>{busy?<ActivityIndicator color={C.white}/>:<Text style={s.saveText}>Salvar banner</Text>}</Pressable>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

function Field({label,multiline,...props}:any){return <View style={{marginBottom:12}}><Text style={s.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#999" style={[s.input,multiline&&{minHeight:80,textAlignVertical:'top',paddingTop:12}]}/></View>}

const s=StyleSheet.create({
  loading:{padding:30,alignItems:'center',gap:8},page:{padding:16,paddingBottom:36},headRow:{flexDirection:'row',alignItems:'center',gap:10},title:{fontSize:27,fontWeight:'900',color:C.black},subtitle:{fontSize:13,color:C.muted,marginTop:4,marginBottom:14},newBtn:{height:42,paddingHorizontal:12,borderRadius:12,backgroundColor:C.orange,flexDirection:'row',alignItems:'center',gap:4},newText:{color:C.white,fontWeight:'900'},notice:{padding:12,borderRadius:13,backgroundColor:C.orangeSoft,flexDirection:'row',gap:8,marginBottom:12},noticeText:{flex:1,fontSize:10,color:'#333',lineHeight:15},card:{padding:12,borderRadius:15,backgroundColor:C.white,borderWidth:1,borderColor:C.border,marginBottom:9,flexDirection:'row',alignItems:'center',gap:10},preview:{width:76,height:72,borderRadius:13,backgroundColor:C.orangeSoft,alignItems:'center',justifyContent:'center',overflow:'hidden'},image:{width:'100%',height:'100%'},bold:{fontSize:13,fontWeight:'900',color:C.black},meta:{fontSize:10,color:C.muted,marginTop:3,lineHeight:15},target:{fontSize:10,color:C.orangeDark,fontWeight:'900',marginTop:5},status:{fontSize:9,fontWeight:'900',marginTop:4},actions:{gap:6},iconBtn:{width:35,height:35,borderRadius:10,backgroundColor:'#EEE',alignItems:'center',justifyContent:'center'},deleteBtn:{width:35,height:35,borderRadius:10,backgroundColor:'#FDECEC',alignItems:'center',justifyContent:'center'},empty:{padding:35,alignItems:'center',gap:8},modal:{flex:1,backgroundColor:C.bg},modalHeader:{minHeight:74,backgroundColor:C.dark,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},eyebrow:{color:C.orange,fontWeight:'900',fontSize:10,letterSpacing:1},modalTitle:{color:C.white,fontSize:19,fontWeight:'900',marginTop:2},fieldLabel:{fontSize:11,fontWeight:'900',color:C.black,marginBottom:6},input:{minHeight:47,borderRadius:12,backgroundColor:C.white,borderWidth:1,borderColor:C.border,paddingHorizontal:12,color:C.black},imageCard:{borderRadius:15,backgroundColor:C.white,borderWidth:1,borderColor:C.border,padding:12,marginBottom:12},bannerPreview:{width:'100%',height:180,borderRadius:12,backgroundColor:'#FAFAFA'},imagePlaceholder:{height:140,borderRadius:12,backgroundColor:C.orangeSoft,alignItems:'center',justifyContent:'center',padding:15},imageButton:{height:46,borderRadius:12,backgroundColor:C.orange,marginTop:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},imageButtonText:{color:C.white,fontWeight:'900'},typeRow:{flexDirection:'row',gap:7,marginBottom:13},typeBtn:{height:38,paddingHorizontal:13,borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:C.white,justifyContent:'center'},typeOn:{backgroundColor:C.dark,borderColor:C.dark},typeText:{fontSize:10,fontWeight:'900',color:C.black},typeTextOn:{color:C.white},categories:{gap:7,paddingBottom:13},categoryBtn:{height:35,paddingHorizontal:11,borderRadius:18,backgroundColor:C.white,borderWidth:1,borderColor:C.border,justifyContent:'center'},categoryOn:{backgroundColor:C.orange,borderColor:C.orange},categoryText:{fontSize:9,fontWeight:'800'},categoryTextOn:{color:C.white},switchRow:{padding:12,borderRadius:13,backgroundColor:C.white,borderWidth:1,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:8},save:{height:50,borderRadius:13,backgroundColor:C.orange,alignItems:'center',justifyContent:'center',marginTop:14},saveText:{color:C.white,fontWeight:'900'}
});
