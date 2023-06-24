import "@babel/polyfill";
import dotenv from "dotenv";
dotenv.config();
import "isomorphic-fetch"; // ブラウザのfetchAPIをシンプルに実行できるだけでなく、クライアントとサーバーサイドの両方で動く。
/**
 * Shopify
 */
import { Shopify } from "@shopify/shopify-api";
import createShopifyAuth from "@shopify/koa-shopify-auth";　// SessionToken利用の場合、「verifyRequest」ではなく、「graphQLProxy」を用いる。
// import getSubscriptionUrl from './server/getSubscriptionUrl'; //公開Appの料金徴収用のモジュールと思われる。カスタムAppには不必要だと思われる。
/**
 * Backend Job
 */
import next from "next"; // Next.jsモジュールを取得する。『カスタムサーバー』を構築するために利用する。
import Koa from "koa"; // app.use で渡されているのがMiddlewareの関数です。サーバがリクエストを受け付けると、最初に渡されたMiddlewareから順に処理が進みます
import KoaBody from "koa-body";
import Router from "koa-router";// koa.js の「Middleware」。URLパスによるルーティングを提供してくれるMiddleware。メソッドにはHTTPのアクションを指定します。第一引数にURLのパスを指定し、第二引数以降にそのパスに適応するMiddlewareを実行順に設定。
// const session = require('koa-session'); // セッション管理：クッキー管理の場合にセットされる。
/**
 * Webhook
 */
import { registerWebhook, receiveWebhook } from '@shopify/koa-shopify-webhooks'; //koaフレームワーク上で、webhookを利用する。
import { createClient, addOrderTags, addCusomerTags } from "./handlers" // クライアントを定義し(createClient)、.mutateメソッドで、addOrderTags(GraphQL API)を叩いてCRUD操作を行う。
// const getRawBody = require("raw-body"); // raw-bodyモジュールは、ハッシュを生成するために使われる方法。受け取ったリクエストのボディをパースする。
const crypto = require("crypto"); // リクエストボディとShopifyから提供されたシークレットキーからハッシュを生成するために使用する。
/**
 * Session Token
 */
import { verifyToken, getQueryKey } from "koa-shopify-auth-cookieless"; // デフォルトのkoa-shopify-authと入れ替える。
import { graphQLProxy  } from "koa-shopify-graphql-proxy-cookieless"; // GraphQLのプロキシとして動作させるための関数。cookielessOAuth下のセッション管理を実現する。
// import { getSessionToken } from "@shopify/app-bridge-utils";
import isVerified from "shopify-jwt-auth-verify";
import db from '../models/index';
/**
 * Authenication
 */
const querystring = require('querystring');
const jwt = require("jsonwebtoken");


Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: '2021-10',
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

const port = parseInt(process.env.PORT, 10) || 8081;
// cross-envを使用して、環境変数を設定しdevモードかどうかの判定
const dev = process.env.NODE_ENV !== "production"; // Next.jsを開発モードで使用する場合は[True]をセットする。
/**
 * 🌟『カスタムサーバー』を構築
 * 画面はpagesディレクトリ：：Next.jsのルーティング / 内部APIはKoa（Node.jsのルーティング）のカスタムサーバーのAPIと役割分割する。
 * サーバーをNext.jsアプリケーション（フロントエンド）に接続する。
 * server.getRequestHandler()はハンドラを作成し、Koaのserverでリクエストとレスポンスをラップすることで、
 * Nextjs内でURLをルーティングすることが可能になり、通常どおりURLで /pages にアクセスすることができます。
 * Next.jsはKoaのルーティングを覆い囲むだけで、非常に短いコードで『カスタムサーバー』を構築することが可能となる。
 * server.prepare()で別サーバーでNext.jsを使うための初期化を実行。
 */
