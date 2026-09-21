export interface CharacterAppearance {
  headSize?: number; faceWidth?: number; bodyWidth?: number; height?: number;
  skinTint?: string; hairColor?: string; topColor?: string; trousersColor?: string; shoesColor?: string;
  glasses?: "none" | "round" | "rectangular"; glassesColor?: string;
}
export const appearanceDefaults = (character: "alex" | "sarah"): Required<CharacterAppearance> => ({
  headSize:1, faceWidth:1, bodyWidth:1, height:1, skinTint:"#ffffff", hairColor:"#614830",
  topColor:character === "sarah" ? "#955740" : "#3c5b6c", trousersColor:"#343b45", shoesColor:"#242830", glasses:"none", glassesColor:"#252c37"
});
