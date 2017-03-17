<?php
defined( 'ABSPATH' ) or exit;

/**
 * Class MC4WP_Ecommerce_Command
 */
class MC4WP_Ecommerce_Command extends WP_CLI_Command  {

	/**
	 * @var MC4WP_Ecommerce
	 */
	protected $ecommerce;

	/**
	 * MC4WP_Ecommerce_Command constructor.
	 */
	public function __construct() {
		parent::__construct();

		$this->ecommerce = mc4wp('ecommerce');
	}

	/**
	 * Tracks the order with the given ID in MailChimp
	 *
	 * @param $args
	 * @param $assoc_args
	 *
	 * ## OPTIONS
	 *
	 * <order_id>
	 * : Order to add to MailChimp
	 *
	 * ## EXAMPLES
	 *
	 *     wp mc4wp-ecommerce add-order
	 *
	 * @synopsis <order_id>
	 *
	 * @subcommand add-order
	 */
	public function add_order( $args, $assoc_args = array() ) {
		$order_id = (int) $args[0];

        try {
            $success = $this->ecommerce->update_order( $order_id );
        } catch( Exception $e ) {
            WP_CLI::warning( sprintf( "Error adding order %d: %s", $order_id, $e ) );
            return;
        }

        WP_CLI::success( sprintf( 'Added order #%d.', $order_id ) );
	}

	/**
	 * Deletes the order with the given ID in MailChimp
	 *
	 * @param $args
	 * @param $assoc_args
	 *
	 * ## OPTIONS
	 *
	 * <order_id>
	 * : Order to delete in MailChimp
	 *
	 * ## EXAMPLES
	 *
	 *     wp mc4wp-ecommerce delete-order
	 *
	 * @synopsis <order_id>
	 *
	 * @subcommand delete-order
	 */
	public function delete_order( $args, $assoc_args = array() ) {
		$order_id = (int) $args[0];

        try {
            $this->ecommerce->delete_order( $order_id );
        } catch( Exception $e ) {
            WP_CLI::warning( sprintf( "Error deleting order %d: %s", $order_id, $e ) );
            return;
        }

        WP_CLI::success( sprintf( 'Deleted order #%d.', $order_id ) );
	}

	/**
	 * Adds multiple untracked orders, starting with the most recent orders.
	 *
	 * @param $args
	 * @param $assoc_args
	 *
	 * ## OPTIONS
	 *
	 * [--<limit>=<limit>]
	 * : Limit # of orders to this number. Default: 1000
	 *
	 * [--offset=<offset>]
	 * : Skip the first # orders. Default: 0
	 *
	 * ## EXAMPLES
	 *
	 *     wp mc4wp-ecommerce add-orders --limit=5000 --offset=1000
	 *
	 * @synopsis [--limit=<limit>] [--offset=<offset>]
	 *
	 * @subcommand add-orders
	 */
	public function add_orders( $args, $assoc_args = array() ) {
		$offset = empty( $assoc_args['offset'] ) ? 0 : (int) $assoc_args['offset'];
		$limit = empty( $assoc_args['limit'] ) ? 1000 : (int) $assoc_args['limit'];

		$helper = new MC4WP_Ecommerce_Helper();
		$ids = $helper->get_untracked_order_ids();
        $ids = array_slice( $ids, $offset, $limit );
		$count = count( $ids );

		WP_CLI::line( sprintf( "%d orders found.", $count ) );

        foreach( $ids as $id ) {
            $this->add_order( array( $id ) );
        }

        WP_CLI::line( 'Done!' );
	}

    /**
     * Deletes all orders from MailChimp
     *
     * @param $args
     * @param $assoc_args
     *
     * ## EXAMPLES
     *
     *     wp mc4wp-ecommerce delete-orders
     *
     * @subcommand delete-orders
     */
    public function delete_orders( $args, $assoc_args = array() ) {
        $helper = new MC4WP_Ecommerce_Helper();
        $ids = $helper->get_tracked_order_ids();

        WP_CLI::line( sprintf( '%d orders found.', count( $ids ) ) );

        foreach( $ids as $order_id ) {
            $this->delete_order( array( $order_id ) );
        }

        WP_CLI::line( 'Done!' );
    }

