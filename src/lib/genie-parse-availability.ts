/**
 * Whether Oasis Genie order parsing (any mode -- text, audio, image,
 * document) is permitted to call the production edge function.
 *
 * Direct inspection of the live Supabase project (tcxvcatsqqertcnycuop --
 * the exact project this app's own supabaseUrl points at) found NO
 * deployed function with the slug "ai-order-parse", which is the ONLY
 * edge function every Genie parse mode calls (see invokeGenieOrderParse in
 * genie-order-parse.ts). It also does not exist in source in any of the
 * three governed repositories (oasis-supabase-core, Oasis-Baklawa-Central,
 * oasis-ai-studio).
 *
 * Kept in its own zero-dependency module (no supabase, no react-native)
 * specifically so this gate is directly unit-testable, and so it can be
 * imported by the actual network chokepoint (invokeGenieOrderParse) as the
 * enforcement point -- not just by the UI screen, which is a much weaker
 * guarantee (a future call site that imports invokeGenieOrderParse
 * directly, bypassing AiOrderScreen, would otherwise have no protection
 * against calling a production function that does not exist).
 *
 * Flip to true only once a governed, sourced, certified ai-order-parse
 * function actually exists -- never to silence a UI complaint about the
 * feature being unavailable.
 */
export const GENIE_PARSE_ENABLED = false;
