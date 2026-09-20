import type { CharacterGesture } from './types';

export interface CharacterDef {
  id: string;
  name: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  hairStyle: 'short' | 'long' | 'spiky' | 'curly';
  gender: 'male' | 'female';
  voicePitch: number;
  voiceRate: number;
}

export const CHARACTER_LIBRARY: CharacterDef[] = [
  {
    id: 'alex',
    name: 'Alex',
    skinColor: '#f4c7a3',
    hairColor: '#5b3a20',
    eyeColor: '#3b6fb5',
    shirtColor: '#2563eb',
    pantsColor: '#1e293b',
    shoeColor: '#334155',
    hairStyle: 'short',
    gender: 'male',
    voicePitch: 0.85,
    voiceRate: 0.92,
  },
  {
    id: 'sarah',
    name: 'Sarah',
    skinColor: '#deb887',
    hairColor: '#1a1a2e',
    eyeColor: '#2d6a4f',
    shirtColor: '#059669',
    pantsColor: '#1e293b',
    shoeColor: '#475569',
    hairStyle: 'long',
    gender: 'female',
    voicePitch: 1.25,
    voiceRate: 0.95,
  },
  {
    id: 'max',
    name: 'Max',
    skinColor: '#ffe0bd',
    hairColor: '#d4a843',
    eyeColor: '#6b7b3a',
    shirtColor: '#dc2626',
    pantsColor: '#374151',
    shoeColor: '#1f2937',
    hairStyle: 'spiky',
    gender: 'male',
    voicePitch: 0.75,
    voiceRate: 1.0,
  },
  {
    id: 'mia',
    name: 'Mia',
    skinColor: '#8d5524',
    hairColor: '#1a1a1a',
    eyeColor: '#5a3825',
    shirtColor: '#f59e0b',
    pantsColor: '#1e293b',
    shoeColor: '#44403c',
    hairStyle: 'curly',
    gender: 'female',
    voicePitch: 1.15,
    voiceRate: 0.9,
  },
];

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTER_LIBRARY.find((c) => c.id === id);
}
