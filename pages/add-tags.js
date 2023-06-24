import React,{ useState, useCallback, memo } from "react";
import gql from 'graphql-tag';
import { useMutation } from '@apollo/react-hooks';
import { Button, Card, Layout, Page, TextField } from '@shopify/polaris';
import createApp from '@shopify/app-bridge';
import { Modal } from '@shopify/app-bridge/actions';
const search = process.browser ? location.search : '';
const config = {
    apiKey: `${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}`,
    host: new URLSearchParams(search).get("host"),
    forceRedirect: true
};
const app = createApp(config);
const modalFail = {
    title: 'タグ付与処理',
    message: '失敗しました',
  };
const modalSccess = {
    title: 'タグ付与処理',
    message: '成功しました',
  };
const failModal = Modal.create(app, modalFail);
const successModal = Modal.create(app, modalSccess);

const ADD_CUSOTMER_TAG = gql`
    mutation addTags($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
            node {
                id
            }
            userErrors {
                message
            }
        }
    }`;

const AddTags = memo(() => {
    const [addCustomerTagScripts] = useMutation(ADD_CUSOTMER_TAG, {
    onError: (error) => {
        failModal.dispatch(Modal.Action.OPEN);
        console.log(error);
    },
    onSuccess: (data) => {
        successModal.dispatch(Modal.Action.OPEN);
        console.log(data);
    }
    });
    const [value, setValue] = useState("");
    const [value2, setValue2] = useState("");
    const handleChange = useCallback((newValue) => { setValue(newValue); console.log(newValue)}, []);
    const handleChange2 = useCallback((newValue2) => { setValue2(newValue2); console.log(newValue2)}, []);
    const onClickAddCustomerTag = (value, value2) => {
        addCustomerTagScripts({
            variables: {
                  id : `gid://shopify/Customer/${value2}`,
                  tags : `${value}`
                }
        });
    }
    return(
        <Page>
            <Layout>
                <Layout.Section>
                    <Card title="会員情報にタグ追加" sectioned>
                        <TextField
                          label="追加タグ"
                          value={value}
                          onChange={handleChange}
                          autoComplete="off"
                        /><br/>
                        <TextField
                          label="顧客ID"
                          value={value2}
                          onChange={handleChange2}
                          autoComplete="off"
                        /><br/>
                        <Button 
                            primary
                            size="slim"
                            type="submit"
                            onClick={() => onClickAddCustomerTag(value,value2)}
                        >タグ付与</Button>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
});

export default AddTags;