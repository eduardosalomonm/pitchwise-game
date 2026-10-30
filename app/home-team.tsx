'use client';
import { createContext, useContext } from 'react';
import { HOME_TEAM, type TeamIdentity } from '@/lib/teams';

// The club the player controls. Pitchwise FC unless a screen (My Tournament) provides
// the player's own club; match, score, kit and penalty components read it from here.
export const HomeTeamContext = createContext<TeamIdentity>(HOME_TEAM);
export const useHomeTeam = () => useContext(HomeTeamContext);
