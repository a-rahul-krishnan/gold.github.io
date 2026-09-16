# Thangamayil 22K916 Gold Predictor — Model B

GitHub Pages-ready static website for the tested COMEX + MCX + Thangamayil workflow.

## How it works

- Before 09:00 IST: shows the previous completed session.
- 09:00–10:00 IST: switches to today's COMEX + MCX prediction mode.
- 10:00 IST onward: keeps the prediction visible and lets you enter the latest Thangamayil 22K916 rate for result validation.
- Model B is fixed from the available exact-sample backtest:
  - COMEX: +2 if > +2%; +1 if +0.5% to +2%; 0 if -0.5% to +0.5%; -1 if -2% to -0.5%; -2 if < -2%.
  - MCX: +1 if rising; 0 if roughly flat; -1 if falling.
  - Total > 0 = UP; < 0 = DOWN; = 0 = WAIT.

## Data handling

The public static site does not pretend to have a browser-safe live COMEX/MCX futures feed. CME's official real-time API is a separate market-data service with access requirements. The page therefore uses manual COMEX/MCX inputs while keeping the workflow and tested model fixed.

## Backtest scope

The exact-sample backtest available to the project had 4 clean standard trading days for Model B: 2 correct actionable calls and 2 WAIT results. That is too small to claim the model is statistically validated. The >+2% COMEX rule was not encountered in the tested rows.
