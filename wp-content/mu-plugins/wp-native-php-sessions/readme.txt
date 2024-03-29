=== WordPress Native PHP Sessions ===
Contributors: getpantheon, outlandish josh, mpvanwinkle77, danielbachhuber
Tags: comments, sessions
Requires at least: 3.0.1
Tested up to: 4.6
Stable tag: 0.5
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Use native PHP sessions and stay horizontally scalable. Better living through superior technology.

== Description ==

WordPress core does not use PHP sessions, but sometimes they are required by your use-case, a plugin or theme.

This plugin implements PHP's native session handlers, backed by the WordPress database. This allows plugins, themes, and custom code to safely use PHP `$_SESSION`s in a distributed environment where PHP's default tempfile storage just won't work.

Note that primary development is on GitHub if you would like to contribute:

https://github.com/pantheon-systems/wp-native-php-sessions

== Installation ==

1. Upload to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress

That's it!

== Frequently Asked Questions ==

= Why not use another session plugin? =

This implements the built-in PHP session handling functions, rather than introducing anything custom. That way you can use built-in language functions like the `$_SESSION` superglobal and `session_start()` in your code. Everything else will "just work".

= Why store them in the database? =

PHP's fallback default functionality is to allow sessions to be stored in a temporary file. This is what most code that invokes sessions uses by default, and in simple use-cases it works, which is why so many plugins do it.

However, if you intend to scale your application, local tempfiles are a dangerous choice. They are not shared between different instances of the application, producing erratic behavior that can be impossible to debug. By storing them in the database the state of the sessions is shared across all application instances.

== Troubleshooting ==

If you see an error like "Fatal error: session_start(): Failed to initialize storage module: user (path: ) in .../code/wp-content/plugins/plugin-that-uses-sessions/example.php on line 2" you likely have a plugin in the mu-plugins directory that is instantiating a session prior to this plugin loading. To fix, you will need to deactivate this plugin and instead load it via an mu-plugin that loads first, e.g. create an mu-plugin called 00.php and add a line in it to include the wp-native-php-sessions/pantheon-sessions.php file and the problem should disappear.


== Changelog ==

= 0.5 =
* Compatibility with PHP 7.
* Adds `pantheon_session_expiration` filter to modify session expiration value.

= 0.4 = 
* Adjustment to `session_id()` behavior for wider compatibility
* Using superglobal for REQUEST_TIME as opposed to `time()`

= 0.3 = 
* Fixes issue related to WordPress plugin load order

= 0.1 =
* Initial release