const server = next({dev});
const handle = server.getRequestHandler();
server.prepare().then(async () => {
  const koa = new Koa();
  // Koa.jsのミドルウェアルーター
  const koaRouter = new Router();
  // Storing the currently active shops in memory will force them to re-login when your server restarts. 
  // You should persist this object in your app.
  const ACTIVE_SHOPIFY_SHOPS = {};

  // EBI追加：demo app2のカスタムロジック
  let products = [];
  koaRouter.get('/api/products', async(ctx) => {
    try {
      ctx.body = {
        status: 'success',
        data: products
      };
    } catch(err) {
      console.log(err);
    }
  });
  koaRouter.post('/api/products', KoaBody(), async(ctx) => {
    try {
      const body = ctx.request.body;
      await products.push(body);
      ctx.body = 'Item Added';
    } catch(err) {
      console.log(err);
    }
  });
  koaRouter.delete('/api/products', KoaBody(), async(ctx) => {
    try{
      products = [];
      ctx.body = "All Item deleted";
    } catch(err) {
      console.log(err);
    }
  });

  koa.keys = [Shopify.Context.API_SECRET_KEY];
  koa.use(
    createShopifyAuth({
      // アプリ認証(OAuth)・インストール実行がされた直後の処理
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const shopKey = shop;
        const host = ctx.query.host;
        ACTIVE_SHOPIFY_SHOPS[shop] = scope;

        /* START：SessionToken
        *  アプリの認証もしくはインストールが実行された直後に「accessToken(オフライン)」を「DB」に保存し、
        *  Cookieless-Auth後も引き続き「accessToken」を使用した「GraphQL」の呼び出しを実現する。
        *  OAuthで取得したAccessTokenとShopDomainを再利用しやすいようにアプリ内のDBに保存する。※Shopify社推奨
        *  Node.jsのORM(Sequelize)
        */ 
        await db.Shop.findOrCreate({ // 条件をみたすデータがなければ新規作成
          where: { shop: shopKey },
          defaults: { // 新規登録するデータ
            accessToken: accessToken
          }
        }).then(([newShop, created]) => {
          if (created) { // データが新規作成された場合
            console.log("created.", shopKey, accessToken);
          } else {
            newShop.update({
              accessToken: accessToken
            }).then(() => {
              console.log("updated.", shopKey, accessToken);
            });
          }
        });
        // END：SessionToken

　　　　　/* 
        *  START：webhook登録(order create ・ app unistall)
        *  ShopifyAPIへのすべてのリクエストは、リクエストの性質に応じて「Basic Authentication」または、「Open Authorization」を使用して認証する必要がある。
        */
        const registrationOrderCreated = await registerWebhook({
          shop: shopKey,
          accessToken: accessToken,
          address: `${process.env.HOST}/webhooks/orders/create`, // Shopifyから送信される通知を受け取るエンドポイント
          topic: 'ORDERS_CREATE', // トリガーとなるイベント
          apiVersion: '2021-10',
        });
        (registrationOrderCreated.success) ? console.log('Successfully registered ORDERS_CREATE webhook!') : console.log(`Failed to register ORDERS_CREATE webhook ${registrationOrderCreated.result}`); 
　　　　　// クライアントを定義し、mutate()メソッドで、GraphQL APIを叩いてCRUD操作を行う。
        koa.context.client = await createClient(shop, accessToken);

        const registrationAppUnistalled = await registerWebhook({
          shop: shopKey,
          accessToken: accessToken,
          address: `${process.env.HOST}/webhooks/app/unistall`,
          topic: "APP_UNINSTALLED",
          apiVersion: '2021-10'
        });
        (registrationAppUnistalled.success) ? console.log('Successfully registered APP_UNINSTALLED webhook!') : console.log(`Failed to register APP_UNINSTALLED webhook: ${registrationAppUnistalled.result}`);
        // END：webhook登録

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/?shop=${shop}&host=${host}`);
      }
    })
  );

　// 「handle」は、Next.js内でURLを解釈しルーティングする。
  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  /**
   * START：App Proxy
   */
  // App Proxy検証：Signature：リクエストがShopify(AppProxy)経由であることを確認
  const computeSignature = (querystringFromClient) => {
    const formattedQueryString = querystringFromClient.replace("/?", "").replace(/&signature=[^&]*/, "").split("&").map(x => querystring.unescape(x)).sort().join("");
    // ハッシュ関数SHA256を用いてクエリストリングとシークレットキーで署名を作成
    const computedSignature = crypto.createHmac('sha256', Shopify.Context.API_SECRET_KEY).update(formattedQueryString, 'utf-8').digest('hex');
    return computedSignature
  }
  koaRouter.post('/app_proxy/scriptTag',  async (ctx) => {
    const signatureFromClient = querystring.parse(ctx.querystring).signature;
    const computedSignature = computeSignature(ctx.querystring);
    if(signatureFromClient === computedSignature){
      ctx.set('Content-Type', 'application/liquid');
      ctx.body = `{%- if customer.id == ${ctx.query.logged_in_customer_id} and customer.id != blank -%}
        <script id="channel-widget">
        window.ebiAppMemberId = "{{customer.id}}"
        window.ebiAppParameters = {
          "name": "{{ customer.name }}",
          "email": "{{ customer.email }}",
          "defaultAddressCity": "{{ customer.default_address.city}}",
          "cartTotalPrice": "{{ cart.total_price | money }}",
          "totalSpent": "{{ customer.total_spent | money }}",
          "ordersCount": "{{customer.orders_count}}",
          "lastOrderCreatedAt": "{{ customer.last_order.created_at | date: %s*1000}}",
          "lastOrderNumber": "{{ customer.last_order.order_number }}",
          "fulfillmentUrl": "{{ fulfillment.tracking_url }}",
          "rank": "{{ customer.metafields.custom.rank }}"
        }
        </script>
      {%- else -%}
        {"status":401,"error":"Invalid request", "passed": "${ctx.query.logged_in_customer_id}", "expected": "{{ customer.id | replace '"', '\"' }}"}
      {%- endif -%}`;
    }
  });
  // END：App Proxy

  /* 
  *  verify webhooks　※ webhook通知を受信するエンドポイントはペイロードを検証する必要があります。通知がもともとShopifyから送られたものであることを確認。
  *  Extract X-Shopify-Hmac-Sha256 Header from the request ※ sha256暗号化base64エンコーディングして実行
  *  X-Shopify-Hmac-Sha256：webhook通知を検証するために使用される「base64」エンコードされた文字列
  *  HMAC：ハッシュベースのメッセージ認証コード
  *  SHARED_SECRET(共有キー) : Shopify webhookからきた通知による変更なのか、アプリ内の処理による変更なのかを判断するために使われる。
  *  raw-bodyモジュールは、ハッシュを生成するために使われる方法。受け取ったリクエストのボディをパースする。
  */
  const verifyWebhook = async (ctx) => {　
    const { headers, request, response } = ctx;
    const { "x-shopify-hmac-sha256": hmac } = headers; 
    const { rawBody } = request;
    const digest = crypto
    .createHmac("SHA256", Shopify.Context.API_SECRET_KEY)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");
    // Compare the created hash with the value of the X-Shopify-Hmac-Sha256 Header ※webhookのヘッダーと比較・検証
    const isVerifyWebhook = Shopify.Utils.safeCompare(digest, hmac);
    (isVerifyWebhook) ? console.log("Shopifyから正常なwebhookリクエストが届きました。") : console.log("このwebhookリクエストには、何か問題があります。");
    console.log(response.status);
    return isVerifyWebhook;
  };
  // receive webhooks
  const webhooks = receiveWebhook({
    secret: Shopify.Context.API_SECRET_KEY
  });
  koaRouter.post('/webhooks/app/unistall', webhooks, async (ctx) => {
    verifyWebhook(ctx);
    console.log(ctx.state.webhook);
    // delete ACTIVE_SHOPIFY_SHOPS[shop]
  });
  koaRouter.post('/webhooks/orders/create', webhooks, async (ctx) => {
    verifyWebhook(ctx);
    console.log(ctx.state.webhook);
    addOrderTags(ctx);
    addCusomerTags(ctx);
  });

  // START：SessionToken(JWT)
  // アプリからの GraphQL の実行も Cookieless-Auth のセッション管理下とする。
  koaRouter.post("/graphql", async (ctx, next) => {
    // Authorizationヘッダを用いた認証の内の、「Bearer認証」を実行する。
    const bearer = ctx.request.header.authorization;　// →　getSessionToken()と同じ。ここで、SessionTokenを取得する。
    // const bearer = getSessionToken();
    const secret = process.env.SHOPIFY_API_SECRET;
    const key = process.env.SHOPIFY_API_KEY;
    const valid = isVerified(bearer, secret, key);
    if (valid) {
      const token = bearer.split(" ")[1];
      const decoded = jwt.decode(token);
      const shop = new URL(decoded.dest).host;
      const dbShop = await db.Shop.findOne({ where: { shop: shop } });
      if (dbShop) {
        const accessToken = dbShop.accessToken;
        // graphQLProxy()：GraphQLのプロキシとして動作させるための関数。cookielessOAuth下のセッション管理を実現する。
        const proxy = graphQLProxy({
          shop: shop,
          password: accessToken,
          version: '2021-10',
        });
        await proxy(ctx, next);
      } else {
        ctx.res.statusCode = 403;
      }
    }
  });
  // Sessionの検証ロジック
  koaRouter.get('/', async (ctx, next) => {
    const shop = getQueryKey(ctx, "shop");
    const dbShop = await db.Shop.findOne({ where: { shop: shop } });
    const token = dbShop && dbShop.accessToken;
    ctx.state = { shopify: { shop: shop, accessToken: token } };
    await verifyToken(ctx, next);
  });
  // END：SessionToken

  koaRouter.get("(/_next/static/.*)", handleRequest); // Static content is clear
  koaRouter.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear

  // routerをミドルウェアに登録します。
  koaRouter.get("/(.*)", async (ctx) => {
    const shop = ctx.query.shop;
    // This shop hasn't been seen yet, go through OAuth to create a session
    if (typeof ACTIVE_SHOPIFY_SHOPS[shop] === "undefined") {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      // 「handle」は、Next.js内でURLを解釈しルーティングする。
      await handleRequest(ctx);
    }
  });

  // CORSエラーとならないようResponse Headerに、下記をセットする。
  koa.use(async (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods","GET, POST, PUT, PATCH, DELETE, OPTION");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    await next();
  });
  koa.use(koaRouter.allowedMethods());
  koa.use(koaRouter.routes()); //router.get();などで生成したルーティングをまとめて設定する。
  koa.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
