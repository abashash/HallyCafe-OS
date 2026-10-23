<?php
/**
 * Plugin Name: Hally Cafe & Restaurant OS | افزونه مدیریت و منوی آنلاین کافه هالی
 * Plugin URI:  https://github.com/hally-cafe
 * Description: افزونه جامع اتصال سیستم مدیریت کافه هالی به وردپرس؛ شامل منوی دیجیتال آنلاین، رزرواسیون میز، صندوق فروشگاهی (POS)، تابلوی آشپزخانه (KDS) و باشگاه مشتریان با شورت‌کدهای اختصاصی، پیشخوان مدیریت و سازگاری کامل با المنتور.
 * Version:     1.0.0
 * Author:      Fars.Company
 * Author URI:  https://fars.company
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: hally-cafe
 * Domain Path: /languages
 */

// جلوگیری از دسترسی مستقیم به فایل
defined('ABSPATH') || exit;

define('HALLY_CAFE_VERSION', '1.0.0');
define('HALLY_CAFE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HALLY_CAFE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('HALLY_CAFE_DEFAULT_APP_URL', 'http://localhost:3000');

/**
 * کلاس اصلی افزونه کافه هالی
 */
class Hally_Cafe_Plugin {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', array($this, 'register_admin_menus'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // ثبت شورت‌کدهای کاربردی
        add_shortcode('hally_menu', array($this, 'shortcode_menu'));
        add_shortcode('hally_pos', array($this, 'shortcode_pos'));
        add_shortcode('hally_reserve', array($this, 'shortcode_reserve'));
        add_shortcode('hally_account', array($this, 'shortcode_account'));
        add_shortcode('hally_kitchen', array($this, 'shortcode_kitchen'));
        add_shortcode('hally_admin', array($this, 'shortcode_admin'));
        add_shortcode('hally_embed', array($this, 'shortcode_custom_embed'));

        // فیلتر لینک تنظیمات در صفحه افزونه‌ها
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_action_links'));
    }

    /**
     * لینک سریع به تنظیمات در لیست افزونه‌ها
     */
    public function add_action_links($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=hally-cafe-settings') . '">' . __('تنظیمات', 'hally-cafe') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * استخراج آدرس پایه برنامه کافه
     */
    public function get_app_url() {
        $url = get_option('hally_cafe_app_url', HALLY_CAFE_DEFAULT_APP_URL);
        return rtrim($url, '/');
    }

    /**
     * ثبت استایل‌ها و اسکریپت‌های سمت فرانت‌اند
     */
    public function enqueue_frontend_assets() {
        wp_register_style(
            'hally-cafe-front-css',
            HALLY_CAFE_PLUGIN_URL . 'assets/css/hally-cafe.css',
            array(),
            HALLY_CAFE_VERSION
        );

        wp_register_script(
            'hally-cafe-front-js',
            HALLY_CAFE_PLUGIN_URL . 'assets/js/hally-cafe.js',
            array('jquery'),
            HALLY_CAFE_VERSION,
            true
        );

        wp_localize_script('hally-cafe-front-js', 'hallyCafeConfig', array(
            'appUrl' => $this->get_app_url(),
            'siteUrl' => home_url(),
            'ajaxUrl' => admin_url('admin-ajax.php'),
        ));
    }

    /**
     * ثبت استایل‌ها در پنل ادمین وردپرس
     */
    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'hally-cafe') !== false) {
            wp_enqueue_style('hally-cafe-admin-css', HALLY_CAFE_PLUGIN_URL . 'assets/css/hally-cafe-admin.css', array(), HALLY_CAFE_VERSION);
            wp_enqueue_script('hally-cafe-front-js', HALLY_CAFE_PLUGIN_URL . 'assets/js/hally-cafe.js', array('jquery'), HALLY_CAFE_VERSION, true);
        }
    }

    /**
     * ثبت تنظیمات در پیشخوان وردپرس
     */
    public function register_settings() {
        register_setting('hally_cafe_settings_group', 'hally_cafe_app_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => HALLY_CAFE_DEFAULT_APP_URL,
        ));
        register_setting('hally_cafe_settings_group', 'hally_cafe_default_height', array(
            'type' => 'integer',
            'sanitize_callback' => 'absint',
            'default' => 850,
        ));
        register_setting('hally_cafe_settings_group', 'hally_cafe_enable_fullscreen_pos', array(
            'type' => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => true,
        ));
        register_setting('hally_cafe_settings_group', 'hally_cafe_embed_seamless', array(
            'type' => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default' => true,
        ));
    }

    /**
     * ثبت منوی اختصاصی در پیشخوان وردپرس
     */
    public function register_admin_menus() {
        add_menu_page(
            __('کافه هالی', 'hally-cafe'),
            __('کافه هالی', 'hally-cafe'),
            'manage_options',
            'hally-cafe-dashboard',
            array($this, 'render_admin_dashboard'),
            'dashicons-coffee',
            26
        );

        add_submenu_page(
            'hally-cafe-dashboard',
            __('پیشخوان و سفارشات کافه', 'hally-cafe'),
            __('پیشخوان کافه', 'hally-cafe'),
            'manage_options',
            'hally-cafe-dashboard',
            array($this, 'render_admin_dashboard')
        );

        add_submenu_page(
            'hally-cafe-dashboard',
            __('صندوق و سفارش‌گیر (POS)', 'hally-cafe'),
            __('صندوق و سفارش‌گیر', 'hally-cafe'),
            'manage_options',
            'hally-cafe-pos',
            array($this, 'render_admin_pos')
        );

        add_submenu_page(
            'hally-cafe-dashboard',
            __('نمایشگر آشپزخانه (KDS)', 'hally-cafe'),
            __('تابلوی آشپزخانه', 'hally-cafe'),
            'manage_options',
            'hally-cafe-kitchen',
            array($this, 'render_admin_kitchen')
        );

        add_submenu_page(
            'hally-cafe-dashboard',
            __('تنظیمات و شورت‌کدها', 'hally-cafe'),
            __('تنظیمات و راهنما', 'hally-cafe'),
            'manage_options',
            'hally-cafe-settings',
            array($this, 'render_admin_settings')
        );
    }

    /**
     * رندر قاب امبد فریم برای پنل‌ها و فرانت
     */
    private function build_iframe_html($path = '', $atts = array(), $extra_classes = '') {
        wp_enqueue_style('hally-cafe-front-css');
        wp_enqueue_script('hally-cafe-front-js');

        $base_url = $this->get_app_url();
        $target_url = $base_url . '/' . ltrim($path, '/');

        // اضافه کردن پارامترهای query string اختیاری
        $params = array();
        if (!empty($atts['category'])) {
            $params['category'] = sanitize_text_field($atts['category']);
        }
        if (!empty($atts['table'])) {
            $params['table'] = sanitize_text_field($atts['table']);
        }
        if (!empty($atts['theme'])) {
            $params['theme'] = sanitize_text_field($atts['theme']);
        }
        if (!empty($atts['lang'])) {
            $params['lang'] = sanitize_text_field($atts['lang']);
        }

        // امبد به صورت embed_mode=wp
        $params['embed'] = 'wordpress';

        if (!empty($params)) {
            $target_url = add_query_arg($params, $target_url);
        }

        $height = !empty($atts['height']) ? intval($atts['height']) : get_option('hally_cafe_default_height', 850);
        $frame_id = 'hally-frame-' . wp_generate_password(8, false);

        ob_start();
        ?>
        <div class="hally-cafe-wrapper <?php echo esc_attr($extra_classes); ?>" id="<?php echo esc_attr($frame_id); ?>-wrapper" style="position:relative; width:100%; min-height:<?php echo esc_attr($height); ?>px;">
            <div class="hally-cafe-loading-spinner" id="<?php echo esc_attr($frame_id); ?>-spinner">
                <span class="hally-spinner-dot"></span>
                <p>در حال بارگذاری سیستم کافه هالی...</p>
            </div>
            <iframe
                id="<?php echo esc_attr($frame_id); ?>"
                class="hally-cafe-iframe"
                src="<?php echo esc_url($target_url); ?>"
                style="width: 100%; height: <?php echo esc_attr($height); ?>px; border: none; border-radius: 12px; background: transparent; transition: height 0.2s ease;"
                allow="camera; microphone; payment; clipboard-write"
                loading="lazy"
                onload="var spin=document.getElementById('<?php echo esc_js($frame_id); ?>-spinner'); if(spin) spin.style.display='none';"
            ></iframe>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * شورت‌کد منوی آنلاین [hally_menu]
     */
    public function shortcode_menu($atts) {
        $atts = shortcode_atts(array(
            'height'   => get_option('hally_cafe_default_height', 850),
            'category' => '',
            'table'    => '',
            'lang'     => '',
        ), $atts, 'hally_menu');

        return $this->build_iframe_html('menu', $atts, 'hally-menu-container');
    }

    /**
     * شورت‌کد صندوق و سفارش‌گیر [hally_pos]
     */
    public function shortcode_pos($atts) {
        $atts = shortcode_atts(array(
            'height' => 900,
            'table'  => '',
        ), $atts, 'hally_pos');

        return $this->build_iframe_html('pos', $atts, 'hally-pos-container');
    }

    /**
     * شورت‌کد رزرواسیون میز [hally_reserve]
     */
    public function shortcode_reserve($atts) {
        $atts = shortcode_atts(array(
            'height' => 750,
        ), $atts, 'hally_reserve');

        return $this->build_iframe_html('reservations', $atts, 'hally-reserve-container');
    }

    /**
     * شورت‌کد حساب کاربری و باشگاه مشتریان [hally_account]
     */
    public function shortcode_account($atts) {
        $atts = shortcode_atts(array(
            'height' => 800,
        ), $atts, 'hally_account');

        return $this->build_iframe_html('account', $atts, 'hally-account-container');
    }

    /**
     * شورت‌کد نمایشگر آشپزخانه [hally_kitchen]
     */
    public function shortcode_kitchen($atts) {
        $atts = shortcode_atts(array(
            'height' => 900,
        ), $atts, 'hally_kitchen');

        return $this->build_iframe_html('kitchen-display', $atts, 'hally-kitchen-container');
    }

    /**
     * شورت‌کد پنل مدیریت کل کافه [hally_admin]
     */
    public function shortcode_admin($atts) {
        $atts = shortcode_atts(array(
            'height' => 950,
        ), $atts, 'hally_admin');

        return $this->build_iframe_html('dashboard', $atts, 'hally-admin-container');
    }

    /**
     * شورت‌کد امبد سفارشی [hally_embed path="..."]
     */
    public function shortcode_custom_embed($atts) {
        $atts = shortcode_atts(array(
            'path'   => '',
            'height' => 850,
        ), $atts, 'hally_embed');

        return $this->build_iframe_html($atts['path'], $atts, 'hally-custom-container');
    }

    /**
     * نمایش پیشخوان ادمین کافه در وردپرس
     */
    public function render_admin_dashboard() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">☕ پیشخوان مدیریت و مانیتورینگ کافه هالی</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/dashboard'); ?>" target="_blank" class="button button-primary">
                    باز کردن در تب جداگانه ↗
                </a>
            </div>
            <?php echo $this->build_iframe_html('dashboard', array('height' => 920)); ?>
        </div>
        <?php
    }

    /**
     * نمایش صندوق و سفارش‌گیر درون ادمین وردپرس
     */
    public function render_admin_pos() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">🖥️ صندوق فروشگاهی و تبلت سفارش‌گیر (POS)</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/pos'); ?>" target="_blank" class="button button-primary">
                    حالت تمام‌صفحه صندوق ↗
                </a>
            </div>
            <?php echo $this->build_iframe_html('pos', array('height' => 920)); ?>
        </div>
        <?php
    }

    /**
     * نمایش کیچن دیسپلی درون ادمین وردپرس
     */
    public function render_admin_kitchen() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">👨‍🍳 تابلوی هوشمند آشپزخانه و بار گرم (KDS)</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/kitchen-display'); ?>" target="_blank" class="button button-primary">
                    نمایشگر تمام‌صفحه آشپزخانه ↗
                </a>
            </div>
            <?php echo $this->build_iframe_html('kitchen-display', array('height' => 920)); ?>
        </div>
        <?php
    }

    /**
     * صفحه تنظیمات و لیست شورت‌کدها در پیشخوان وردپرس
     */
    public function render_admin_settings() {
        ?>
        <div class="wrap" style="direction: rtl; text-align: right; max-width: 1050px; font-family: Tahoma, system-ui, sans-serif;">
            <h1 style="font-weight: 800; margin-bottom: 20px;">⚙️ تنظیمات اتصال سیستم کافه هالی به وردپرس</h1>
            
            <?php settings_errors(); ?>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <!-- کارت تنظیمات پایه -->
                <div style="background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h2 style="margin-top: 0; font-size: 18px; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">🔗 آدرس سامانه هالی (App URL)</h2>
                    <form method="post" action="options.php">
                        <?php
                        settings_fields('hally_cafe_settings_group');
                        do_settings_sections('hally_cafe_settings_group');
                        ?>
                        <table class="form-table" role="presentation" style="margin-top: 10px;">
                            <tr>
                                <th scope="row" style="padding-top: 10px; width: 35%;"><label for="hally_cafe_app_url">آدرس برنامه کافه هالی</label></th>
                                <td>
                                    <input name="hally_cafe_app_url" type="url" id="hally_cafe_app_url" value="<?php echo esc_attr(get_option('hally_cafe_app_url', HALLY_CAFE_DEFAULT_APP_URL)); ?>" class="regular-text" style="direction: ltr; width: 100%;" placeholder="https://app.yourcafe.com">
                                    <p class="description" style="margin-top: 5px;">آدرس هاست یا دامنه‌ای که برنامه هالی روی آن مستقر شده است (مانند ساب‌دامین اختصاصی کافه شما یا localhost:3000).</p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="hally_cafe_default_height">ارتفاع پیش‌فرض فریم (px)</label></th>
                                <td>
                                    <input name="hally_cafe_default_height" type="number" id="hally_cafe_default_height" value="<?php echo esc_attr(get_option('hally_cafe_default_height', 850)); ?>" class="small-text">
                                    <span class="description">پیکسل (پیش‌فرض: 850 پیکسل)</span>
                                </td>
                            </tr>
                        </table>
                        <?php submit_button('ذخیره تنظیمات افزونه', 'primary'); ?>
                    </form>
                </div>

                <!-- کارت راهنمای سریع -->
                <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1;">
                    <h2 style="margin-top: 0; font-size: 18px; color: #1e293b; border-bottom: 2px solid #10b981; padding-bottom: 8px;">🚀 نحوه استفاده سریع در سایت</h2>
                    <p style="font-size: 14px; line-height: 1.8; color: #334155;">
                        شما می‌توانید با قراردادن شورت‌کدهای زیر در هر برگه وردپرس، نوشته، یا ابزارک‌های <strong>المنتور (Elementor)</strong> و <strong>ویژوال کامپوزر</strong>، بخش‌های مختلف کافه را نمایش دهید:
                    </p>
                    <ul style="list-style: disc; padding-right: 20px; font-size: 13px; line-height: 2; color: #475569;">
                        <li><strong>منوی آنلاین عمومی:</strong> برگه دلخواهی به نام «منو» بسازید و شورت‌کد <code>[hally_menu]</code> را در آن قرار دهید.</li>
                        <li><strong>رزرو میز:</strong> در برگه رزرو شورت‌کد <code>[hally_reserve]</code> را وارد کنید.</li>
                        <li><strong>باشگاه مشتریان و پیگیری سفارش:</strong> با شورت‌کد <code>[hally_account]</code>.</li>
                        <li><strong>سیستم سفارش‌گیر سالن:</strong> در برگه‌ای با رمز عبور یا دسترسی اعضا شورت‌کد <code>[hally_pos]</code> را قرار دهید.</li>
                    </ul>
                </div>
            </div>

            <!-- جدول شورت‌کدها -->
            <div style="background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h2 style="margin-top: 0; font-size: 18px; color: #0f172a; margin-bottom: 15px;">📋 راهنمای کامل شورت‌کدهای افزونه</h2>
                
                <table class="wp-list-table widefat fixed striped" style="border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr>
                            <th style="width: 28%; font-weight: bold;">شورت‌کد</th>
                            <th style="width: 32%; font-weight: bold;">بخش مربوطه</th>
                            <th style="font-weight: bold;">ویژگی‌ها و پارامترها (Attributes)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>[hally_menu]</code></td>
                            <td><strong>منوی آنلاین دیجیتال</strong> (مشتریان، موبایل و اسکن QR)</td>
                            <td><code>height="900"</code>، <code>category="نام دسته"</code>، <code>table="T-01"</code></td>
                        </tr>
                        <tr>
                            <td><code>[hally_reserve]</code></td>
                            <td><strong>فرم رزرواسیون آنلاین میزهای کافه</strong></td>
                            <td><code>height="750"</code></td>
                        </tr>
                        <tr>
                            <td><code>[hally_account]</code></td>
                            <td><strong>باشگاه مشتریان، امتیازها و سوابق سفارش</strong></td>
                            <td><code>height="800"</code></td>
                        </tr>
                        <tr>
                            <td><code>[hally_pos]</code></td>
                            <td><strong>صندوق، تبلت ویترس و ثبت سفارش سالن</strong></td>
                            <td><code>height="900"</code>، <code>table="T-02"</code></td>
                        </tr>
                        <tr>
                            <td><code>[hally_kitchen]</code></td>
                            <td><strong>تابلوی KDS نمایش زنده سفارشات به آشپز</strong></td>
                            <td><code>height="900"</code></td>
                        </tr>
                        <tr>
                            <td><code>[hally_admin]</code></td>
                            <td><strong>پنل مدیریت جامع کافه</strong> (انبار، هزینه‌ها، گزارشات)</td>
                            <td><code>height="950"</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
}

// راه‌اندازی افزونه
function hally_cafe_init() {
    return Hally_Cafe_Plugin::get_instance();
}
add_action('plugins_loaded', 'hally_cafe_init');
