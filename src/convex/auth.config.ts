export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
      // Use the standard "sub" claim which contains the user ID
    },
  ],
};
