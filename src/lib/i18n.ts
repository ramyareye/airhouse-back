export const DEFAULT_LOCALE = "en";

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;

const normalizeLocale = (value?: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!LOCALE_PATTERN.test(normalized)) return null;
  return normalized;
};

export const resolveLocale = (input: {
  req: {
    query: (key: string) => string | undefined;
    header: (key: string) => string | undefined;
  };
}) => {
  const fromQuery = normalizeLocale(input.req.query("lang"));
  if (fromQuery) return fromQuery;

  const fromHeader = normalizeLocale(input.req.header("x-lang"));
  if (fromHeader) return fromHeader;

  const acceptLanguage = input.req.header("accept-language");
  const firstLocale = acceptLanguage?.split(",")[0]?.split(";")[0];
  const fromAcceptLanguage = normalizeLocale(firstLocale);
  if (fromAcceptLanguage) return fromAcceptLanguage;

  return DEFAULT_LOCALE;
};