    /**
	 * Adds multiple untracked products, starting with the most recent product.
	 *
	 * @param $args
	 * @param $assoc_args
	 *
	 * ## OPTIONS
	 *
	 * [--<limit>=<limit>]
	 * : Limit # of products to this number. Default: 1000
	 *
	 * [--offset=<offset>]
	 * : Skip the first # products. Default: 0
	 *
	 * ## EXAMPLES
	 *
	 *     wp mc4wp-ecommerce add-products --limit=5000 --offset=1000
	 *
	 * @synopsis [--limit=<limit>] [--offset=<offset>]
	 *
	 * @subcommand add-products
	 */
	public function add_products( $args, $assoc_args = array() ) {
        $offset = empty( $assoc_args['offset'] ) ? 0 : (int) $assoc_args['offset'];
        $limit = empty( $assoc_args['limit'] ) ? 1000 : (int) $assoc_args['limit'];

        $helper = new MC4WP_Ecommerce_Helper();
        $ids = $helper->get_untracked_product_ids();
        $ids = array_slice( $ids, $offset, $limit );

        WP_CLI::line( sprintf( '%d products found.', count( $ids ) ) );

        foreach( $ids as $product_id ) {
            $this->add_product( array( $product_id ) );
        }

        WP_CLI::line( 'Done!' );
	}

	/**
	 * Deletes all products from MailChimp
	 *
	 * @param $args
	 * @param $assoc_args
	 *
	 * ## EXAMPLES
	 *
	 *     wp mc4wp-ecommerce delete-products
	 *
	 * @subcommand delete-products
	 */
	public function delete_products( $args, $assoc_args = array() ) {
		$helper = new MC4WP_Ecommerce_Helper();
		$ids = $helper->get_tracked_product_ids();

        WP_CLI::line( sprintf( '%d products found.', count( $ids ) ) );

		foreach( $ids as $product_id ) {
            $this->delete_product( array( $product_id ) );
		}

        WP_CLI::line( 'Done!' );
	}

    /**
     * Adds the product with the given ID to MailChimp
     *
     * @param $args
     * @param $assoc_args
     *
     * ## OPTIONS
     *
     * <product_id>
     * : ID of the product to add to MailChimp
     *
     * ## EXAMPLES
     *
     *     wp mc4wp-ecommerce add-product
     *
     * @synopsis <product_id>
     *
     * @subcommand add-product
     */
    public function add_product( $args, $assoc_args = array() ) {
        $product_id = (int) $args[0];

        try {
            $success = $this->ecommerce->update_product( $product_id );
        } catch( Exception $e ) {
            WP_CLI::warning( sprintf( "Error adding product %d: %s", $product_id, $e ) );
            return;
        }

        WP_CLI::success( sprintf( 'Success! Added product #%d.', $product_id ) );
    }

    /**
     * Deletes the product with the given ID from MailChimp
     *
     * @param $args
     * @param $assoc_args
     *
     * ## OPTIONS
     *
     * <product_id>
     * : ID of the product to delete from MailChimp
     *
     * ## EXAMPLES
     *
     *     wp mc4wp-ecommerce delete-product
     *
     * @synopsis <product_id>
     *
     * @subcommand delete-product
     */
    public function delete_product( $args, $assoc_args = array() ) {
        $product_id = (int) $args[0];

        try {
            $this->ecommerce->delete_product( $product_id );
        } catch( Exception $e ) {
            WP_CLI::warning( sprintf( "Error deleting product %d: %s", $product_id, $e ) );
            return;
        }

        WP_CLI::success( sprintf( 'Success! Deleted product #%d.', $product_id ) );
    }

    /**
     * Processes the job queue.
     *
     * @param $args
     * @param $assoc_args
     *
     * ## EXAMPLES
     *
     *     wp mc4wp-ecommerce process-queue
     *
     * @subcommand process-queue
     */
    public function process_queue( $args, $assoc_args = array() ) {
        /** @var MC4WP_Queue $queue */
        $queue = mc4wp('ecommerce.queue');
        $count = count( $queue->all() );

        WP_CLI::line( sprintf( '%d pending jobs in queue.', $count ) );

        do_action( 'mc4wp_ecommerce_process_queue' );
        
        WP_CLI::success( 'Done!' );
    }


}