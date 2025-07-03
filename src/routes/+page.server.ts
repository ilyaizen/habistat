export const prerender = true;

/**
 * Provides a list of pages to be prerendered.
 * This is necessary for adapter-static when pages are not linked with <a> tags.
 */
export const entries: () => string[] = () => {
  return [
    "/"
    // All other pages are either dynamic or explicitly marked with prerender = false.
  ];
};
