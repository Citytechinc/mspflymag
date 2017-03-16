'use strict';

var ConfigStore = require('./_config.js');
var Loader = require('./_form-loader.js');

var forms = window.mc4wp.forms;
var busy = false;
var config = new ConfigStore('mc4wp_ajax_vars');

// failsafe against including script twice
if( config.get('ready') ) {
	return;
}

forms.on('submit', function( form, event ) {

	// does this form have AJAX enabled?
	// @todo move to data attribute?
	if( form.element.getAttribute('class').indexOf('mc4wp-ajax') < 0 ) {
		return;
	}

	try{
		submit(form);
	} catch(e) {
		console.error(e);
		return true;
	}

	event.returnValue = false;
	event.preventDefault();
	return false;
});

function submit( form ) {

	var loader = new Loader(form.element);
	var loadingChar = config.get('loading_character');
	if( loadingChar ) {
		loader.setCharacter(loadingChar);
	}

	function start() {
		// Clear possible errors from previous submit
		form.setResponse('');
		loader.start();
		fire();
	}

	function fire() {
		// prepare request
		busy = true;
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			// are we done?
			if (this.readyState == 4) {
				clean();

				if (this.status >= 200 && this.status < 400) {
					// Request success! :-)
					try {
						var response = JSON.parse(this.responseText);
					} catch(error) {
						console.log( 'MailChimp for WordPress: failed to parse AJAX response.\n\nError: "' + error + '"' );

						// Not good..
						form.setResponse('<div class="mc4wp-alert mc4wp-error"><p>'+ config.get('error_text') + '</p></div>');
						return;
					}

					process(response);
				} else {
					// Error :(
					console.log(this.responseText);
				}
			}
		};
		request.open('POST', config.get('ajax_url'), true);
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		request.send(form.getSerializedData());
		request = null;
	}

	function process( response ) {

		forms.trigger('submitted', [form]);

		if( response.error ) {
			form.setResponse(response.error.message);
			forms.trigger('error', [form, response.error.errors]);
		} else {
			var data  = form.getData();

			// Show response message
			form.setResponse(response.data.message);

			if( response.data.hide_fields ) {
				form.element.querySelector('.mc4wp-form-fields').style.display = 'none';
			}

			if( response.data.redirect_to ) {
				window.location.href = response.data.redirect_to;
			}

			// finally, reset form element
			form.element.reset();

			// trigger events
			forms.trigger('success', [form, data]);
			forms.trigger( response.data.event, [form, data ]);
		}
	}

	function clean() {
		loader.stop();
		busy = false;
	}

	// let's do this!
	if( ! busy ) {
		start();
	}
}

config.set('ready', true);