<?php

/**
 * Class MC4WP_Log_Item
 *
 * @ignore
 *
 * TODO: Merge this with MC4WP_MailChimp_Subscriber class?
 */
class MC4WP_Log_Item {

    public $ID;
    public $email_address;
    public $merge_fields;
    public $interests;
    public $vip;
    public $status;
    public $ip_signup;
    public $list_id;
    public $email_type;
    public $language;
    public $type;
    public $url;
    public $success;
    public $datetime;
    public $related_object_ID;

    /**
     * @param string $name
     * @return mixed
     */
    public function __get( $name ) {
        switch( $name ) {
            case'id':
                return $this->ID;

            case 'email':
                return $this->email_address;

            case 'merge_vars':
            case 'data':
                return $this->merge_fields;

            case 'groupings':
                return $this->interests;

            case 'list_ids':
                return $this->list_id;
        }
    }
}