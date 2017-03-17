<?php

class MC4WP_Ecommerce_Admin_Ajax {

    public function hook() {
        add_action( 'wp_ajax_mc4wp_ecommerce_synchronize_products', array( $this, 'synchronize_products' ) );
        add_action( 'wp_ajax_mc4wp_ecommerce_synchronize_orders', array( $this, 'synchronize_orders' ) );
        add_action( 'wp_ajax_mc4wp_ecommerce_process_queue', array( $this, 'process_queue' ) );
    }

    /**
     * Checks if current user has `manage_options` capability or kills the request.
     */
    private function authorize() {
        if( ! current_user_can( 'manage_options' ) ) {
            status_header( 401 );
            exit;
        }
    }

    /**
     * Synchronize a product,
     */
    public function synchronize_products() {
        $this->authorize();

        // make sure product_id is given
        if( empty( $_POST['product_id'] ) ) {
            wp_send_json_error(
                array(
                    'message' => sprintf( 'Invalid product ID.' )
                )
            );
        }

        $product_id = (int) $_POST['product_id'];
        $ecommerce = $this->get_ecommerce();

        try {
            $ecommerce->update_product( $product_id );
        } catch( Exception $e ) {
            wp_send_json_error(
                array(
                    'message' => sprintf( "Error adding product %d: %s", $product_id, $e )
                )
            );
        }

        wp_send_json_success(
            array(
                'message' => sprintf( 'Success! Added product %d to MailChimp.', $product_id )
            )
        );
    }

    /**
     * Synchronize an order.
     */
    public function synchronize_orders() {
        $this->authorize();

        // make sure order_id is given
        if( empty( $_POST['order_id'] ) ) {
            wp_send_json_error(
                array(
                    'message' => sprintf( 'Invalid order ID.' )
                )
            );
        }

        $order_id = (int) $_POST['order_id'];

        // unset tracking cookies temporarily because these would be the admin's cookie
        unset( $_COOKIE['mc_tc'] );
        unset( $_COOKIE['mc_cid'] );

        // add order
        $ecommerce = $this->get_ecommerce();

        try {
            $ecommerce->update_order( $order_id );
        } catch( Exception $e ) {
            wp_send_json_error(
                array(
                    'message' => sprintf( "Error adding order %d: %s", $order_id, $e )
                )
            );
        }

        wp_send_json_success(
            array(
                'message' => sprintf( 'Success! Added order %d to MailChimp.', $order_id )
            )
        );
    }

    /**
     * Process the background queue.
     */
    public function process_queue() {
        $this->authorize();

        do_action( 'mc4wp_ecommerce_process_queue' );
        wp_send_json(true);
    }

    /**
     * @return MC4WP_Ecommerce
     */
    public function get_ecommerce() {
        return mc4wp('ecommerce');
    }
}