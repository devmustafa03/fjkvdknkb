# WindSight: know your wind before the auction closes

*A day-ahead decision tool for the GB power procurement desk*

## The decision you make every morning

By **09:50 on D−1** (N2EX; 09:20 on EPEX) the desk has to buy whatever tomorrow's wind fleet will not cover. Wind is the swing factor: in January 2026 GB transmission-metered wind averaged **11.3 GW** and swung between 1.7 GW and 17.8 GW. The only view of tomorrow you have at the gate is the latest national wind forecast, and every MW it gets wrong is bought or sold back later at intraday or imbalance prices.

So the desk needs two answers, quickly:

1. **What did the forecast say at the moment I had to commit?**
2. **How wrong does that forecast tend to be, and in which direction?**

## What WindSight gives you

**1. The forecast as it stood at your decision time.** For each delivery hour, WindSight shows the latest Elexon wind forecast published before *your* gate closure, next to what the wind farms actually generated. Pick N2EX or EPEX, or drag the decision time to see what waiting for a later run would have given you. The label tells you which run you are looking at.

**2. Accuracy in MW.** Typical miss, worst miss and when it happened, direction of the error, and how accuracy changes with lead time. They come down to one planning number:

> **Wind you can count on, 9 hours in 10: forecast − 4.2 GW**
>
> In January 2026, at the 09:50 gate, metered wind came in no more than 4.2 GW below the forecast in 9 hours out of 10.

**3. Built for the desk.**

- **One sentence first.** The title line states the finding for whatever you selected, so a colleague gets the point before the charts load.
- **Shareable views:** the Copy link button gives you a URL that reproduces the exact view.
- **Table view:** a table under every chart with plain numbers and ISO times, ready to paste into Excel.
- **Phone and dark mode:** works on a phone at 7am and in dark mode on the trading floor.

## What January 2026 tells us

Decisions made 1 to 31 Jan 2026 (delivery 2 Jan to 1 Feb), N2EX 09:50 gate, 744 delivery hours compared:

| What we measured | Result | What it means for the desk |
|---|---|---|
| Typical miss (MAE) | **1,991 MW**, 17.6% of average output | Roughly two large CCGT units, every hour |
| Direction | Forecast **too high in 84% of hours**, by **+1,727 MW** on average | Planning on the raw forecast leaves you short. Expect less wind than forecast. |
| Energy | Forecast 313 GWh/day against 271 GWh/day metered | About **42 GWh a day** between what was forecast and what the transmission meters recorded |
| When it's windy | Error rises to **+4.7 GW** when 20 GW or more is forecast, against +0.2 GW under 5 GW | The bigger the wind forecast, the bigger the haircut it needs. Above 15 GW the flat 4.2 GW haircut was beaten in 51 of 299 hours. |
| Worst hour | 6.9 GW shortfall, 12 Jan 01:00 | The tail risk your hedge has to cover |
| Gate timing | 09:20 against 09:50 makes no material difference (MAE 2,019 against 1,991 MW). Waiting until midday helps only a little (1,878 MW). | The error is structural, not stale data. |

The **systematic over-forecast** is the most actionable finding. Two cautions go with it. First, WINDFOR sits about 15% above FUELHH even for hours that have already happened, so part of the gap is a difference in what the two datasets measure (for example curtailed or embedded output), not forecast skill. Second, the excess grows sharply above 20 GW, which is consistent with wind being curtailed for grid constraints at high output. Neither changes the buying decision: expect less wind than the forecast says, and more so on windy days.

## Where we can take it next

1. **Wind-level-aware haircut:** a narrower buffer on calm days and a wider one on stormy days.
2. **Bias-corrected forecast:** a simple correction learned only from the previous 7 days already cuts the typical miss from **2,019 MW to 1,567 MW** on unseen days.
3. **Live D+1 view with alerts:** "tomorrow's forecast is above 20 GW; the historical haircut is 4.7 GW".
4. **Your demand forecast in:** turns "wind you can count on" into **"MW to buy"**.

## 5-minute demo script

1. **The month at a glance (default view).** Read the title line aloud: the forecast ran 1.7 GW high, and in 1 hour in 10 wind came in more than 4.2 GW below it. Point at the black actual line sitting under the blue forecast for most of the month.
2. **The summary strip.** Forecast − 4.2 GW is the planning number. Bias +1.7 GW: "the forecast you have been trading on runs high". Worst shortfall 6.9 GW on 12 Jan at 01:00.
3. **Pick the hardest week (25 to 31 Jan).** MAE jumps to 2,471 MW and the 9-in-10 haircut grows to 5.0 GW. Show the band widening.
4. **Drag the decision time from 09:50 to 16:00.** Accuracy barely moves; the lead-time chart shows why: error climbs gently with lead time and your decision window sits in the middle of the curve.
5. **Error distribution.** The bars lean heavily to the shortfall side. That asymmetry is what you hedge against.
6. **Table view and Copy link.** Paste the hourly numbers into a spreadsheet, or send this exact view to a colleague.

*Data: Elexon BMRS (FUELHH WIND actuals, WINDFOR forecasts). Gate times: Nord Pool N2EX GB day-ahead (09:50 UK), EPEX SPOT GB (09:20 UK).*
