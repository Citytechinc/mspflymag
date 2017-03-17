<?php

/**
 * Class MC4WP_Ecommerce_Admin
 *
 * @ignore
 */
class MC4WP_Ecommerce_Admin {

	/**
	 * @var MC4WP_Plugin
	 */
	protected $plugin;

	/**
	 * @var array
	 */
	protected $settings;

    /**
     * @var MC4WP_Queue
     */
    protected $queue;

	/**
	 * MC4WP_Ecommerce_Admin constructor.
	 *
     * @param MC4WP_Queue $queue
	 * @param MC4WP_Plugin $plugin
	 * @param array $settings
	 */
	public function __construct( MC4WP_Plugin $plugin, $queue, $settings ) {
		$this->plugin = $plugin;
        $this->queue = $queue;
		$this->settings = $settings;

        // Don't typehint $queue in constructor as this may be null when e-commerce is disabled
	}

	/**
	 * Add hooks
	 */
	public function add_hooks() {
		add_filter( 'mc4wp_admin_menu_items', array( $this, 'menu_items' ) );
		add_action( 'mc4wp_admin_save_ecommerce_settings', array( $this, 'save_settings' ) );
		add_action( 'mc4wp_admin_ecommerce_reset', array( $this, 'reset_data' ) );
        add_action( 'mc4wp_admin_ecommerce_rollback_to_v2', array( $this, 'rollback_to_v2' ) );
	}

    /**
     * Rolls back to e-commerce on API v2.
     */
	public function rollback_to_v2() {
        // re-enable old option
        $options = get_option( 'mc4wp', array() );
        $options['ecommerce'] = 1;
        update_option( 'mc4wp', $options );

        // delete new option
        delete_option( 'mc4wp_ecommerce' );

        // redirect to wizard
        wp_redirect( admin_url('admin.php?page=mailchimp-for-wp-other' ) );
        exit;
    }

	/**
	 * Runs logic for saving e-commerce settings & wizard.
	 */
	public function save_settings() {
		check_admin_referer( 'save_ecommerce_settings' );
		$dirty = stripslashes_deep( $_POST['mc4wp_ecommerce'] );
        $dirty['platform'] = 'mc4wp';

		$messages = $this->get_admin_messages();

		// merge with current settings to allow passing partial arrays
		$current = $this->settings;
		$dirty = array_replace_recursive( $current, $dirty );
        $diff = array_diff( $dirty['store'], $current['store'] );

		if( ! empty( $diff ) ) {
		    $ecommerce = $this->get_ecommerce();

			try {
				$ecommerce->update_store( $dirty['store'] );
			} catch( Exception $e ) {
				$messages->flash( (string) $e, 'error' );
				$_POST['_redirect_to'] = '';
				return; // return means we're not saving
			}
		}

		// save new settings if something changed
		if( $dirty != $current ) {
			update_option( 'mc4wp_ecommerce', $dirty );
			$messages->flash( 'Settings saved!' );
		}

		// check if queue processor is scheduled
        _mc4wp_ecommerce_schedule_events();
	}

	/**
	 * @param array $items
	 *
	 * @return array
	 */
	public function menu_items( $items ) {
		$items[ 'ecommerce' ] = array(
			'title' => __( 'E-Commerce', 'mc4wp-ecommerce' ),
			'text' => __( 'E-Commerce', 'mc4wp-ecommerce' ),
			'slug' => 'ecommerce',
			'callback' => array( $this, 'show_settings_page' )
		);

		return $items;
	}

	/**
	 * Register menu pages
	 *
	 * @param array $items
	 *
	 * @return array
	 */
	public function add_menu_item( array $items ) {
		$item = array(
			'title' => __( 'MailChimp E-Commerce', 'mc4wp-ecommerce' ),
			'text' => __( 'E-Commerce', 'mc4wp-ecommerce' ),
			'slug' => 'ecommerce',
			'callback' => array( $this, 'show_settings_page' )
		);

		$items[] = $item;
		return $items;
	}

