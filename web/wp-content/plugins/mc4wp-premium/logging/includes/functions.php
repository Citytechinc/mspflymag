<?php

/**
 * @param $datetime
 * @param string $format
 * @return false|string
 */
function mc4wp_logging_gmt_date_format( $datetime, $format = '' ) {

    if( $format === '' ) {
        $format = get_option( 'date_format' ) . ' ' . get_option( 'time_format' );
    }

    // add or subtract GMT offset to given mysql time
    $local_datetime = strtotime( $datetime ) + ( get_option( 'gmt_offset') * HOUR_IN_SECONDS );

    return date( $format, $local_datetime );
}