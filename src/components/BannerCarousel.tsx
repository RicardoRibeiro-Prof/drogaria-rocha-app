import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

type Banner = {
  id: string;
  image?: any;
  resizeMode?: 'cover' | 'contain';
  backgroundColor?: string;
};

const BANNERS: Banner[] = [
  { id: 'hero' },
  {
    id: 'farmacia',
    image: require('../../assets/banners/banner-farmacia.jpg'),
    resizeMode: 'cover',
    backgroundColor: '#FFFFFF',
  },
  {
    id: 'laboratorios',
    image: require('../../assets/banners/banner-laboratorios.jpg'),
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  {
    id: 'produtos',
    image: require('../../assets/banners/banner-produtos.jpg'),
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
];

const BANNER_HEIGHT = 205;

export default function BannerCarousel() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Banner>>(null);
  const [index, setIndex] = useState(0);
  const cardWidth = Math.max(280, width - 36);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % BANNERS.length;
        listRef.current?.scrollToOffset({ offset: next * cardWidth, animated: true });
        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [cardWidth]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    if (next >= 0 && next < BANNERS.length) setIndex(next);
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={BANNERS}
        horizontal
        pagingEnabled
        pointerEvents={index === 0 ? 'box-none' : 'auto'}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, itemIndex) => ({
          length: cardWidth,
          offset: cardWidth * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => {
          if (item.id === 'hero') {
            return <View pointerEvents="none" style={[styles.heroPlaceholder, { width: cardWidth }]} />;
          }

          const isPharmacy = item.id === 'farmacia';
          const isContain = item.resizeMode === 'contain';

          return (
            <View
              style={[
                styles.banner,
                { width: cardWidth, backgroundColor: item.backgroundColor || '#FFFFFF' },
              ]}
            >
              <Image
                source={item.image}
                resizeMode={item.resizeMode || 'cover'}
                style={[
                  styles.image,
                  isPharmacy && styles.pharmacyImage,
                  isContain && styles.containImage,
                ]}
              />
            </View>
          );
        }}
      />

      <View pointerEvents="none" style={styles.dots}>
        {BANNERS.map((banner, dotIndex) => (
          <View key={banner.id} style={[styles.dot, dotIndex === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: -BANNER_HEIGHT,
  },
  heroPlaceholder: {
    height: BANNER_HEIGHT,
    backgroundColor: 'transparent',
  },
  banner: {
    height: BANNER_HEIGHT,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pharmacyImage: {
    width: '160%',
    marginLeft: '-30%',
  },
  containImage: {
    width: '94%',
    height: '88%',
  },
  dots: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D5D5D5',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#F47A1F',
  },
});
