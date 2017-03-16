'use strict';

var Lucy = require('./third-party/lucy.js');
var config = {
	siteUrl: 'https://mc4wp.com/',
	algoliaAppId: 'DA9YFSTRKA',
	algoliaAppKey: 'ce1c93fad15be2b70e0aa0b1c2e52d8e',
	algoliaIndexName: 'wpkb_articles',
	links: [
		{
			text: "<span class=\"dashicons dashicons-book\"></span> Knowledge Base",
			href: "https://mc4wp.com/kb/"
		},
		{
			text: "<span class=\"dashicons dashicons-editor-code\"></span> Code Reference",
			href: "http://developer.mc4wp.com/"
		},
		{
			text: "<span class=\"dashicons dashicons-editor-break\"></span> Changelog",
			href: "http://mc4wp.com/documentation/changelog/"
		}
	],
	contactLink: 'mailto:support@mc4wp.com'
};

// grab from WP dumped var.
if( window.lucy_config ) {
	config.emailLink = window.lucy_config.email_link;
}

var lucy = new Lucy(
	config.siteUrl,
	config.algoliaAppId,
	config.algoliaAppKey,
	config.algoliaIndexName,
	config.links,
	config.contactLink
);