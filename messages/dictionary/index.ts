import { appDictionary } from "./app/index.ts";
import { coreDictionary } from "./core/index.ts";

// Source of truth for every UI text. messages/<locale>.json are generated from
// it by scripts/i18n.ts (npm run i18n:build / i18n:translate); never edit
// en.json by hand.
export const dictionary = { ...coreDictionary, ...appDictionary };
