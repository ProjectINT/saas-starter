import "server-only";

import type { Metadata } from "next";
import type { Messages } from "next-intl";
import type { MessageKey } from "./translate";

import { getTranslations } from "next-intl/server";


/** `export const generateMetadata = pageMetadata("members");` for a page with a translated title. */
export const pageMetadata = (key: keyof Messages["Metadata"]) => async (): Promise<Metadata> => {
  const t = await getTranslations("Metadata");

  return { title: t(key) };
};

/** The same for product pages, whose titles live in the product's namespace: `pageTitle("Projects.title")`. */
export const pageTitle = (key: MessageKey) => async (): Promise<Metadata> => {
  const t = await getTranslations();

  return { title: t(key) };
};
