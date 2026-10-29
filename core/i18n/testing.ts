import { createTranslator } from "next-intl";

import messages from "@/messages/en.json";

/** The English translator, for tests of validators, error mappers and store configs. */
export const englishT = createTranslator({ locale: "en", messages });
