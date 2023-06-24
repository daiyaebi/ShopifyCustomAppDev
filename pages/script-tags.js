import React from 'react';
import gql from 'graphql-tag';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { Button, Card, Layout, Page, ResourceList, Stack } from '@shopify/polaris';

const CREATE_SCRIPT_TAG = gql`mutation scriptTagCreate($input: ScriptTagInput!) {
        scriptTagCreate(input: $input) {
            scriptTag {
                id
            }
            userErrors {
                field
                message
            }
        }
    }
`;

const DELETE_SCRIPT_TAG = gql`
    mutation scriptTagDelete($id: ID!) {
        scriptTagDelete(id: $id) {
            deletedScriptTagId
            userErrors{
                field
                message
            }
        }
    }
`;

const QUERY_SCRIPT_TAG = gql`query{
    scriptTags(first:6){
      edges{
        node{
          id
          src
          displayScope
        }
      }
    }
  }
`;

const ScriptPage = () => {
    const [ createScripts ] = useMutation(CREATE_SCRIPT_TAG);
    const [ deleteScripts ] = useMutation(DELETE_SCRIPT_TAG);
    const { loading, error, data } = useQuery(QUERY_SCRIPT_TAG);
    const onClickCreateScripts = () => {
        createScripts({
            variables: {
                input: {
                    src: `${process.env.NEXT_PUBLIC_HOST}/test-script.js`,
                    displayScope: "ALL"
                }
            },
            refetchQueries:  [{query: QUERY_SCRIPT_TAG}]
        })
    }
    const onClickDeleteScripts = (itemNodeId) => {
        deleteScripts({
        variables: {
            id: itemNodeId
        },
        refetchQueries: [{ query: QUERY_SCRIPT_TAG }]
    })}
    if(loading) return <div>{loading}</div>
    if(error) return <div>{error.message}</div>
    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card title="スクリプトタグ一覧" sectioned><p>スクリプトタグ作成</p></Card>
                </Layout.Section>
                <Layout.Section>
                    <Card title="スクリプトタグ作成" sectioned>
                        <Button 
                            primary
                            size="slim"
                            type="submit"
                            onClick={() => onClickCreateScripts()}
                        >作成</Button>
                    </Card>
                </Layout.Section>
                <Layout.Section>
                    <Card>
                        <ResourceList
                        showHeader
                        resourceName={{ singular: 'Script', plural: 'Scripts' }}
                        items={data.scriptTags.edges}
                        renderItem={item => {
                            return(    
                            <ResourceList.Item
                                id={item.id}
                            >
                            <Stack>
                                <Stack.Item>
                                    <p>
                                        {item.node.id}
                                    </p>
                                </Stack.Item>
                                <Stack.Item>
                                    <Button type='submit' 
                                            onClick={() => {onClickDeleteScripts(item.node.id)}}
                                    >削除</Button>
                                </Stack.Item>
                            </Stack>
                            </ResourceList.Item>
                            )
                        }}
                        />
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    )
}

export default ScriptPage;