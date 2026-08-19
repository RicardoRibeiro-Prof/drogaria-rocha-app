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
  image: any;
};

const BANNERS: Banner[] = [
  { id: 'farmacia', image: require('../../assets/banners/banner-farmacia.jpg') },
  { id: 'laboratorios', image: require('../../assets/banners/banner-laboratorios.jpg') },
  { id: 'produtos', image: require('../../assets/banners/banner-produtos.jpg') },
];

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
    }, 4500);

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
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, itemIndex) => ({
          length: cardWidth,
          offset: cardWidth * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => (
          <View style={[styles.banner, { width: cardWidth }]}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
          </View>
        )}
      />

      <View style={styles.dots}>
        {BANNERS.map((banner, dotIndex) => (
          <View key={banner.id} style={[styles.dot, dotIndex === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  banner: {
    height: 185,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  image: { width: '100%', height: '100%' },
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
