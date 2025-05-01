# How to initialize a new season:

1. Change the season in `config.js`
2. Run `sportradar/scrape.js`. This should save four new files in the `sportradar` folder: 
  a. `season_CC.json`
  b. `season_PST_SERIES.json`
  c. `season_PST.json`
  d. `season_REG.json`
3. Incorporate any changes from the prior year where it needs to be replaced:
  a. If there is a new expansion team, make sure you follow step 1 below _before_ you proceed to step 4
  b. If the number of regular sesson games changes, update that in `monte-carlo/league.js`
  c. Updates to playoff structure needs to be incorporated in `monte-carlo/league.js` and/or `monte-carlo.series.js`
4. Run `init/init-season.js`. This updates the `db/games.json` and `db/teams.json` file
  a. This file reverts teams elos back towards the mean, so if you need to re-run this script for any reason, do not forget to discard changes made to _at least_ the `db/teams.json` file before running again (since it will revert the elos an additional time)
5. Run `sportradar/force_run.js`. This runs the first pre-season forecast, which should update the following files:
  a. `db/forecasts.json` (adds new forecast to the "database")
  b. `src/data/weekly_forecasts` (clears out old season's weekly forecasts, replaces with just the first preseason one)
  c. `src/data/games.json` (updates the games to this season's games + odds)
6. Update the new season in the template files:
  a. `src/templates/partials/head.pug`
  b. `src/templates/partials/intro.pug`
7. Add a new screenshot share image at `src/images/share-image-TKTK.png`
  a. The page will break on first load without that image present, so in the past I just copy the past year's image, paste it with the new season number, and replace that with a new export once the page builds the first time.
8. Run `yarn start` to start a local server and test the page, make sure it all looks good
9. Create new repository for the front-end:
  a. Name: it `tktk-wnba-predictions`
  b. Description: `🏀 Front-end for tktk WNBA model`
  c. No template, blank repo
10. Run `yarn deploy`
  a. Confirm your new repo has the output from that build
  b. Confirm the "pages build and deployment" action is running
  c. Once that action is complete, your new page should be published.


## Expansion teams
1. Add logic to add this team to the `teams` objet for this season under the `// ~~ add expansion teams ~~ //` comment in `init/init-season.js`
2. Add logo (named with acronym) to `src/images` folder
3. Add team name to `lookup` function in `src/utils/team.js`