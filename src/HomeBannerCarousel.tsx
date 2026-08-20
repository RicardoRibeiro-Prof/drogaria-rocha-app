import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { supabase } from './lib/supabase';

type Banner = {
  id: number;
  eyebrow?: string | null;
  title: string;
  subtitle: string;
  button_text: string;
  image_url?: string | null;
  target_type: 'all' | 'category' | 'search';
  target_value: string;
  sort_order: number;
};

type Props = {
  catalog: (category?: string, search?: string) => void;
};

const FALLBACK: Banner[] = [
  {id:-1,eyebrow:'DROGARIA ROCHA',title:'Cuidado e praticidade na palma da sua mão.',subtitle:'Escolha seus produtos e finalize a compra pelo WhatsApp.',button_text:'Ver produtos',target_type:'all',target_value:'',sort_order:1},
];

export default function HomeBannerCarousel({catalog}:Props){
  const {width}=useWindowDimensions();
  const cardWidth=Math.max(280,width-36);
  const ref=useRef<ScrollView|null>(null);
  const[index,setIndex]=useState(0);
  const[banners,setBanners]=useState<Banner[]>([]);

  useEffect(()=>{
    let alive=true;
    supabase.from('home_banners')
      .select('id,eyebrow,title,subtitle,button_text,image_url,target_type,target_value,sort_order')
      .eq('active',true)
      .order('sort_order',{ascending:true})
      .then(({data})=>{
        if(!alive)return;
        setBanners((data||[]).map((x:any)=>({...x,id:Number(x.id),sort_order:Number(x.sort_order||0)})));
      });
    return()=>{alive=false;};
  },[]);

  const slides=useMemo(()=>banners.length?banners:FALLBACK,[banners]);

  useEffect(()=>{
    if(slides.length<2)return;
    const timer=setInterval(()=>{
      setIndex(current=>{
        const next=(current+1)%slides.length;
        ref.current?.scrollTo({x:next*cardWidth,animated:true});
        return next;
      });
    },4500);
    return()=>clearInterval(timer);
  },[slides.length,cardWidth]);

  useEffect(()=>{
    if(index>=slides.length)setIndex(0);
  },[slides.length,index]);

  const go=(banner:Banner)=>{
    if(banner.target_type==='category')return catalog(banner.target_value||'Todos','');
    if(banner.target_type==='search')return catalog('Todos',banner.target_value||'');
    catalog('Todos','');
  };

  const content=(banner:Banner)=><>
    <View style={s.overlay}/>
    <View style={s.copy}>
      <Text style={s.eyebrow}>{banner.eyebrow||'DROGARIA ROCHA'}</Text>
      <Text style={s.title}>{banner.title}</Text>
      {!!banner.subtitle&&<Text style={s.subtitle}>{banner.subtitle}</Text>}
      <Pressable style={s.button} onPress={()=>go(banner)}>
        <Text style={s.buttonText}>{banner.button_text||'Ver produtos'}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFF"/>
      </Pressable>
    </View>
  </>;

  return <View>
    <ScrollView
      ref={ref}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      onMomentumScrollEnd={e=>{
        const next=Math.round(e.nativeEvent.contentOffset.x/cardWidth);
        setIndex(Math.max(0,Math.min(next,slides.length-1)));
      }}
    >
      {slides.map(banner=><View key={banner.id} style={{width:cardWidth}}>
        <View style={s.hero}>
          {banner.image_url?
            <ImageBackground
              source={{uri:banner.image_url}}
              style={s.heroBackground}
              imageStyle={s.heroImage}
              resizeMode="cover"
            >
              {content(banner)}
            </ImageBackground>
          :
            <View style={s.heroFallback}>
              {content(banner)}
            </View>
          }
        </View>
      </View>)}
    </ScrollView>
    {slides.length>1?<View style={s.dots}>{slides.map((b,i)=><View key={b.id} style={[s.dot,i===index&&s.dotOn]}/>)}</View>:null}
  </View>;
}

const s=StyleSheet.create({
  hero:{minHeight:210,borderRadius:23,backgroundColor:'#111111',overflow:'hidden'},
  heroBackground:{minHeight:210,justifyContent:'center',padding:20},
  heroImage:{borderRadius:23},
  heroFallback:{minHeight:210,justifyContent:'center',padding:20,backgroundColor:'#111111'},
  overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.42)'},
  copy:{zIndex:2,maxWidth:'72%'},
  eyebrow:{color:'#F47A1F',fontSize:10,fontWeight:'900',letterSpacing:.8},
  title:{color:'#FFF',fontSize:23,lineHeight:28,fontWeight:'900',marginTop:7,textShadowColor:'rgba(0,0,0,.35)',textShadowOffset:{width:0,height:1},textShadowRadius:3},
  subtitle:{color:'#F2F2F2',fontSize:12,lineHeight:18,marginTop:7,textShadowColor:'rgba(0,0,0,.35)',textShadowOffset:{width:0,height:1},textShadowRadius:2},
  button:{marginTop:14,alignSelf:'flex-start',height:42,borderRadius:12,backgroundColor:'#F47A1F',paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:6},
  buttonText:{color:'#FFF',fontSize:12,fontWeight:'900'},
  dots:{height:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  dot:{width:7,height:7,borderRadius:4,backgroundColor:'#D1D1D1'},
  dotOn:{width:21,backgroundColor:'#F47A1F'},
});
