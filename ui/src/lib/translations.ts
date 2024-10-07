import i18n from "sveltekit-i18n";

const config = {
  loaders: [
    {
      locale: "en",
      key: "common",
      loader: async () =>
        (await import("./translations/en/common.json")).default,
    },
    {
      locale: "en",
      key: "contacts",
      routes: [/\/contacts(.*)/, /^\/conversations(.*)/], // you can use regexes as well!
      loader: async () =>
        (await import("./translations/en/contacts.json")).default,
    },
    {
      locale: "en",
      key: "conversations",
      routes: [/^\/conversations(.*)/, "/create"], // you can use regexes as well!
      loader: async () =>
        (await import("./translations/en/conversations.json")).default,
    },
    {
      locale: "en",
      key: "create",
      routes: ["/create", /(.*)\/invite/], // you can use regexes as well!
      loader: async () =>
        (await import("./translations/en/create.json")).default,
    },
    {
      locale: "de",
      key: "common",
      loader: async () =>
        (await import("./translations/de/common.json")).default,
    },
    {
      locale: "de",
      key: "contacts",
      routes: [/\/contacts(.*)/], // you can use regexes as well!
      loader: async () =>
        (await import("./translations/de/contacts.json")).default,
    },
    {
      locale: "de",
      key: "conversations",
      routes: [/^\/conversations(.*)/, "/create"], // you can use regexes as well!
      loader: async () =>
        (await import("./translations/de/conversations.json")).default,
    },
    {
      locale: "de",
      key: "create",
      routes: ["/create", /(.*)\/invite/],
      loader: async () =>
        (await import("./translations/de/create.json")).default,
    },
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(
  config,
);
