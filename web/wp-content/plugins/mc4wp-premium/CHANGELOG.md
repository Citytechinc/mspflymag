Changelog
==========

#### 3.3.7 - February 14, 2017

**Fixes**

- E-commerce: Fixes "Schema describes ..." errors by enforcing MailChimp's JSON scheme.
- Use correct email address when updating an abandoned cart if user has two email addresses.

**Improvements**

- E-commerce: Strip HTML from product titles.
- E-commerce: Update customer data in MailChimp separately from updating a cart.

**Additions**

- E-commerce: Added `mc4wp_ecommerce_product_data` filter to modify product data before sending to MailChimp.


#### 3.3.6 - January 16, 2017

**Improvements**

- E-commerce: Handle deleted products in (old) orders by sending a "generic deleted product" to MailChimp.
- E-commerce: Update parent product instead of individual product variants.
- Email notifications: Write info line to debug log whenever an email is sent.

**Additions**

- E-commerce: Add `mc4wp_ecommerce_send_order_to_mailchimp` filter hook.

**Fixes**

- E-commerce: Products missing top level `url` attribute would break product block in MailChimp campaigns.


#### 3.3.5 - December 20, 2016

**Fixes**

- Fatal error on sites still running on PHP 5.2.


#### 3.3.4 - December 12, 2016

**Improvements**

- E-commerce: Force-save queue when processing items, because save action may never be called on very long-lived processes.
- AJAX Forms: Replace configuration with lazy loaded config store to work better with WP Rocket.
- E-commerce: Add help text about connecting your store to a different MailChimp list.


#### 3.3.3 - November 30, 2016

**Fixes**

- E-commerce: `ajaxurl` not set on WooCommerce checkout when capturing guest email for cart tracking.

**Improvements**

- E-commerce: Various SQL performance optimisations 
- E-commerce: Don't exit WP CLI command on errors.
- E-commerce: Use `shop_single` image size for products in MailChimp (instead of the smaller thumbnail)


#### 3.3.2 - November 23, 2016

**Improvements**

- E-commerce: Background queue won't stall on PHP errors now.
- E-commerce: Show "last updated" time on settings page.
- E-commerce: Show status text while processing background jobs.
- E-commerce: Don't try to send abandoned carts without an email address.
- E-commerce: Write PHP errors in background queue to debug log.


#### 3.3.1  - November 2, 2016

**Fixes**

- E-commerce: "Schema describes string, integer found instead" error when adding orders.

**Improvements**

- Don't show e-commerce settings when store is not connected to a list yet.
- E-commerce: When campaign data for an order becomes corrupted, we'll now auto-retry without that campaign data.
- E-commerce: Check if user has `billing_email` before updating remote customer.
- E-commerce: Send "draft" products to MailChimp too. These will not be included in Product Recommendations.
- E-commerce wizard now always starts with most recent orders.
- Failsafe against including AJAX script for forms twice.

**Additions**

- Add `mc4wp_ecommerce_customer_data` to filter customer data that is sent to MailChimp.


#### 3.3 - October 18, 2016

