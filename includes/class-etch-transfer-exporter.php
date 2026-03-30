<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Etch_Transfer_Exporter {

    /**
     * Export multiple items by ID, plus any WS Form IDs, into one bundle.
     *
     * @param int[] $ids     Regular post IDs (pages, templates, patterns, components…)
     * @param int[] $wsf_ids WS Form IDs from wp_wsf_form.id
     */
    public static function export_multi( $ids, $wsf_ids = [] ) {
        if ( empty( $ids ) && empty( $wsf_ids ) ) {
            return new WP_Error( 'no_ids', 'No items selected for export.' );
        }

        $items      = [];
        $all_styles = [];
        $errors     = [];

        // ── Standard post items ───────────────────────────────────────────────
        foreach ( (array) $ids as $post_id ) {
            $post_id = intval( $post_id );
            $post    = get_post( $post_id );

            if ( ! $post ) {
                $errors[] = "Post ID {$post_id} not found.";
                continue;
            }

            $meta      = self::get_post_meta( $post_id );
            $style_ids = self::extract_style_ids( $post->post_content );
            $styles    = self::get_styles_for_ids( $style_ids );

            foreach ( $styles as $id => $style ) {
                $all_styles[ $id ] = $style;
            }

            $items[] = [
                'source_post_id'   => $post_id,
                'source_post_type' => $post->post_type,
                'source_post_name' => $post->post_name,
                'post_title'       => $post->post_title,
                'post_status'      => $post->post_status,
                'post_content'     => $post->post_content,
                'meta'             => $meta,
                'style_ids_found'  => $style_ids,
            ];
        }

        // ── WS Form items — use WS Form's own db_read(), mirroring db_download_json() ──
        $wsf_forms = [];
        foreach ( (array) $wsf_ids as $form_id ) {
            $form_id = intval( $form_id );
            $result  = self::export_wsform( $form_id );

            if ( is_wp_error( $result ) ) {
                $errors[] = "WS Form ID {$form_id}: " . $result->get_error_message();
                continue;
            }

            $wsf_forms[] = $result;
        }

        if ( empty( $items ) && empty( $wsf_forms ) ) {
            return new WP_Error( 'no_items', 'No valid items found to export.' );
        }

        return [
            'etch_export_version' => '1.0',
            'etch_export_type'    => 'multi',
            'exported_at'         => current_time( 'mysql' ),
            'source_site'         => get_bloginfo( 'url' ),
            'item_count'          => count( $items ) + count( $wsf_forms ),
            'items'               => $items,
            'wsf_forms'           => $wsf_forms,
            'etch_styles'         => $all_styles,
            'errors'              => $errors,
        ];
    }

    /**
     * Export a single WS Form using exactly the same logic as db_download_json().
     * Returns an array with 'label' and 'form_object' ready for import.
     */
    private static function export_wsform( $form_id ) {
        if ( ! class_exists( 'WS_Form_Form' ) ) {
            return new WP_Error( 'no_wsf', 'WS_Form_Form class not found.' );
        }

        try {
            $ws_form_form     = new WS_Form_Form();
            $ws_form_form->id = $form_id;

            // Exact same call as db_download_json() uses
            $form_object = $ws_form_form->db_read( true, true );

            if ( ! $form_object ) {
                return new WP_Error( 'wsf_read_failed', "Could not read form ID {$form_id}." );
            }

            // Stamp it exactly as db_download_json() does
            unset( $form_object->checksum );
            unset( $form_object->published_checksum );

            $form_object->identifier = WS_FORM_IDENTIFIER;
            $form_object->version    = WS_FORM_VERSION;
            $form_object->time       = time();
            $form_object->status     = 'draft';
            $form_object->count_submit         = 0;
            $form_object->meta->tab_index      = 0;
            $form_object->meta->export_object  = 'form';
            $form_object->meta->style_id       = 0;
            $form_object->meta->style_id_conv  = 0;

            $form_object->checksum = md5( wp_json_encode( $form_object ) );

            return [
                'label'          => $form_object->label,
                'source_form_id' => $form_id,   // original ID on the source site
                'form_object'    => $form_object,
            ];

        } catch ( Exception $e ) {
            return new WP_Error( 'wsf_exception', $e->getMessage() );
        }
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    public static function get_post_meta( $post_id ) {
        global $wpdb;
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d",
                $post_id
            ),
            ARRAY_A
        );
    }

    public static function get_styles_for_ids( $style_ids ) {
        $all_styles  = get_option( 'etch_styles', [] );
        $page_styles = [];

        if ( is_string( $all_styles ) ) {
            $all_styles = maybe_unserialize( $all_styles );
        }

        foreach ( $style_ids as $id ) {
            if ( isset( $all_styles[ $id ] ) ) {
                $page_styles[ $id ] = $all_styles[ $id ];
            }
        }

        return $page_styles;
    }

    public static function extract_style_ids( $content ) {
        $ids = [];
        preg_match_all( '/"styles"\s*:\s*\[([^\]]*)\]/', $content, $matches );
        foreach ( $matches[1] as $match ) {
            preg_match_all( '/"([^"]+)"/', $match, $string_matches );
            foreach ( $string_matches[1] as $id ) {
                $ids[] = $id;
            }
        }
        return array_values( array_unique( $ids ) );
    }
}
