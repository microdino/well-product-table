<?php
/** Global settings for product tables. */
namespace PRTA\Includes;

defined('ABSPATH') || exit();

class CartSettings {
    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public static function defaults() {
        return [
            'addToCartText' => __('Add to cart', 'well-product-table'),
            'multipleAddToCartSingular' => __(
                'Add 1 item for {total}',
                'well-product-table',
            ),
            'multipleAddToCartPlural' => __(
                'Add {items} items for {total}',
                'well-product-table',
            ),
            'addToCartLocation' => 'above',
            'selectAllProducts' => true,
            'descriptionLength' => 15,
            'stickyHeader' => false,
            'hideTableHeading' => false,
            'showTableFooter' => false,
            'showHiddenProducts' => false,
            'productsPerPage' => 20,
            'showSearchBox' => true,
            'deleteDataOnUninstall' => false,
            'enableCaching' => false,
            'cacheDuration' => 10,
        ];
    }

    public static function get() {
        $saved = get_option('prta_cart_settings', []);
        return wp_parse_args(is_array($saved) ? $saved : [], self::defaults());
    }

    /** Cache product IDs and pagination only; prices, stock, forms and nonces stay fresh. */
    public static function query_products($query, $context) {
        $settings = self::get();
        if (!$settings['enableCaching'] || 'rand' === $query['orderby']) {
            return wc_get_products($query);
        }
        $version = \WC_Cache_Helper::get_transient_version('product');
        $key =
            'prta_query_' .
            md5(
                wp_json_encode([
                    $query,
                    $context,
                    $version,
                    $settings['cacheDuration'],
                    get_current_user_id(),
                    get_locale(),
                    get_woocommerce_currency(),
                ]),
            );
        $cached = get_transient($key);
        if (
            is_array($cached) &&
            isset($cached['ids'], $cached['total'], $cached['pages'])
        ) {
            return (object) [
                'products' => array_values(
                    array_filter(array_map('wc_get_product', $cached['ids'])),
                ),
                'total' => $cached['total'],
                'max_num_pages' => $cached['pages'],
            ];
        }
        $result = wc_get_products($query);
        $duration = max(1, (int) $settings['cacheDuration']) * HOUR_IN_SECONDS;
        set_transient(
            $key,
            [
                'ids' => array_map(function ($product) {
                    return $product->get_id();
                }, $result->products),
                'total' => $result->total,
                'pages' => $result->max_num_pages,
            ],
            $duration,
        );
        $keys = get_option('prta_query_cache_keys', []);
        $keys = is_array($keys)
            ? array_filter($keys, function ($expires) {
                return $expires > time();
            })
            : [];
        $keys[$key] = time() + $duration;
        update_option('prta_query_cache_keys', $keys, false);
        return $result;
    }

    public function register_routes() {
        $route = [
            'methods' => ['GET', 'POST'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
            'callback' => function ($request) {
                if ('POST' === $request->get_method()) {
                    $values = $request->get_json_params();
                    if (!is_array($values)) {
                        return new \WP_Error(
                            'prta_invalid_settings',
                            __('Invalid settings.', 'well-product-table'),
                            ['status' => 400],
                        );
                    }
                    $settings = self::get();
                    foreach (
                        [
                            'addToCartText',
                            'multipleAddToCartSingular',
                            'multipleAddToCartPlural',
                        ]
                        as $key
                    ) {
                        if (array_key_exists($key, $values)) {
                            if (
                                !is_string($values[$key]) ||
                                strlen($values[$key]) > 1000
                            ) {
                                return new \WP_Error(
                                    'prta_invalid_text',
                                    __(
                                        'Setting text must be a string of at most 1000 characters.',
                                        'well-product-table',
                                    ),
                                    ['status' => 400],
                                );
                            }
                            $settings[$key] =
                                sanitize_text_field($values[$key]) ?:
                                self::defaults()[$key];
                        }
                    }
                    if (isset($values['addToCartLocation'])) {
                        if (
                            !in_array(
                                $values['addToCartLocation'],
                                ['above', 'below', 'all'],
                                true,
                            )
                        ) {
                            return new \WP_Error(
                                'prta_invalid_location',
                                __(
                                    'Invalid cart button location.',
                                    'well-product-table',
                                ),
                                ['status' => 400],
                            );
                        }
                        $settings['addToCartLocation'] =
                            $values['addToCartLocation'];
                    }
                    foreach (
                        [
                            'selectAllProducts',
                            'stickyHeader',
                            'hideTableHeading',
                            'showTableFooter',
                            'showHiddenProducts',
                            'showSearchBox',
                            'deleteDataOnUninstall',
                            'enableCaching',
                        ]
                        as $key
                    ) {
                        if (array_key_exists($key, $values)) {
                            if (!is_bool($values[$key])) {
                                return new \WP_Error(
                                    'prta_invalid_boolean',
                                    __(
                                        'Checkbox settings must be true or false.',
                                        'well-product-table',
                                    ),
                                    ['status' => 400],
                                );
                            }
                            $settings[$key] = $values[$key];
                        }
                    }
                    foreach (
                        [
                            'descriptionLength' => 0,
                            'productsPerPage' => 1,
                            'cacheDuration' => 1,
                        ]
                        as $key => $minimum
                    ) {
                        if (array_key_exists($key, $values)) {
                            $maximum =
                                'descriptionLength' === $key
                                    ? 10000
                                    : ('productsPerPage' === $key
                                        ? 1000
                                        : 8760);
                            if (
                                !is_numeric($values[$key]) ||
                                (float) $values[$key] != (int) $values[$key] ||
                                (int) $values[$key] < $minimum ||
                                (float) $values[$key] > $maximum
                            ) {
                                return new \WP_Error(
                                    'prta_invalid_number',
                                    __(
                                        'Enter a valid whole number for each numeric setting.',
                                        'well-product-table',
                                    ),
                                    ['status' => 400],
                                );
                            }
                            $settings[$key] = (int) $values[$key];
                        }
                    }
                    update_option('prta_cart_settings', $settings);
                }
                return self::get();
            },
        ];
        register_rest_route('prta/v1', '/settings', $route);
    }
}
