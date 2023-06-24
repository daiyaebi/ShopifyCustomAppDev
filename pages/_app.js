import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/dist/styles.css";
import translations from "@shopify/polaris/locales/en.json";
// import createApp from '@shopify/app-bridge';
import { ApolloClient } from "apollo-boost"; // GraphQL APIをシンプルにクライアント側で操作するためのライブラリ。
import { ApolloProvider } from "react-apollo";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { useRouter } from 'next/router';
// import ClientRouter from '../components/ClientRouter';
import { Provider, useAppBridge } from "@shopify/app-bridge-react";
import App from "next/app";
import { Redirect } from "@shopify/app-bridge/actions";

const userLoggedInFetch = (app) => {
  /**
   * ApolloClientによって生じるリクエストが認証されるようにする。
   * authenticatedFetch()：Apolloクライアントによって行われたすべてのリクエストにヘッダーを追加します。
   * SessionTokenは、このメソッドの必要に応じて自動的にキャッシュおよび更新されます。
   */
  const fetchFunction = authenticatedFetch(app); 
  return async (uri, options) => {
    const response = await fetchFunction(uri, options);
    if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
      const authUrlHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, authUrlHeader || `/auth`);
      return null;
    }
    return response;
  };
}
const MyProvider = (props) => {
   const router = useRouter();
   const [shop, setShop] = useState(null);
   useEffect(() => {
     if (router.asPath !== router.route) {
       setShop(router.query.shop);
     }
   }, [router]);
   if (!shop) return null;
  const app = useAppBridge();
  const client = new ApolloClient({
    link : new HttpLink({
     fetch: userLoggedInFetch(app),
     fetchOptions: {
       credentials: "include",
     },
    }),
    cache: new InMemoryCache(),
  });
  const Component = props.Component;
  return (
    <ApolloProvider client={client}>
      <Component {...props} />
    </ApolloProvider>
  );
}
class MyApp extends App {
  render() {
    const { Component, pageProps, host } = this.props;
    const config = { apiKey: API_KEY, host: host, forceRedirect: true };
    return (
     // React.Fragmentのコンポーネントを用いるには、「.babelrc」の「presets」セクション内に"@babel/preset-react"を埋め込む必要がある。
     <React.Fragment> 
      <Head>
        <title>Sample App</title>
        <meta charSet="utf-8" />
      </Head>
       {/* <ClientRouter /> */}
       <AppProvider i18n={translations}>
        <Provider config={config}>
         <MyProvider Component={Component} {...pageProps} />
        </Provider>
       </AppProvider>
     </React.Fragment>
    );
  }
}
// // ページロード時にデータを取得する。
MyApp.getInitialProps = async ({ ctx }) => {
  return {
    host: ctx.query.host,
  };
};
export default MyApp;
// END:Default