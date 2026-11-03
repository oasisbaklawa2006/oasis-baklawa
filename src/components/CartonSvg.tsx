import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cartonArtworkRatio, MAX_CARTON_ARTWORK_HEIGHT } from '@/lib/carton-visual-model';

/** Native adapter. The parent CartonVisual owns the accessible count description. */
export function CartonSvg({ xml }: { xml: string }) {
  const ratio = cartonArtworkRatio(xml);
  return (
    <View style={{ width: '100%', aspectRatio: ratio, maxWidth: Math.round(MAX_CARTON_ARTWORK_HEIGHT * ratio), alignSelf: 'center' }}>
      <SvgXml xml={xml} width="100%" height="100%" accessible={false} />
    </View>
  );
}