This release allows you to [integrate your WooCommerce store with MailChimp's newest API](https://mc4wp.com/kb/upgrading-ecommerce-api-v3/), enabling cool things like [product recommendations](https://mailchimp.com/features/product-recommendations/) & [abandoned cart recovery](https://mailchimp.com/features/abandoned-cart/).


#### 3.2.2 - September 8, 2016

**Fixes**

- Remove usage of PHP 5.3 constant in activation hook.
- Don't send admin cookies when manually adding past e-commerce orders.

**Improvements**

- Strip special characters from e-commerce product names.
- Show Top Bar sing-ups in Reports > Statistics graph.
- Make all columns in log table sortable.
- Memory usage improvements for AJAX forms & in-plugin knowledge base search.
- Improved compatibility with older versions of WooCommerce.


#### 3.2.1 - August 11, 2016

**Fixes**

- HTML tags showing in plain text email notifications when using `[_ALL_]` tag.
- Order of radio inputs on RTL sites.

**Improvements**

- Better margin in Styles Builder when running MailChimp for WordPress 4.0.
- Default to `px` widths in Styles Builder so they don't have to be explicitly given.
- Minor performance improvements.

**Additions**

- Added text color option to Styles Builder for notices.


#### 3.2 - August 4, 2016

**Fixes**

- Never use `[UNIQID]` as a campaign identifier in e-commerce tracking.
- Fatal error when adding old orders that reference deleted WooCommerce products.

**Improvements**

- Better data structure for sign-up logging, so importing into MailChimp is easier.
- New detailed item view for all successful sign-up attempts.
- Log export now uses TAB as a delimiter.
- Logging compatibility with upcoming [MailChimp for WordPress 4.0 release](https://mc4wp.com/kb/upgrading-to-4-0/).


#### 3.1.10 - July 13, 2016

**Fixes**

- Issue with Manual CSS in Styles Builder being escaped.


##### 3.1.9 - June 21, 2016

**Fixes**

- eCommerce360: campaign cookie wasn't taken into account for orders that require manual action before they are "completed"

**Improvements**

- Styles Builder: Improved file creation.
- Styles Builder: Better error messages
- Styles Builder: Don't show "copy from other form" dropdown if there is just 1 form.


##### 3.1.8 - June 7, 2016

**Fixes**

- eCommerce360 campaign cookie was stored for just 7 hours, instead of 7 days.
- Custom colored theme not printing CSS styles.
- Log export not working on Windows servers.

**Improvements**

- eCommerce360 order sync now stops on errors.
- Show "draft" forms on Forms overview page.


##### 3.1.7 - May 23, 2016

**Fixes**

- AJAX loading animation now works with `<button>` elements too.

**Additions**

- Filter: `mc4wp_ecommerce360_order_data`, to modify order data before it is sent to MailChimp.
- Filter: `mc4wp_ecommerce360_order_statuses`, specifies which order statuses are sent to MailChip.

##### 3.1.6 - May 10, 2016

**Fixes**

- `GROUPINGS:123` tag not working in email notifications.

**Improvements**

- Set `action` GET parameter for AJAX requests for compatibility with WP-SpamShield.
- Set proper `Allow-Control-Allow-Origin` headers for AJAX requests.
- eCommerce360: Add WooCommerce variations to product name.

**Additions**

- New "Advanced" tab under Reports with form to delete all Log items at once.


##### 3.1.5 - April 18, 2016

**Fixes**

- WooCommerce orders with an associated user account (instead of guest email address) were not being recorded by the "add past orders" screen.
- Running the log export on PHP 5.2 would return an empty CSV file


##### 3.1.4 - March 30, 2016

**Fixes**

- eCommerce360 would try to add orders without an email address to MailChimp.

 **Improvements**

 - Ensure all WooCommerce filters run when sending order data to MailChimp.
 - When AJAX form script errors, the form now falls back to a default form submission.
 - Grouping data is now shown in log table again.

**Additions**

- New "Order Action" for WooCommerce to manually add or delete an eCommerce360 order to/from MailChimp.


##### 3.1.3 - March 22, 2016

**Fixes**

- Script for plotting Reports graph wasn't loaded on some servers.

**Improvements**

- Use later hook priority for rendering form preview in Styles Builder for compatibility with Pagelines DMS.
- Update script dependencies to their latest versions.
- Escape form name throughout settings pages.


##### 3.1.2 - February 29, 2016

**Fixes**

- Email notification didn't get correct `Content-Type` header for HTML.

**Improvements**

- Get form preview to work with unsaved Styles Builder stylesheet.
- Minor improvements for setting button colors in Styles Builder stylesheet.

##### 3.1.1 - February 16, 2016

**Fixes**

- Log would throw error when list had percentage-sign in their name.

**Improvements**

- All `mc4wp_form_email_notification_*` filters now have access to the submitted form (as the second parameter).
- Add JavaScript sourcemaps to minified JS scripts.
- Remove sourcemaps from unminified JS scripts
- Log now takes `mc4wp_lists` filter into account.
- Use earlier hook for Styles Builder preview to prevent incompatibility with some themes.
- Load Styles Builder stylesheet in TinyMCE editor for improved [Shortcake](https://wordpress.org/plugins/shortcode-ui/) support.

**Additions**

- Added `mc4wp_form_email_notification_headers` filter.
- Added `mc4wp_form_email_notification_attachments` filter.


##### 3.1 - January 26, 2016

**Additions**

- [eCommerce360 integration](https://mc4wp.com/kb/what-is-ecommerce360/) for WooCommerce and Easy Digital Downloads.
- [WP-CLI commands for eCommerce360](https://mc4wp.com/kb/ecommerce360-wp-cli-commands/).

**Improvements**

- Log: modify items per page in screen options when viewing log.
- Miscellaneous code improvements


##### 3.0.6 - January 18, 2016

**Fixes**

- Pagination not showing on Log overview page.

**Improvements**

- Memory usage improvements to Log export for huge datasets.
- Make sure Styles Builder stylesheet is loaded over HTTPS when needed.


##### 3.0.5 - December 15, 2015

**Fixes**

- Button to export log was no longer working after version 3.0

**Improvements**

- Reintroduced support for `data-loading-text` on submit buttons.
- Improved logic for loading animation in submit buttons.
- Styles Builder: Success & error color is now applied to paragraph element, to make sure theme doesn't override the given style.

**Additions**

- Improved email notifications. You can now easily modify the subject line & message body of the email that is sent.


##### 3.0.4 - December 10, 2015

**Fixes**

- Not being able to access Forms page when using strict error reporting.

**Additions**

- Use `mc4wp_use_sslverify` filter to detect whether SSL verification should be used in remote requests.


##### 3.0.3 - December 1, 2015

**Fixes**

- Fatal error when visiting Forms overview page on older PHP versions.

##### 3.0.2 - November 26, 2015

**Fixes**

- Stylesheet file not loaded because of 403 error (due to incorrect file permissions).

= 3.0.1 - November 25, 2015 =

**Improvements**

- AJAX Forms: Perform core logic before triggering events, to prevent erorrs in event callbacks from messing up form flow.
- Styles Builder: Changes are now applied instantly.
- Styles Builder: Clearing a color no longer resets all styles.
- Styles Builder: Try to set correct permissions before writing stylesheet to file.
- KB Search: Make sure all links point to [mc4wp.com](https://mc4wp.com).

**Additions**

- Add link to "Appearance" tab on Forms overview page.


##### 3.0.0 - November 23, 2015

Initial release.

This plugin requires [MailChimp for WordPress](https://wordpress.org/plugins/mailchimp-for-wp/) v3.0 or higher to work.