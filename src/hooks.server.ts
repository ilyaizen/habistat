// Server-side hooks removed for static builds
// Since we're using prerender=true and ssr=false,
// no server-side authentication handling is needed
export const handle = async ({ event, resolve }) => {
  return await resolve(event);
};
