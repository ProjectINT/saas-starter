import type { DictionarySection } from "../types.ts";

// Example module (modules/example): remove with the module.

export const Projects = {
  nav: { word: "Projects", context: "Tab of the account navigation" },
  title: { word: "Projects", context: "Page heading and browser tab title" },
  description: { word: "Projects of {account}.", tip: "{account} is a team workspace name" },
  name: { word: "Project name", context: "Field label" },
  descriptionField: { word: "Description", context: "Field label (optional)" },
  nameRequired: { word: "Enter the project name." },
  create: { word: "Create project", context: "Button" },
  created: { word: "Project {name} created." },
  createFailed: { word: "Could not create the project. Try again." },
  empty: { word: "No projects yet." },
  loadFailed: { word: "Could not load the projects." },
  remove: { word: "Delete {name}", context: "Icon button label for screen readers" },
  removeTitle: { word: "Delete {name}?" },
  removeBody: { word: "The project is deleted for everyone in the account." },
  removeConfirm: { word: "Delete", context: "Confirmation button" },
  removed: { word: "Project {name} deleted." },
  removeFailed: { word: "Could not delete the project. Try again." },
} satisfies DictionarySection;
