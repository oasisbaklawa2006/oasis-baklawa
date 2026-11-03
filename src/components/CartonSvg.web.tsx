import React, { useMemo } from 'react';
import { cartonArtworkRatio, MAX_CARTON_ARTWORK_HEIGHT } from '@/lib/carton-visual-model';

/**
 * react-native-svg 15.2's web entry does not export SvgXml. An image renders the
 * exact same local serializer output without injecting markup into the app DOM.
 * No remote artwork is fetched. The parent owns the accessible description.
 */
export function CartonSvg({ xml }: { xml: string }) {
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`, [xml]);
  const ratio = useMemo(() => cartonArtworkRatio(xml), [xml]);
  return React.createElement('img', {
    src, alt: '', 'aria-hidden': true,
    style: {
      width: '100%', height: 'auto', aspectRatio: String(ratio), maxWidth: Math.round(MAX_CARTON_ARTWORK_HEIGHT * ratio),
      margin: '0 auto', objectFit: 'contain', display: 'block',
    },
  });
}
