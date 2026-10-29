import { Projects } from "./projects.ts";

/**
 * Namespaces of the product built on the template, one file per module,
 * e.g. `export const Projects = { title: { word: "Projects" } } satisfies DictionarySection;`
 * in ./projects.ts. Names must not clash with the core ones. Projects is the
 * example module's: remove it with the module.
 */
export const appDictionary = { Projects };
