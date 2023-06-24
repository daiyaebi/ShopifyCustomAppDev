const script = document.createElement('script');
//ここで任意のjQueryを読み込ませる
script.src = "https://code.jquery.com/jquery-3.2.1.min.js";
script.type = "text/javascript";
const url = "https://4ccf-2400-2200-5ea-b0b2-d07e-6998-ea0-98b1..io";
const head = document.getElementsByTagName('head')[0].appendChild(script);
script.addEventListener('load', () => {
    const header = $('header').parent();
    const makeHeader = products => {
        (window.ebiAppParameters.name) ? header.prepend(`<div>${window.ebiAppParameters.name}様向け：本日のオススメ商品：${products.map(item => {return item.title})}</div>`).css({'background-color': 'khaki', 'text-align': 'center'}) : header.prepend(`<div>ログイン後のマイページより本日のオススメ商品を表示できます</div>`).css({'background-color': 'khaki', 'text-align': 'center'});
    }
    const body = $('body').parent();
    body.css({
        'position': 'relative'
    });
    const makeApp = products => {
        const bestSellerContainer = $(
            `<div style="border-radius: 10px; padding: 10px;">
                <h3 style="font-size: 1.7rem; text-align: center; font-weight: bold;">★★ 売筋商品 ★★</h3>
                ${products.map(item => {
                    return `
                    <div style="display: flex; justify-content: space-evenly; width: 100%; font-size: initial; background-color: cornsilk; margin-bottom: 10px; height: 110px; border-radius: 15px; align-items: center; align-content: center; justify-content: center;">
                        <a href="/products/${item.handle}" style="display: flex; align-items: center; padding: 5px;">
                            <img src=${item.images[0].originalSrc} style="width: 80px; border-radius: 15px;"/>
                        </a>
                        <ul style="list-style: none; margin:0;">
                         <li><p style="padding:0 10px">${item.title}</p></li>
                         <li><button id="cartAdd" onclick=addCartButton(${item.variants[0].id.split("/")[4]}) style="margin-bottom: 10px; width: 100%; border: 1px solid #E7E7E7 !important; border-radius: 8px; background-color: gold; height: 50px; font-size: initial; font-weight: bold;">カートに入れる</button></li>
                        </ul>
                    </div>`
                    }).join('')
                }
            </div>`
        )
        .css({
            'position': 'fixed',
            'background-color': 'khaki',
            'border': '1px solid gainsboro',
            'bottom': '80px',
            'right': '25px',
            'height': '400px',
            'width': '350px',
            'display': 'none'
        });

        const bestSellerButton = $('<button style="margin-bottom: 10px; width: 100px; border: 1px solid #E7E7E7 !important; border-radius: 8px; background-color: gold; height: 50px; font-size: large; font-weight: bold;">売筋商品</button>')
        .css({
            'position': 'fixed',
            'width': '150px',
            'bottom': '20px',
            'right': '20px',
            'cursor': 'pointer'
        });

        body.append(bestSellerButton);
        body.append(bestSellerContainer);
        bestSellerButton.click(() => {
            bestSellerContainer.slideToggle();
        });
    }
    fetch(`${url}/api/products?shop=nlde-store.myshopify.com/`,{ mode: 'cors' })
    .then(res => res.json())
    .then(data => {
        makeHeader(data.data);
        makeApp(data.data);
        console.log(data.data);
    })
    .catch(error => console.log(error))
})
const handler = () => {
    if(window.ebiAppParameters.name){
        const header = $('header').parent();
        header.prepend('<div>右下の売筋商品から購入！！ </div>').css({'background-color': 'khaki', 'text-align': 'center'})
    };
}
const makeHeader = data => {
    header.prepend(`<div>${data}</div>`).css({'background-color': 'khaki', 'text-align': 'center'});
}
const addCartButton = (variantId) => {
    jQuery.post('/cart/add.js', {quantity: 1,id: variantId})
    .done(() => { window.location.href = '/cart';})
    .fail((XMLHttpRequest, textStatus, errorThrown) => { console.log(XMLHttpRequest, textStatus, errorThrown); });
};
script.onreadystatechange = handler;
script.onload = handler;