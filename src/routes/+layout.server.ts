// Server-side load function removed for static builds
// Since we're using prerender=true and ssr=false,
// authentication will be handled entirely on the client side
export const load = () => {
  return {};
};
