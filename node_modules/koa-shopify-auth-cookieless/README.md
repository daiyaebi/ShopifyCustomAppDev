# koa-shopify-auth-cookieless

This is a fork of the Shopify package https://github.com/Shopify/koa-shopify-auth/blob/master/README.md

This is not sponsored or endorsed by Shopify, or connected with Shopify in any way.

I'm providing this package as a reference for using with Shopify's Next Gen JWT-based Cookieless Auth.

You may be interested in using this cookieless GraphQL Proxy along with this package:
https://www.npmjs.com/package/koa-shopify-graphql-proxy-cookieless

# Important
This is a near drop-in replacement for the official koa-shopify-auth package, but make sure you don't 
import createShopifyAuth as default, use named imports:

```
import { createShopifyAuth, verifyToken, getQueryKey, redirectQueryString } from "koa-shopify-auth-cookieless";

```

# Example
Here's the basic example:
```
server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET,
      scopes: [SCOPES],
      accessMode: "offline",

      async afterAuth(ctx) {
        const redirectQuery = redirectQueryString(ctx);

        ctx.redirect(`/?${redirectQuery}`);
      },
    })
  );
  ```

# Please NOTE:
This package doesn't use any cookies or session.
The intent was to strip functionality down as much as possible in order to focus on 
the OAuth flow and retrieving an accessToken.

Please note that the official @shopify/koa-shopify-auth package uses sessions to manage access tokens. 
This package takes a different approach and allows for persisting the accessToken however you choose. 
While this may work for some situations, you will probably still need to implement some kind of session strategy when your
app goes into production, in order to log the user out after some time interval. 

If you are otherwise persisting your accessTokens with another method, you do not need to implement a session strategy
that stores your tokens in the session. You will just need to create a mechanism for invalidating
sessions on some interval.

Please keep in mind though, that if the user uninstalls the app, the verifyToken function will
force a redirect to /auth.
https://github.com/Shopify/koa-shopify-auth#session

If you want to retrieve the shop or accessToken from the 
context it looks like this:

```
const { shop, accessToken } = ctx.state.shopify;
```

# Using verifyToken
You can use verifyToken to redirect users to /auth whenever their access token becomes invalid.
This is probably not the prettiest way to do this, but this is the way a Python dev does this
when said dev has not had a ton of experience with Koa.

```
router.get("/", async (ctx, next) => {
  const shop = getQueryKey(ctx, "shop");
  // Using Amplify GraphQL here to persist
  // credentials. Use whatever mechanism you'd like.
  const settings = await getAppSettings(shop);
  const token = settings.data.getUser && settings.data.getUser.token;
  ctx.state = { shopify: { shop: shop, accessToken: token } };
  await verifyToken(ctx, next);
});
```

# See Working Demo
I've created a working demo based on the Shopify-CLI Node project.  
<https://github.com/nprutan/shopify-cookieless-auth-demo>  
If you'd like to see this in action, create a new Shopif-CLI project,
and also clone the demo repo. Once you've cloned the demo, you can connect
an existing Shopify project to the demo. Open a terminal in the 
demo directory and use the command:
```shopify connect```

