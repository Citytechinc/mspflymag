'use strict';

var qwest;
var qp = {};
var i18n;

function process(e) {
    var ctrl = this;

    e && e.preventDefault();

    ctrl.working = true;
    ctrl.done = false;

    qwest.post( ajaxurl, {
        action: "mc4wp_ecommerce_process_queue"
    }).then(function(xhr, response ) {
        ctrl.done = true;
        ctrl.working = false;
        m.redraw();
    }).catch(function(e, xhr, response) {
        console.log(e);
    });
}

qp.controller = function() {
   return {
       working: false,
       done: false
   }
};

qp.view = function(ctrl) {
    return m('form', {
        method: "POST",
        onsubmit: process.bind(ctrl)
    }, [
       m('p', [
           m( 'input', {
               type: "submit",
               className: "button",
               value: ctrl.done ? i18n.done : i18n.process,
               disabled: ctrl.working || ctrl.done
           }),
           ctrl.working ? [ ' ', m('span.mc4wp-loader'), ' ', m('span.help', i18n.processing )] : ''
       ])
    ]);
};

module.exports = function(a, b) {
    qwest = a;
    i18n = b;
    return qp;
};