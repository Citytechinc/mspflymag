<?php

class MC4WP_Ecommerce_Cart_Observer {

    /**
     * @var MC4WP_Plugin
     */
    private $plugin;

    /**
     * @var MC4WP_Queue
     */
    private $queue;

    /**
     * @var MC4WP_Ecommerce
     */
    private $ecommerce;

    /**
     * MC4WP_Ecommerce_Tracker constructor.
     *
     * @param MC4WP_Plugin $plugin
     * @var MC4WP_Ecommerce $ecommerce
     * @param MC4WP_Queue $queue
     */
    public function __construct( MC4WP_Plugin $plugin, MC4WP_Ecommerce $ecommerce, MC4WP_Queue $queue ) {
        $this->plugin = $plugin;
        $this->ecommerce = $ecommerce;
        $this->queue = $queue;
    }

    /**
     * Add hooks
     */
    public function hook() {
        add_action( 'wp', array( $this, 'repopulate_cart_from_mailchimp' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'wp_ajax_mc4wp_ecommerce_schedule_cart', array( $this, 'on_checkout_form_change' ) );
        add_action( 'wp_ajax_nopriv_mc4wp_ecommerce_schedule_cart', array( $this, 'on_checkout_form_change' ) );
        add_action( 'woocommerce_checkout_order_processed', array( $this, 'on_order_processed' ) );
        add_action( 'woocommerce_cart_updated', array( $this, 'on_cart_updated' ) );
        add_action( 'woocommerce_add_to_cart', array( $this, 'on_cart_updated' ) );
        add_action( 'woocommerce_cart_item_removed', array( $this, 'on_cart_updated' ) );
        add_action( 'wp_login', array( $this, 'on_cart_updated' ) );
    }

    /**
     * Repopulates a cart from MailChimp if the "mc_cart_id" parameter is set.
     */
    public function repopulate_cart_from_mailchimp() {
        if( empty( $_GET['mc_cart_id'] ) ) {
            return;
        }

        $cart_id = $_GET['mc_cart_id'];
        try {
            $cart_data = $this->ecommerce->get_cart($cart_id);
        } catch( Exception $e ) {
            return;
        }

        // empty cart
        $wc_cart = WC()->cart;
        $wc_cart->empty_cart();

        // add items from MailChimp cart object
        foreach( $cart_data->lines as $line ) {
            $variation_id = $line->product_variation_id != $line->product_id ? $line->product_variation_id : 0;
            $wc_cart->add_to_cart( $line->product_id, $line->quantity, $variation_id );
        }

        // remove pending update & delete jobs
        $this->remove_pending_jobs( 'delete_cart', $cart_id );
        $this->remove_pending_jobs( 'update_cart', $cart_id );
        
        wp_redirect( remove_query_arg( 'mc_cart_id' ) );
    }

    /**
     * @param string $method
     *
     * @param $object_id
     */
    private function remove_pending_jobs( $method, $object_id ) {
        $jobs = $this->queue->all();
        foreach( $jobs as $job ) {
            if( $job->data['method'] === $method && $job->data['args'][0] == $object_id ) {
                $this->queue->delete( $job );
            }
        }
    }

    /**
     * @param string $method
     * @param array $args
     */
    private function add_pending_job( $method, array $args ) {
        $this->queue->put(
            array(
                'method' => $method,
                'args' => $args
            )
        );
    }

    /**
     * Enqueue script on checkout page that periodically sends form data for guest checkouts.
     */
    public function enqueue_assets() {
        if( is_checkout() && ! is_user_logged_in() ) {
            $suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
            wp_enqueue_script( 'mc4wp-ecommerce-cart', $this->plugin->url( "/assets/js/cart{$suffix}.js" ), array(), $this->plugin->version(), true );
            wp_localize_script( 'mc4wp-ecommerce-cart', 'mc4wp_ecommerce_cart', array(
                'ajax_url' => admin_url( 'admin-ajax.php' )
               )
            );
        }
    }

    // triggered via JavaScript hooked into checkoutForm.change
    public function on_checkout_form_change() {

        $data = json_decode( stripslashes( file_get_contents("php://input") ), false );

        // make sure we have at least a valid email_address
        if( empty( $data->billing_email ) || ! is_email( $data->billing_email ) ) {
            return;
        }

        try {
            $customer_data = $this->ecommerce->transformer->customer( $data );
            $cart_data = $this->ecommerce->transformer->cart( $customer_data, WC()->cart );
        } catch( Exception $e ) {
            // don't schedule anything when cart has no order lines.
            wp_send_json_error();
            return;
        }

        $cart_id = $cart_data['id'];

        // remove other pending updates from queue
        $this->remove_pending_jobs( 'update_cart', $cart_id );

        // schedule new update with latest data
        $this->add_pending_job( 'update_cart', array( $cart_id, $cart_data ) );

        // delete previous cart if email address changed
        if( ! empty( $data->previous_billing_email )
            && is_email( $data->previous_billing_email )
            && $data->previous_billing_email !== $data->billing_email ) {

            // get previous cart ID
            $cart_id = $this->ecommerce->transformer->get_cart_id( $data->previous_billing_email );

            // schedule cart deletion
            $this->add_pending_job( 'delete_cart', array( $cart_id ) );
        }

        wp_send_json_success();
    }

    // hook: woocommerce_checkout_order_processed
    public function on_order_processed( $order_id ) {
        $order = wc_get_order( $order_id );
        $cart_id = $this->ecommerce->transformer->get_cart_id( $order->billing_email );

        // remove updates from queue
        $this->remove_pending_jobs( 'update_cart', $cart_id );

        // schedule cart deletion
        $this->add_pending_job( 'delete_cart', array( $cart_id ) );
    }

    // hook: woocommerce_add_to_cart, woocommerce_cart_item_removed
    public function on_cart_updated() {

        // TODO: Get user data for guests from some cookie or session.
        $user = wp_get_current_user();
        if( ! $user || empty( $user->billing_email ) ) {
            return;
        }

        $email_address = $user->billing_email;
        $cart_id = $this->ecommerce->transformer->get_cart_id( $email_address );
        $wc_cart = WC()->cart;

        // delete cart from MailChimp if it is now empty
        if( $wc_cart->is_empty() ) {

            // remove pending updates from queue
            $this->remove_pending_jobs( 'update_cart', $cart_id );

            // schedule cart deletion
            $this->add_pending_job( 'delete_cart', array( $cart_id ) );
            return;
        }

        try {
            $customer_data = $this->ecommerce->transformer->customer( $user );
            $cart_data = $this->ecommerce->transformer->cart( $customer_data, $wc_cart );
        } catch( Exception $e ) {
            $this->get_log()->error( $e->getMessage() );
            return;
        }

        // remove other pending updates from queue
        $this->remove_pending_jobs( 'update_cart', $cart_id );

        // schedule new update with latest data
        $this->add_pending_job( 'update_cart', array( $cart_id, $cart_data ) );
    }

    /**
     * @return MC4WP_Debug_Log
     */
    private function get_log() {
        return mc4wp('log');
    }

}