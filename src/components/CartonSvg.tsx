import React from 'react';
import { SvgXml } from 'react-native-svg';

/** Native adapter. The parent CartonVisual owns the accessible count description. */
export function CartonSvg({ xml }: { xml: string }) {
  return <SvgXml xml={xml} width="100%" height={240} accessible={false} />;
}
