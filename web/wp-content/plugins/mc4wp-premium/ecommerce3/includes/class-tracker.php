<?php

class MC4WP_Ecommerce_Tracker {

    /**
	 * Add hooks
	 */
	public function hook() {
		add_action( 'init', array( $this, 'listen' ) );
		add_action( 'woocommerce_checkout_update_order_meta', array( $this, 'attach_order_meta' ), 50 );
	}

	/**
	 * Listen for "mc_tc" in the URL.
	 */
	public function listen() {
		static $keys = array(
			'mc_tc',
			'mc_cid',
			'mc_eid',
		);
		$cookie_time = 14 * 24 * 60 * 60; // 14 days

		foreach( $keys as $key ) {
			$value = $this->get_url_value( $key );

			if( ! empty( $value ) ) {
				setcookie( $key, $value, time() + $cookie_time, '/' );
			}
		}
	}

	/**
	 * @param int $order_id
	 */
	public function attach_order_meta( $order_id ) {

		$tracking_code = $this->get_tracking_code();
		if( ! empty( $tracking_code ) ) {
			update_post_meta( $order_id , 'mc_tc', $tracking_code );
		}

		$campaign_id = $this->get_campaign_id();
		if( ! empty( $campaign_id ) ) {
			update_post_meta( $order_id , 'mc_cid', $campaign_id );
		}

		$email_id = $this->get_email_id();
		if( ! empty( $email_id ) ) {
			update_post_meta( $order_id, 'mc_eid', $email_id );
		}
	}

	/**
	 * @param int $order_id (optional)
	 * @param string $key
	 * @return string
	 */
	protected function get_value( $order_id, $key ) {
		$value = '';

		// first, get from order meta
		if( $order_id && is_numeric( $order_id ) ) {
			$value = $this->get_meta_value( $order_id, $key );
		}

		// then, get from URL
		if( empty( $value ) ) {
			$value = $this->get_url_value( $key );
		}

		// then, get from cookie
		if( empty( $value ) ) {
			$value = $this->get_cookie_value( $key );
		}

		return (string) $value;
	}

	/**
	 * @param string $key
	 *
	 * @return string
	 */
	protected function get_url_value( $key ) {
		if( empty( $_GET[ $key ] ) ) {
			return '';
		}

		return sanitize_text_field( $_GET[ $key ] );
	}

	/**
	 * @param string $key
	 *
	 * @return string
	 */
	protected function get_cookie_value( $key ) {
		if( empty( $_COOKIE[ $key ] ) ) {
			return '';
		}

		return sanitize_text_field( $_COOKIE[ $key ] );
	}

	/**
	 * @param int $order_id
	 * @param string $key
	 *
	 * @return string
	 */
	protected function get_meta_value( $order_id, $key ) {
		return (string) get_post_meta( $order_id, $key, true );
	}

    /**
     * @param int $order_id
     * @return string
     */
    public function get_tracking_code( $order_id = null ) {
        return $this->get_value( $order_id, 'mc_tc' );
    }


    /**
	 * @param int $order_id (optional)
	 *
	 * @return string
	 */
	public function get_campaign_id( $order_id = null ) {
		return $this->get_value( $order_id, 'mc_cid' );
	}


	/**
	 * @param int $order_id (optional)
	 *
	 * @return string
	 */
	public function get_email_id( $order_id = null ) {
		return $this->get_value( $order_id, 'mc_eid' );
	}

}