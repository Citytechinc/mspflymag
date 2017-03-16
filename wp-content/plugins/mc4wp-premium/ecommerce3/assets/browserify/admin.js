'use strict';

var config = mc4wp_ecommerce;
var Wizard = require('./_wizard.js')(config.i18n);
var qwest = require('qwest');
var m = window.m = require('mithril');

// ask for confirmation for elements with [data-confirm] attribute
require('./_confirm-attr.js')();

var nextButtons = document.querySelectorAll('.wizard-step .button.next');

// product wizard
var productIds = mc4wp_ecommerce.product_ids;
var productCounts = mc4wp_ecommerce.product_count;
var productMount = document.getElementById('mc4wp-ecommerce-products-wizard');
var productBarMount = document.getElementById('mc4wp-ecommerce-products-progress-bar');
var productsWizard = new Wizard(productMount, productBarMount, productCounts.tracked, productCounts.all );
productsWizard.on('tick', productTicker);
productsWizard.on('done', enableNextButtons);
productsWizard.ready() && productsWizard.stop();

// order wizard
var orderCounts = mc4wp_ecommerce.order_count;
var orderIds = mc4wp_ecommerce.order_ids;
var orderMount = document.getElementById('mc4wp-ecommerce-orders-wizard');
var orderBarMount = document.getElementById('mc4wp-ecommerce-orders-progress-bar');
var ordersWizard = new Wizard(orderMount, orderBarMount, orderCounts.tracked, orderCounts.all );
ordersWizard.on('tick', orderTicker);
ordersWizard.on('done', enableNextButtons);
ordersWizard.ready() && ordersWizard.stop();


function enableNextButtons(e) {
    [].forEach.call(nextButtons, function(b) {
        b.removeAttribute('disabled');
    });
}

function orderTicker(wizard) {
    qwest.post(ajaxurl + "?action=mc4wp_ecommerce_synchronize_orders", {
        order_id: orderIds[wizard.index]
    })
        .then(requestSuccessHandler(wizard))
        .catch(requestErrorHandler(wizard));
}


function productTicker(wizard) {
    qwest.post(ajaxurl + "?action=mc4wp_ecommerce_synchronize_products", {
        product_id: productIds[wizard.index]
    })
        .then(requestSuccessHandler(wizard))
        .catch(requestErrorHandler(wizard));
}

function requestErrorHandler(wizard) {
    return function(e, xhr, response) {
        wizard.logger.log(e);

        // proceed anyway
        wizard.tick();
    };
}

function requestSuccessHandler(wizard) {
    return function(xhr, response) {
        if( response.data && response.data.message ) {
            wizard.status(response.data.message, response.success);
        }

        wizard.tick();
    };
}

// queue processor
var qp = require('./_queue-processor.js')(qwest, config.i18n);
var element = document.getElementById('queue-processor');
if( element ) {
    m.mount( element, qp );
}
