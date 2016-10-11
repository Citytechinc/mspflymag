<?php
defined( 'ABSPATH' ) or exit;


?>
<div class="metabox-holder">
<div class="postbox">
	<h3 style="margin-top: 0;"><span><?php _e( 'Delete all log items', 'mailchimp-for-wp' ); ?></span></h3>
	<div class="inside">
		<form method="POST" onsubmit="return confirm('Are you sure?');">
			<input type="hidden" name="_mc4wp_action" value="log_empty" />
			<p>
				<?php _e( 'Use the following button to <strong>clear all of your log items at once</strong>.', 'mailchimp-for-wp' ); ?>
			</p>
			<p>
				<input type="submit" class="button" value="<?php esc_attr_e( 'Empty Log', 'mailchimp-for-wp' ); ?>" />
			</p>
		</form>
	</div><!-- .inside -->
</div>
</div>