	/**
	 * Show settings page
	 */
	public function show_settings_page() {
		$settings = $this->settings;
		$mailchimp = new MC4WP_MailChimp();
		$lists = $mailchimp->get_lists();
        $connected_list = null;

        // go to wizard when store list_id is empty
        if( $settings['enable_object_tracking'] && empty( $settings['store']['list_id'] ) && ! isset( $_GET['wizard'] ) ) {
            wp_safe_redirect( add_query_arg( array( 'wizard' => 1 ) ) );
            return;
        }

		$helper = new MC4WP_Ecommerce_Helper();
		$product_count = new MC4WP_Ecommerce_Object_Count( $helper->get_product_count( false ), $helper->get_product_count( true ) );
		$order_count = new MC4WP_Ecommerce_Object_Count( $helper->get_order_count( false ), $helper->get_order_count( true ) );

		$suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
		wp_enqueue_style( 'mc4wp-ecommerce-admin', $this->plugin->url( '/assets/css/admin' . $suffix . '.css' ), array(), $this->plugin->version() );
		wp_enqueue_script( 'mc4wp-ecommerce-admin', $this->plugin->url( '/assets/js/admin' . $suffix . '.js' ), array(), $this->plugin->version(), true );
		wp_localize_script( 'mc4wp-ecommerce-admin', 'mc4wp_ecommerce', array(
		    'i18n' => array(
		        'done' => __( 'All done!', 'mc4wp-ecommerce' ),
                'pause' => __( 'Pause', 'mc4wp-ecommerce' ),
                'resume' => __( 'Resume', 'mc4wp-ecommerce' ),
                'confirmation' => __( 'Are you sure you want to do this?', 'mc4wp-ecommerce' ),
                'process' => __( 'Process', 'mc4wp-ecommerce' ),
                'processing' => __( 'Processing queue, please wait.', 'mc4wp-ecommerce' ),
            ),
			'product_count' => $product_count,
			'product_ids' => $product_count->untracked > 0 ? $helper->get_untracked_product_ids() : array(),
			'order_count' => $order_count,
			'order_ids' => $order_count->untracked > 0 ? $helper->get_order_ids( true ) : array(),
		));

		// get connected list
		if( ! empty( $settings['store']['list_id'] ) ) {
		    $connected_list = $mailchimp->get_list( $settings['store']['list_id'] );
        }

        $queue = $this->queue;

        if( isset( $_GET['edit'] ) && $_GET['edit'] === 'store' ) {
            require __DIR__ . '/views/edit-store.php';
        } else if( ! empty( $_GET['wizard'] ) ) {
			require __DIR__ . '/views/wizard.php';
		} else {
			require __DIR__ . '/views/admin-page.php';
		}
	}

	/**
	 * Resets all e-commerce data
	 */
	public function reset_data() {
        $this->settings['store']['list_id'] = '';
		update_option( 'mc4wp_ecommerce', $this->settings );

		// delete local tracking indicators
		delete_post_meta_by_key( MC4WP_Ecommerce::META_KEY );

		// remove store in mailchimp
        $ecommerce = $this->get_ecommerce();
        $store_id = $ecommerce->get_store_id();

		try {
			$this->get_api()->delete_ecommerce_store( $store_id );
		} catch( MC4WP_API_Resource_Not_Found_Exception $e ) {
			// good.
		} catch( Exception $e ) {
			// bad.
            $this->get_admin_messages()->flash( (string) $e, 'error' );
		}
	}

	/**
	 * @return MC4WP_API_v3
	 */
	private function get_api() {
		return mc4wp('api');
	}

	/**
	 * @return MC4WP_Ecommerce
	 */
	private function get_ecommerce() {
		return mc4wp('ecommerce');
	}

	/**
	 * @return MC4WP_Admin_Messages
	 */
	private function get_admin_messages() {
		return mc4wp('admin.messages');
	}
}