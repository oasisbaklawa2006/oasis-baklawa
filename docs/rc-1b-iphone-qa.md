# RC-1B iPhone QA — SUPERSEDED

This document is retained only as a historical marker.

The September RC instructions and artifacts previously listed here are **not valid for final Buyer physical UAT** because they predate Buyer convergence PRs #38–#49.

Do not use the old Android APK or the old software SHA `2da7bb7` for release qualification.

Canonical current contract:

- `docs/BUYER_FINAL_REALITY_UAT_2026-10-06.md`
- Build Android and iOS from the latest **merged `main`** SHA after the final certification PR merges.
- Record the exact Git SHA and EAS build IDs in the UAT evidence.
- Use the current dedicated MSG91 Mobile Integration configuration; never reuse the Central web widget.
- Keep Oasis Genie disabled until its production parser runtime is separately deployed and certified.

Historical RC evidence may still be consulted for background, but it must not be treated as current pass evidence.
