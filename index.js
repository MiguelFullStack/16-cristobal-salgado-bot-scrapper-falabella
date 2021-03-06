const  puppeteer = require('puppeteer-extra');
const { autoScroll } = require('./helpers/autoScroll');
const { addCategory } = require('./helpers/addCategory');
const { saveExcel } = require('./helpers/saveExcel');
const { objToString } = require('./helpers/objToString');
const { stringToObj } = require('./helpers/stringToObj');
const { url } = require('./settings');

let category = [];
let data     = [];
let pageNumber = 1;
let page     = null;
let browser  = null;
let countPage = 0;

const scrap = async (getNextPage) => {
    
    let count = 0;
    const productUrl = [];

    if (countPage == 0) {
        
        browser = await puppeteer.launch({
            defaultViewport: null,
            headless: false,
            args: [
                '--start-maximized',
            ],
        })
        
        page = (await  browser.pages())[0]
        page.setDefaultTimeout(0);
        await page.goto(url);
    }
    if (countPage > 0) {
        pageNumber++; 
        await page.goto(url + `?page=${pageNumber}`); 
    }
    countPage++;
    await page.waitForSelector('#testId-searchResults-products');
    // products
    await autoScroll(page);
    const products    = await page.$$('#testId-searchResults-products > div');
    getNextPage = await page.$('#testId-pagination-top-arrow-right');

    // iterate over products
    for (const product of products) {
    // get product name
        const productName = await product.$eval('div.pod-details.pod-details-4_GRID.has-stickers > a', element => element.href);
        
        productUrl.push(productName);
        count++
        if (count == products.length) {
            for (const productScreen of productUrl) {
                const page2 = (await  browser.newPage());
                await page2.waitForTimeout(2000);
                page2.setDefaultNavigationTimeout(0);
                page2.setDefaultTimeout(0);
            
                await page2.goto(productScreen);
                await autoScroll(page2);
                // get Array
                let typeDelivery   = [];
                let espectName     = [];
                let espectValue    = [];
                let img            = [];


                // Selectors
                const brandSelector              = await page2.$('#pdp-product-brand-link');
                const breadcrumbSelector         = await page2.$('#breadcrumb > ol');
                const imgSelector                = await page2.$$('section.pdp-image-section > div.imageGallery.fa--image-gallery > div.headline-wrapper.fa--image-gallery-item__desktop > div > img');
                const priceSelector              = await page2.$('ol > li > div > span');
                const sellerSelector             = await page2.$('#testId-SellerInfo-sellerName > span');
                const skuSelector                = await page2.$('.basic-details-Desktop.rebranded > div:nth-child(1) > .variant-id.fa--variant-id > span');
                const titleSelector              = await page2.$('.basic-details-Desktop.rebranded > div:nth-child(2) > h1 > div');
                // Selectors iterables
                const espectNameSelector         = await page2.$$('table > tbody > tr > td.property-name');
                const espectValueSelector        = await page2.$$('table > tbody > tr > td.property-value');
                const imgSelector2                = await page2.$$('div > div > div > div.pdp-container.container > section.pdp-image-section > div.imageGallery > div.imageHeadlineContainer > div.left-image > div > div > img');
                const typeDeliverySelector       = await page2.$$('div.availability.fa--availability-info__desktop > div > div > div.content.false > div.content-main > span');
                
                
                
                // Extract elements
                const breadcrumb   = breadcrumbSelector ? await page2.evaluate(element => element.innerText.replaceAll('\n', ' > '), breadcrumbSelector) : 'no existe';
                const title        = titleSelector      ? await page2.evaluate(element => element.innerText, titleSelector) : 'no existe';
                const sku          = skuSelector        ? await page2.evaluate(element => element.innerText, skuSelector) : 'no existe';
                const brand        = brandSelector      ? await page2.evaluate(element => element.innerText, brandSelector) : 'no existe';
                const seller       = sellerSelector     ? await page2.evaluate(element => element.innerText, sellerSelector) : 'no existe';
                const price        = priceSelector      ? await page2.evaluate(element => element.innerText, priceSelector) : 'no existe';                
                // Extract elements iterables
                if (espectValueSelector)  for (const iterator of espectValueSelector)  espectValue.push(await page2.evaluate(element => element.innerText, iterator));
                if (espectNameSelector)   for (const iterator of espectNameSelector)   espectName.push(await page2.evaluate(element => element.innerText, iterator)); 
                if (typeDeliverySelector) for (const iterator of typeDeliverySelector) typeDelivery.push(await page2.evaluate(element => element.innerText, iterator));
                if(imgSelector)           for (const iterator of imgSelector ) img.push(await page2.evaluate(element => element.getAttribute('src'), iterator));
                if(imgSelector2)          for (const iterator of imgSelector2) img.push(await page2.evaluate(element => element.getAttribute('src'), iterator));                
                
                // convert array to string
                typeDelivery = typeDelivery.join(' | ');
                const specs = stringToObj(espectName, espectValue);
                category.push(breadcrumb);
                data.push({
                    typeDelivery,
                    breadcrumb,
                    specs: objToString(specs),
                    title,
                    sku: sku.split(': ')[1],
                    brand,
                    seller,
                    price,
                    img: img.toString()
                });
                await page2.close();
                saveExcel(data, addCategory(category));
            }   
        }
    }
    getNextPage ? await scrap(getNextPage) : await page.close();
}


scrap();