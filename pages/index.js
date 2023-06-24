import React, { useState } from 'react';
import { EmptyState, Layout, Page } from '@shopify/polaris';
import { ResourcePicker, TitleBar } from '@shopify/app-bridge-react';
// 「store-js」は、localStorageにJSON形式でデータを保存し取得できるようにするためのライブラリ
import store from 'store-js';
import { ProductList } from '../components/ProductList';
import axios from "axios";

const Index = () => {
  const [modal, setModal] = useState({open: false});
  const emptyState = !store.get('ids');
  const handleSelection = (resources) => {
    const idsFromResources = resources.selection.map((product) => product.id);
    setModal({open: false});
    store.set('ids', idsFromResources);
    console.log('this is product ids',store.get('ids'));

    const selectedProducts = resources.selection;

    deleteApiData();

    selectedProducts.map(product => makeApiCall(product));
  }
  const deleteApiData = () => {
    const url = '/api/products';
    axios.delete(url);
  }
  const makeApiCall = async(products) => {
    const url = '/api/products';
    axios.post(url, products).then(result => console.log(result)).catch(error => console.log(error));
  }

  return(
    <React.Fragment>
      <Page>
        <TitleBar primaryAction={{ content: '売筋商品選択', onAction: () => setModal({open: true})}}/>
          <ResourcePicker 
            resourceType="Product" 
            showVariants={false} 
            open={ modal.open } 
            onCancel={ () => setModal( {open: false} )} 
            onSelection={(resources) => handleSelection(resources) }
          />
          {emptyState ?
            <Layout>
              <EmptyState 
                heading="Manage your inventory transfers" 
                action={{content: '商品選択',onAction: () => setModal({open: true})}} 
                secondaryAction={{content: 'Learn more', url: 'https://help.shopify.com'}} 
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"><p>商品選択</p></EmptyState>
            </Layout> :
            <ProductList/>
          }
      </Page>
    </React.Fragment>
  );
}
export default Index;