const DEFAULT_PRISM_ZH_URL = "https://andy-prism-portfolio.netlify.app/build-guide/";
const DEFAULT_PRISM_EN_URL = "https://andy-prism-portfolio.netlify.app/build-guide/en/";
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export interface PrismCourseUrlInput {
  readonly legacy?: string;
  readonly zh?: string;
  readonly en?: string;
}

export interface PrismCourseUrlResolution {
  readonly launchUrls: {
    readonly zh: string;
    readonly en: string;
  };
  readonly allowedOrigins: readonly string[];
}

/**
 * Converts an optional deployment value into a safe embeddable URL.
 * Invalid values are represented as null so configuration mistakes never
 * throw while Next.js evaluates the course manifest during prerendering.
 */
function parseCourseUrl(value: string | undefined): URL | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!HTTP_PROTOCOLS.has(url.protocol) || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Builds the English course route from a validated Chinese/base URL. */
function englishUrlFrom(chineseUrl: URL): URL {
  const englishUrl = new URL(chineseUrl);
  englishUrl.pathname = `${englishUrl.pathname.replace(/\/*$/, "")}/en/`;
  englishUrl.search = "";
  englishUrl.hash = "";
  return englishUrl;
}

/**
 * Resolves the localized Prism course URLs from build-time environment data.
 * Explicit localized values win, the legacy value remains supported, and all
 * missing or malformed inputs fall back to the known production course.
 */
export function resolvePrismCourseUrls(
  input: PrismCourseUrlInput,
): PrismCourseUrlResolution {
  const configuredZhUrl = parseCourseUrl(input.zh) ?? parseCourseUrl(input.legacy);
  const zhUrl = configuredZhUrl ?? new URL(DEFAULT_PRISM_ZH_URL);

  const configuredEnUrl = parseCourseUrl(input.en);
  const enUrl = configuredEnUrl
    && configuredEnUrl.toString() !== zhUrl.toString()
    ? configuredEnUrl
    : null;
  const resolvedEnUrl = enUrl
    ?? (configuredZhUrl ? englishUrlFrom(zhUrl) : new URL(DEFAULT_PRISM_EN_URL));

  return {
    launchUrls: {
      zh: zhUrl.toString(),
      en: resolvedEnUrl.toString(),
    },
    allowedOrigins: Array.from(new Set([zhUrl.origin, resolvedEnUrl.origin])),
  };
}
