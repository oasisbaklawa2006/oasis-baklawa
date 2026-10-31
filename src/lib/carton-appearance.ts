import logo from '../../assets/carton-builder/oasis-logo.json';

/** Local, owner-supplied artwork. App use does not authorise public redistribution. */
export const CARTON_APPEARANCE = Object.freeze({ logoDataUri: logo.dataUri });

/** Open-state printing is an educational watermark; closure restores opaque printing. */
export const OPEN_BRANDING_OPACITY = 0.18;
/** Factory photographs (31 Oct 2026) show a white printed exterior, not ivory; the constant name is kept for compatibility. */
export const CARTON_IVORY = '#f7f6f2';
