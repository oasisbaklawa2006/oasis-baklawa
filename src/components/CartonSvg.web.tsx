import React, { useMemo } from 'react';

/**
 * react-native-svg 15.2's web entry does not export SvgXml. An image renders the
 * exact same local serializer output without injecting markup into the app DOM.
 * No remote artwork is fetched. The parent owns the accessible description.
 */
export function CartonSvg({ xml }: { xml: string }) {
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`, [xml]);
  return React.createElement('img', {
    src, alt: '', 'aria-hidden': true,
    style: { width: '100%', height: 240, objectFit: 'contain', display: 'block' },
  });
}
