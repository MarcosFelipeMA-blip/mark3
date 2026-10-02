# Analysis: HF20 / HF25 / HF32 guide blade grooves (Siemens 0-2091-0054-xx), Mazak Mega Turn 1600

Status: **preliminary**. Covers assemblies 2 and 4 only. More assemblies still to come.

## Data taken from the STEP files (CoroPlus)

| Assembly | Holder | Insert | Measured from 3D |
|---|---|---|---|
| 4 | C2R-RS25-LK32DB | C2I-K2N-0714-0008-GF1225 | width 7.14, corner radius ≈ 0.8 |
| 2 | C2R-RS25-LK32DB | C2I-K2N-0714-RO 1225 | full radius R3.57 |

Holder geometry (relative to the insert tip):

- Blade width behind the insert: **5.35 mm**, insert 7.14 mm, so 0.9 mm per side of clearance.
- **Free length ≈ 33.3 mm**. From there the body widens toward the -X side (left-hand holder). The +X side is flush up to the shank.
- Tangential height of the blade/body: Y -31.9 … +10.2 mm. In the bore this costs depth: ≈ y²/Ø, i.e. ~1.3 mm at Ø800, ~0.85 mm at Ø1200, ~0.65 mm at Ø1600.

## Slot depths (read from the drawings)

Depths are measured from the Ø H9 line, with the mouth (3 or 4 mm) below it.

| Slot | Neck | T head | Head floor | Top of center radius | Total from the bore |
|---|---|---|---|---|---|
| HF20 | 14 H11 | 20.6 C11 | 21 | 10 + 13.7 = **23.7** (R3) | 26.7 |
| HF25 | 18 H11 | 25.8 C11 | 21 | 10 + 14.7 = **24.7** (R4) | 27.7 |
| HF32 | 22 H11 | 32.8 C11 | 25 | 12 + 16.7 = **28.7** (R4) | **32.7** |

## Result of the 2D simulation (tool profile vs. slot profile)

![reach](alcance_C2R-LK32.png)

1. **Depth: OK on all three.** The C2R LK32 reaches the floor everywhere it can enter.
   - HF32 is the tight one: 33.3 available vs 32.7 needed, so **0.6 mm** margin before the bore curvature.
   - Below about Ø1300 the body touches the edge of the bore when the insert is on the left side of the neck. This confirms the need for the **LF123G33** (33) for HF32.
2. **HF20 center radius R3 (+0.1) is NOT made with K 7.14 inserts.**
   - The bump is 6 mm wide and the RO has R3.57 > R3.1, so the max depth reached is 22.6 vs 23.7 needed.
   - It has to be profiled with a 4 mm insert (G seat, e.g. RO 4.0 = R2.0) on the LF123G33 blade.
   - HF25 and HF32 (R4): the RO 3.57 reaches the top exactly (24.7 and 28.7). Finish by interpolating R4.
3. **The T undercut is not reached by any straight tool** (red area in the figure).
   - The blade has to pass through the neck, so the insert gets at most 0.9 mm beyond the neck wall.
   - Missing per side: HF20 ≈ 3.3 mm, HF25 ≈ 3.9 mm, HF32 ≈ 5.4 mm, plus the R4/R5/R6 corners, the R0.5 corners and the 1x45°.
   - The LF123 blades with LG/RG123 inserts are straight too, so they don't solve it.
   - They work for **detail X (Design 2, R0.4 max, relief 0.9 × 0.2)** at the mouth.
   - **A hook tool (left and right) is needed for the undercut.**
4. Quote: the LF123H32-25B1 / LF123G33-25B1 blades need a **blade holder** (25 mm blade height). It isn't in quote I9_26-21080.

## Open items

- Real diameter of the bore / slots (for the curvature correction).
- Which tool makes the T head (C11 width), the R0.5 corners and the R4/R5/R6 corners.
- STEP files of the other assemblies (LF123H32 + LG/RG123H1, LF123G33 + C2I-G2N).
