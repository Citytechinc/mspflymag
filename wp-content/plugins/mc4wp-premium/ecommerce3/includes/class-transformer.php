<?php

class MC4WP_Ecommerce_Object_Transformer {

    /**
     * @var MC4WP_Ecommerce_Tracker
     */
    protected $tracker;

    /**
     * @var array
     */
    protected $settings;

    /**
     * MC4WP_Ecommerce_Object_Transformer constructor.
     *
     * @param array $settings
     * @param MC4WP_Ecommerce_Tracker $tracker
     */
    public function __construct( array $settings, MC4WP_Ecommerce_Tracker $tracker ) {
        $this->settings = $settings;
        $this->tracker = $tracker;
    }

    /**
     * @param string $email_address
     *
     * @return string
     */
    public function get_customer_id( $email_address ) {
        return (string) md5( strtolower( $email_address ) );
    }

    /**
     * @param string $customer_email_address
     * @see get_customer_id
     * @return string
     */
    public function get_cart_id( $customer_email_address ) {
        return $this->get_customer_id( $customer_email_address );
    }

    /**
     * @param object|WP_User|WC_Order $object
     *
     * @return array
     *
     * @throws Exception
     */
    public function customer( $object ) {

        if( empty( $object->billing_email ) ) {
            throw new Exception( "Customer data requires a billing_email property", 100 );
        }

        $helper = new MC4WP_Ecommerce_Helper();

        $customer_data = array(
            'email_address' => (string) $object->billing_email,
            'opt_in_status' => false,
            'address' => array(),
        );

        // add order count
        $order_count = $helper->get_order_count_for_email( $object->billing_email );
        if( ! empty( $order_count ) ) {
            $customer_data['orders_count'] = $order_count;
        }

        // add total spent
        $total_spent = $helper->get_total_spent_for_email( $object->billing_email );
        if( ! empty( $total_spent ) ) {
            $customer_data['total_spent'] = $total_spent;
        }

        // fill top-level keys
        $map = array(
            'billing_first_name' => 'first_name',
            'billing_last_name' => 'last_name'
        );
        foreach( $map as $source_property => $target_property ) {
            if( ! empty( $object->$source_property ) ) {
                $customer_data[ $target_property ] = $object->$source_property;
            }
        }

        // fill address keys
        $map = array(
            'billing_address_1' => 'address1',
            'billing_address_2' => 'address2',
            'billing_city' => 'city',
            'billing_state' => 'province',
            'billing_postcode' => 'postal_code',
            'billing_country' => 'country'
        );
        foreach( $map as $source_property => $target_property ) {
            if( ! empty( $object->$source_property ) ) {
                $customer_data['address'][ $target_property ] = $object->$source_property;
            }
        }

        // strip off empty address property
        if( empty( $customer_data['address'] ) ) {
            unset( $customer_data['address'] );
        }

        /**
         * Filter the customer data before it is sent to MailChimp.
         */
        $customer_data = apply_filters( 'mc4wp_ecommerce_customer_data', $customer_data );

        // set ID because we don't want that to be filtered.
        $customer_data['id'] = $this->get_customer_id( $object->billing_email );

        return $customer_data;
    }

    /**
     * @param WC_Order $order
     *
     * @return array
     */
    public function order( WC_Order $order ) {
        // generate order data
        $items = $order->get_items();

        // generate item lines data
        $lines_data = array();
        foreach( $items as $item_id => $item ) {
            // calculate cost of a single item
            $item_price = $item['line_total'] / $item['qty'];

            $line_data = array(
                'id' => (string) $item_id,
                'product_id' => (string) $item['product_id'],
                'product_variant_id' => (string) $item['product_id'],
                'quantity' => (int) $item['qty'],
                'price' => floatval( $item_price ),
            );

            // use variation ID if set.
            if( ! empty( $item['variation_id'] ) ) {
                $line_data['product_variant_id'] = (string) $item['variation_id'];
            }

            $lines_data[] = $line_data;
        }

        // add order
        $data = array(
            'id' => (string) $order->id,
            'customer' => array( 'id' => $this->get_customer_id( $order->billing_email ) ),
            'order_total' => floatval( $order->get_total() ),
            'tax_total' => floatval( $order->get_total_tax() ),
            'financial_status' => (string) $order->get_status(),
            'shipping_total' => floatval( $order->get_total_shipping() ),
            'currency_code' => (string) $order->get_order_currency(),
            'processed_at_foreign' => date('Y-m-d H:i:s', strtotime( $order->order_date ) ),
            'lines' => $lines_data
        );

        // add tracking code(s)
        $tracking_code = $this->tracker->get_tracking_code( $order->id );
        if( ! empty( $tracking_code ) ) {
            $data['tracking_code'] = $tracking_code;
        }

        $campaign_id = $this->tracker->get_campaign_id( $order->id );
        if( ! empty( $campaign_id ) ) {
            $data['campaign_id'] = $campaign_id;
        }

        return $data;
    }

