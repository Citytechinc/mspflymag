<?php

defined( 'ABSPATH' ) or exit;

/**
 * @since 3.3
 * @return array
 */
function mc4wp_ecommerce_get_settings() {
    $options = get_option( 'mc4wp_ecommerce', array() );
    $options = is_array( $options ) ? $options : array();
   
    $defaults = array(
        'enable_object_tracking' => 0,
        'enable_cart_tracking' => 0,
        'store' => array(
            'list_id' => '',
            'name' => get_bloginfo( 'name' ),
            'currency_code' => get_woocommerce_currency(),
            'is_syncing' => 1,
        ),
        'last_updated' => null,
    );
    $options = array_replace_recursive( $defaults, $options );
    return $options;
}

/**
 * @since 3.3.2
 *
 * @param array $new_settings
 * @return array $settings
 */
function mc4wp_ecommerce_update_settings( array $new_settings ) {
    $old_settings = mc4wp_ecommerce_get_settings();
    $settings = array_replace_recursive( $old_settings, $new_settings );
    update_option( 'mc4wp_ecommerce', $settings );
    return $settings;
}

/**
 * Gets which order statuses should be stored in MailChimp.
 *
 * @private
 * @since 3.3
 * @return array
 */
function mc4wp_ecommerce_get_order_statuses() {
    $order_statuses = array( 'wc-completed', 'wc-processing' );

    /**
     * Filters the order statuses to send to MailChimp
     *
     * @param array $order_statuses
     * @since 3.3
     */
    $order_statuses = apply_filters( 'mc4wp_ecommerce_order_statuses', $order_statuses );

    /**
     * @deprecated Use mc4wp_ecommerce_order_statuses instead.
     * @ignore
     */
    $order_statuses = apply_filters( 'mc4wp_ecommerce360_order_statuses', $order_statuses );

    return $order_statuses;
}

/**
 * @param array $schedules
 * @return array
 */
function _mc4wp_ecommerce_cron_schedules( $schedules ) {
    $schedules['every5minutes'] = array(
        'interval' => 60 * 5,
        'display' => __( 'Every 5 Minutes', 'mc4wp-ecommerce' ),
    );
    return $schedules;
}

/**
 * Schedule e-commerce events with WP Cron.
 */
function _mc4wp_ecommerce_schedule_events() {
    $expected_next = time() + 300;
    $actual_next = wp_next_scheduled( 'mc4wp_ecommerce_process_queue' );

    if( ! $actual_next || $actual_next > $expected_next ) {
        wp_schedule_event( $expected_next, 'every5minutes', 'mc4wp_ecommerce_process_queue' );
    }
}