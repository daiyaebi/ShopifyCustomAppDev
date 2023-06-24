import "isomorphic-fetch";
import { gql } from "apollo-boost";

const ADD_ORDER_TAGS = gql`mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
          node {
              id
          }
          userErrors {
            field
            message
          }
      }
  }`;

const ADD_CUSTOMER_TAGS = gql`mutation addTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
        node {
            id
        }
        userErrors {
          field
          message
        }
    }
}`;

export const addOrderTags = async (ctx) => {
  const { client } = ctx;
  const confirmationAddTags = await client.mutate({
      variables: { 
          "id" : `${ctx.state.webhook.payload.admin_graphql_api_id}`,
          "tags" : "New" 
      },
      mutation: ADD_ORDER_TAGS
    })
    .then((response) => response.data)
    .catch(err => { console.log("catch", err); });
  await ctx.redirect(confirmationAddTags);
};

export const addCusomerTags = async (ctx) => {
  const { client } = ctx;
  const confirmationAddTags = await client.mutate({
      variables: { 
          "id" : `${ctx.state.webhook.payload.customer.admin_graphql_api_id}`,
          "tags" : "New" 
      },
      mutation: ADD_CUSTOMER_TAGS
    })
    .then((response) => response.data)
    .catch(err => { console.log("catch", err); });
  await ctx.redirect(confirmationAddTags);
};