    /**
     * @param WC_Product $product
     *
     * @return array
     */
    public function product( WC_Product $product ) {
        // init product variants
        $variants = array();
        if( $product instanceof WC_Product_Variable ) {
            foreach( $product->get_children() as $product_variation_id ) {
                $product_variation = wc_get_product( $product_variation_id );
                $variants[] = $this->get_product_variant_data( $product_variation );
            }
        } else {
            // default variant
            $variants[] = $this->get_product_variant_data( $product );
        }

        // data to send to MailChimp
        $product_data = array(
            // required
            'id' => (string) $product->get_id(),
            'title' => (string) strip_tags( $product->get_title() ),
            'url' => (string) $product->get_permalink(),
            'variants' => $variants,

            // optional
            'type' => (string) $product->get_type(),
            'image_url' => get_the_post_thumbnail_url( $product->id, 'shop_single' ),
        );

        // add product categories, joined together by "|"
        $category_names = array();
        $category_objects = get_the_terms( $product->id, 'product_cat' );
        if( is_array( $category_objects ) ) {
            foreach( $category_objects as $term ) {
                $category_names[] = $term->name;
            }
            if( ! empty( $category_names ) ) {
                $product_data['vendor'] = join( '|', $category_names );
            }
        }

        /**
         * Filter product data that is sent to MailChimp.
         *
         * @param array $product_data
         */
        $product_data = apply_filters( 'mc4wp_ecommerce_product_data', $product_data );

        // filter out empty values
        $product_data = array_filter( $product_data, function($v) { return ! empty( $v ); } );

        return $product_data;
    }

    /**
     * @param WC_Product $product
     * @return array
     */
    private function get_product_variant_data( WC_Product $product ) {

        // determine inventory quantity; default to 0 for unpublished products
        $post = $product->get_post_data();
        $inventory_quantity = 0;

        // only get actual stock qty when product is published & visible
        if( $post->post_status === 'publish' && $product->visibility !== 'hidden' ) {
            $inventory_quantity = $product->managing_stock() ? $product->get_stock_quantity() : 1; // default to 1 so there's always qty when not managing stock
        }

        $data = array(
            // required
            'id' => (string) $product->get_id(),
            'title' => (string) strip_tags( $product->get_title() ),
            'url' => (string) $product->get_permalink(),

            // optional
            'sku' => (string) $product->get_sku(),
            'price' => floatval( $product->get_price() ),
            'image_url' => (string) get_the_post_thumbnail_url( $product->id, 'shop_single' ),
            'inventory_quantity' => (int) $inventory_quantity
        );

        // if product is variation, replace title with variation attributes.
        // check if parent is set to prevent fatal error.... WooCommerce, ugh.
        if( $product instanceof WC_Product_Variation && method_exists( $product, 'get_formatted_variation_attributes' ) && $product->parent ) {
            $variations = $product->get_formatted_variation_attributes( true );
            if( ! empty( $variations ) ) {
                $data['title'] = (string) $variations;
            }
        }

        // filter out empty values
        $data = array_filter( $data, function($v) { return ! empty( $v ); } );

        return $data;
    }

    /**
     * @param array $customer
     * @param WC_Cart $cart
     *
     * @return array
     *
     * @throws Exception
     */
    public function cart( array $customer, WC_Cart $cart ) {
        $cart_items = $cart->get_cart();
        $lines_data = array();
        $order_total = 0.00;

        // check if cart has lines
        if( empty( $cart_items ) ) {
            throw new Exception( "Cart has no item lines", 100 );
        }

        // generate data for cart lines
        foreach( $cart_items as $line_id => $cart_item ) {
            $product_variant_id = ! empty( $cart_item['variation_id'] ) ? $cart_item['variation_id'] : $cart_item['product_id'];
            $product = wc_get_product( $product_variant_id );

            $lines_data[] = array(
                'id' => (string) $line_id,
                'product_id' => (string) $cart_item['product_id'],
                'product_variant_id' => (string) $product_variant_id,
                'quantity' => (int) $cart_item['quantity'],
                'price' => floatval( $product->get_price() ),
            );

            $order_total += floatval( $product->get_price() ) * $cart_item['quantity'];
        }

        $cart_id = $customer['id']; // use customer ID as cart ID
        $data = array(
            'id' => (string) $cart_id,
            'customer' => $customer,
            'checkout_url' => add_query_arg( array( 'mc_cart_id' => $cart_id ), wc_get_cart_url() ),
            'currency_code' => $this->settings['store']['currency_code'],
            'order_total' => $order_total,
            'lines' => $lines_data,
        );

        return $data;
    }

}