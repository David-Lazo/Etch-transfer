<?php
/**
 * Plugin Name: Etch Transfer
 * Description: Export and import Etch pages, templates, patterns, and components between WordPress sites—complete with all classes and styles. 
 * Author:      David Lazo + Claude A.I
 * License:     GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'ETCH_TRANSFER_VERSION', '1.0.0' );
define( 'ETCH_TRANSFER_PATH', plugin_dir_path( __FILE__ ) );
define( 'ETCH_TRANSFER_URL', plugin_dir_url( __FILE__ ) );

require_once ETCH_TRANSFER_PATH . 'includes/class-etch-transfer-admin.php';
require_once ETCH_TRANSFER_PATH . 'includes/class-etch-transfer-exporter.php';
require_once ETCH_TRANSFER_PATH . 'includes/class-etch-transfer-importer.php';

new Etch_Transfer_Admin();
