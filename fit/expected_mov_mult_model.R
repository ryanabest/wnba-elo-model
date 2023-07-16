#libraries
library(ggplot2)
library(dplyr)

HCA = 80
PLAYOFF_MULT = 1.25

setwd("~/Documents/repos/wnba-model/fit")

wnba_elo <- read.csv('wnba_elo.csv') %>%
  mutate(
    elo_diff = ((elo1_pre - elo2_pre) + ifelse(neutral == 1, 0, HCA)) * ifelse(playoff == 1, PLAYOFF_MULT, 1),
    score_diff = score1 - score2,
    elo_diff_adj = ((result1 * 2) - 1) * elo_diff,
    score_diff_adj = abs(score1 - score2) ^ 0.8
  )

wnba_elo %>%
  ggplot(aes(x = elo_diff_adj, y = score_diff_adj)) +
  geom_point() +
  geom_smooth(method="lm")

expected_mov_mult_model <- lm(score_diff_adj ~ elo_diff_adj, data = wnba_elo)
summary(expected_mov_mult_model)

wnba_elo %>%
  ggplot(aes(x = elo_diff, y = score_diff)) +
  geom_point() +
  geom_smooth(method="lm")

elo_to_points_model <- lm(score_diff ~ elo_diff, data = wnba_elo)
summary(elo_to_points_model)
# elo_diff coefficient estimate is 0.038489
# 1 / 0.038489 = 25.9814492452
# So, divide elo_diff by 26 to convert to points
# this is my "SPREAD_MULT"

hist(wnba_elo$score_diff)
sd(wnba_elo$score_diff)



