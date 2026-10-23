import JSZip from "jszip";
import {
  Archive,
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const PHP_PLUGIN_TEMPLATE = `<?php
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

defined('ABSPATH') || exit;

define('HALLY_CAFE_VERSION', '1.0.0');
define('HALLY_CAFE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HALLY_CAFE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('HALLY_CAFE_DEFAULT_APP_URL', '{{APP_URL}}');

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

        add_shortcode('hally_menu', array($this, 'shortcode_menu'));
        add_shortcode('hally_pos', array($this, 'shortcode_pos'));
        add_shortcode('hally_reserve', array($this, 'shortcode_reserve'));
        add_shortcode('hally_account', array($this, 'shortcode_account'));
        add_shortcode('hally_kitchen', array($this, 'shortcode_kitchen'));
        add_shortcode('hally_admin', array($this, 'shortcode_admin'));
        add_shortcode('hally_embed', array($this, 'shortcode_custom_embed'));

        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_action_links'));
    }

    public function add_action_links($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=hally-cafe-settings') . '">' . __('تنظیمات', 'hally-cafe') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    public function get_app_url() {
        $url = get_option('hally_cafe_app_url', HALLY_CAFE_DEFAULT_APP_URL);
        return rtrim($url, '/');
    }

    public function enqueue_frontend_assets() {
        wp_register_style('hally-cafe-front-css', HALLY_CAFE_PLUGIN_URL . 'assets/css/hally-cafe.css', array(), HALLY_CAFE_VERSION);
        wp_register_script('hally-cafe-front-js', HALLY_CAFE_PLUGIN_URL . 'assets/js/hally-cafe.js', array('jquery'), HALLY_CAFE_VERSION, true);

        wp_localize_script('hally-cafe-front-js', 'hallyCafeConfig', array(
            'appUrl' => $this->get_app_url(),
            'siteUrl' => home_url(),
            'ajaxUrl' => admin_url('admin-ajax.php'),
        ));
    }

    public function enqueue_admin_assets($hook) {
        if (strpos($hook, 'hally-cafe') !== false) {
            wp_enqueue_style('hally-cafe-admin-css', HALLY_CAFE_PLUGIN_URL . 'assets/css/hally-cafe-admin.css', array(), HALLY_CAFE_VERSION);
            wp_enqueue_script('hally-cafe-front-js', HALLY_CAFE_PLUGIN_URL . 'assets/js/hally-cafe.js', array('jquery'), HALLY_CAFE_VERSION, true);
        }
    }

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
    }

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

    private function build_iframe_html($path = '', $atts = array(), $extra_classes = '') {
        wp_enqueue_style('hally-cafe-front-css');
        wp_enqueue_script('hally-cafe-front-js');

        $base_url = $this->get_app_url();
        $target_url = $base_url . '/' . ltrim($path, '/');

        $params = array('embed' => 'wordpress');
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

        $target_url = add_query_arg($params, $target_url);
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
                style="width: 100%; height: <?php echo esc_attr($height); ?>px; border: none; border-radius: 12px; background: transparent;"
                allow="camera; microphone; payment; clipboard-write"
                loading="lazy"
                onload="var spin=document.getElementById('<?php echo esc_js($frame_id); ?>-spinner'); if(spin) spin.style.display='none';"
            ></iframe>
        </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_menu($atts) {
        $atts = shortcode_atts(array(
            'height'   => get_option('hally_cafe_default_height', 850),
            'category' => '',
            'table'    => '',
            'lang'     => '',
        ), $atts, 'hally_menu');
        return $this->build_iframe_html('menu', $atts, 'hally-menu-container');
    }

    public function shortcode_pos($atts) {
        $atts = shortcode_atts(array(
            'height' => 900,
            'table'  => '',
        ), $atts, 'hally_pos');
        return $this->build_iframe_html('pos', $atts, 'hally-pos-container');
    }

    public function shortcode_reserve($atts) {
        $atts = shortcode_atts(array('height' => 750), $atts, 'hally_reserve');
        return $this->build_iframe_html('reservations', $atts, 'hally-reserve-container');
    }

    public function shortcode_account($atts) {
        $atts = shortcode_atts(array('height' => 800), $atts, 'hally_account');
        return $this->build_iframe_html('account', $atts, 'hally-account-container');
    }

    public function shortcode_kitchen($atts) {
        $atts = shortcode_atts(array('height' => 900), $atts, 'hally_kitchen');
        return $this->build_iframe_html('kitchen-display', $atts, 'hally-kitchen-container');
    }

    public function shortcode_admin($atts) {
        $atts = shortcode_atts(array('height' => 950), $atts, 'hally_admin');
        return $this->build_iframe_html('dashboard', $atts, 'hally-admin-container');
    }

    public function shortcode_custom_embed($atts) {
        $atts = shortcode_atts(array('path' => '', 'height' => 850), $atts, 'hally_embed');
        return $this->build_iframe_html($atts['path'], $atts, 'hally-custom-container');
    }

    public function render_admin_dashboard() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">☕ پیشخوان مدیریت و مانیتورینگ کافه هالی</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/dashboard'); ?>" target="_blank" class="button button-primary">باز کردن در تب جداگانه ↗</a>
            </div>
            <?php echo $this->build_iframe_html('dashboard', array('height' => 920)); ?>
        </div>
        <?php
    }

    public function render_admin_pos() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">🖥️ صندوق فروشگاهی و تبلت سفارش‌گیر (POS)</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/pos'); ?>" target="_blank" class="button button-primary">حالت تمام‌صفحه صندوق ↗</a>
            </div>
            <?php echo $this->build_iframe_html('pos', array('height' => 920)); ?>
        </div>
        <?php
    }

    public function render_admin_kitchen() {
        ?>
        <div class="wrap hally-wp-admin-wrap" style="direction: rtl; font-family: Tahoma, system-ui, sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h1 style="margin:0; font-weight:800; font-size:24px; color:#1e293b;">👨‍🍳 تابلوی هوشمند آشپزخانه و بار گرم (KDS)</h1>
                <a href="<?php echo esc_url($this->get_app_url() . '/kitchen-display'); ?>" target="_blank" class="button button-primary">نمایشگر تمام‌صفحه آشپزخانه ↗</a>
            </div>
            <?php echo $this->build_iframe_html('kitchen-display', array('height' => 920)); ?>
        </div>
        <?php
    }

    public function render_admin_settings() {
        ?>
        <div class="wrap" style="direction: rtl; text-align: right; max-width: 1050px; font-family: Tahoma, system-ui, sans-serif;">
            <h1 style="font-weight: 800; margin-bottom: 20px;">⚙️ تنظیمات اتصال سیستم کافه هالی به وردپرس</h1>
            <?php settings_errors(); ?>
            <div style="background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                <form method="post" action="options.php">
                    <?php
                    settings_fields('hally_cafe_settings_group');
                    do_settings_sections('hally_cafe_settings_group');
                    ?>
                    <table class="form-table" role="presentation">
                        <tr>
                            <th scope="row"><label for="hally_cafe_app_url">آدرس برنامه کافه هالی</label></th>
                            <td>
                                <input name="hally_cafe_app_url" type="url" id="hally_cafe_app_url" value="<?php echo esc_attr(get_option('hally_cafe_app_url', HALLY_CAFE_DEFAULT_APP_URL)); ?>" class="regular-text" style="direction: ltr; width: 100%;">
                                <p class="description">آدرس هاست یا ساب‌دامین اختصاصی کافه شما.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="hally_cafe_default_height">ارتفاع پیش‌فرض (px)</label></th>
                            <td>
                                <input name="hally_cafe_default_height" type="number" id="hally_cafe_default_height" value="<?php echo esc_attr(get_option('hally_cafe_default_height', 850)); ?>" class="small-text">
                            </td>
                        </tr>
                    </table>
                    <?php submit_button('ذخیره تنظیمات افزونه', 'primary'); ?>
                </form>
            </div>
        </div>
        <?php
    }
}

function hally_cafe_init() {
    return Hally_Cafe_Plugin::get_instance();
}
add_action('plugins_loaded', 'hally_cafe_init');
`;

const README_TXT = `=== Hally Cafe & Restaurant OS ===
Contributors: hallycafe
Tags: cafe, restaurant, menu, pos, food menu, reservation, kitchen display, ordering, digital menu, cafe pos
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

افزونه جامع مدیریت و منوی آنلاین کافه هالی برای وردپرس | متصل‌کننده منوی دیجیتال QR، سفارش‌گیر سالن، تابلوی آشپزخانه و رزرواسیون میز.

== DESCRIPTION ==
افزونه «کافه هالی» (Hally Cafe & Restaurant OS) قدرتمندترین راهکار برای تبدیل هر وب‌سایت وردپرسی به یک سامانه یکپارچه مدیریت کافه، رستوران و آبمیوه/بستنی است.

== INSTALLATION ==
1. فایل زیپ افزونه hally-cafe.zip را دانلود کنید.
2. در پیشخوان وردپرس به بخش افزونه‌ها > افزودن > بارگذاری افزونه بروید.
3. فایل را بارگذاری کرده و فعال کنید.
4. در برگه دلخواه خود شورت‌کد [hally_menu] را قرار دهید.
`;

const CSS_FRONT = `/**
 * Hally Cafe Plugin - Frontend Stylesheet
 */
.hally-cafe-wrapper {
    position: relative;
    width: 100%;
    margin: 0 auto;
    overflow: hidden;
    background: transparent;
}
.hally-cafe-iframe {
    width: 100% !important;
    min-width: 100% !important;
    border: none !important;
    display: block;
    background: transparent;
    border-radius: 12px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
}
.hally-cafe-loading-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #64748b;
    font-family: inherit;
    z-index: 2;
    pointer-events: none;
}
.hally-spinner-dot {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-radius: 50%;
    border-top-color: #3b82f6;
    animation: hally-spin 0.8s linear infinite;
    margin-bottom: 8px;
}
@keyframes hally-spin {
    to { transform: rotate(360deg); }
}
`;

const CSS_ADMIN = `/**
 * Hally Cafe Plugin - WP Admin Stylesheet
 */
.hally-wp-admin-wrap {
    margin: 15px 20px 0 0;
}
.hally-wp-admin-wrap iframe {
    width: 100% !important;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
`;

const JS_FRONT = `/**
 * Hally Cafe Plugin - Frontend & Bridge Script
 */
(function($) {
    'use strict';
    $(document).ready(function() {
        var urlParams = new URLSearchParams(window.location.search);
        var tableFromUrl = urlParams.get('table');

        if (tableFromUrl) {
            $('.hally-cafe-iframe').each(function() {
                var currentSrc = $(this).attr('src');
                if (currentSrc && currentSrc.indexOf('table=') === -1) {
                    var separator = currentSrc.indexOf('?') !== -1 ? '&' : '?';
                    $(this).attr('src', currentSrc + separator + 'table=' + encodeURIComponent(tableFromUrl));
                }
            });
        }

        window.addEventListener('message', function(event) {
            if (!event.data || typeof event.data !== 'object') return;
            if (event.data.type === 'hally:resize' && event.data.height) {
                var targetHeight = parseInt(event.data.height, 10);
                if (targetHeight > 300) {
                    $('.hally-cafe-iframe').css('height', targetHeight + 'px');
                    $('.hally-cafe-wrapper').css('min-height', targetHeight + 'px');
                }
            }
        });
    });
})(jQuery);
`;

export function WordPressPluginExport() {
  const { t, dir } = useI18n();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://mycafe.ir";
  });
  const [isExporting, setIsExporting] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success(`${label} کپی شد!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      const zip = new JSZip();

      const folder = zip.folder("hally-cafe");
      if (!folder) {
        throw new Error("Unable to create zip folder");
      }

      const phpCode = PHP_PLUGIN_TEMPLATE.replace("{{APP_URL}}", appUrl.trim());

      folder.file("hally-cafe.php", phpCode);
      folder.file("readme.txt", README_TXT);

      const assetsFolder = folder.folder("assets");
      if (assetsFolder) {
        const cssFolder = assetsFolder.folder("css");
        cssFolder?.file("hally-cafe.css", CSS_FRONT);
        cssFolder?.file("hally-cafe-admin.css", CSS_ADMIN);

        const jsFolder = assetsFolder.folder("js");
        jsFolder?.file("hally-cafe.js", JS_FRONT);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "hally-cafe-wordpress-plugin.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success(
        t(
          "فایل زیپ افزونه وردپرس آماده و دانلود شد!",
          "WordPress plugin zip generated and downloaded!",
          "تم إنشاء وتنزيل ملف الإضافة المضغوط!",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t(
          "خطا در ایجاد فایل زیپ افزونه",
          "Failed to generate plugin zip",
          "فشل في إنشاء ملف الإضافة",
        ),
      );
    } finally {
      setIsExporting(false);
    }
  };

  const SHORTCODES = [
    {
      code: "[hally_menu]",
      title: "منوی آنلاین دیجیتال کافه",
      desc: "نمایش کامل دسته‌بندی‌ها، منو، جستجو و امکان ثبت سفارش برای مشتریان (مناسب برای اسکن QR میزها).",
      examples: [
        { label: "حالت عادی", code: "[hally_menu]" },
        { label: "فیلتر دسته خاص", code: '[hally_menu category="نوشیدنی‌های گرم"]' },
        { label: "میز پیش‌فرض (کد QR)", code: '[hally_menu table="T-01"]' },
      ],
    },
    {
      code: "[hally_pos]",
      title: "صندوق فروشگاهی و تبلت سفارش‌گیر (POS)",
      desc: "سیستم کامل سالن‌کاران و صندوقدار با انتخاب الزامی شماره میز و ثبت شماره پیگیری فیش کارتخوان.",
      examples: [{ label: "صفحه صندوق", code: '[hally_pos height="900"]' }],
    },
    {
      code: "[hally_reserve]",
      title: "فرم رزرواسیون میز کافه",
      desc: "امکان رزرو آنلاین میز توسط مشتریان با مشخص کردن تاریخ، ساعت و تعداد نفرات و پیامک تأییدیه.",
      examples: [{ label: "فرم استاندارد", code: "[hally_reserve]" }],
    },
    {
      code: "[hally_account]",
      title: "باشگاه مشتریان و سوابق سفارشات",
      desc: "ورود مشتری با شماره موبایل و کد یکبار مصرف OTP، مشاهده امتیازها و تخفیف‌های باشگاه وفاداری.",
      examples: [{ label: "حساب مشتری", code: "[hally_account]" }],
    },
    {
      code: "[hally_kitchen]",
      title: "نمایشگر سفارشات آشپزخانه (KDS)",
      desc: "تابلوی زنده سفارشات برای بار گرم، بار سرد و آشپزخانه جهت تسریع آماده‌سازی و تغییر وضعیت به آماده.",
      examples: [{ label: "تابلوی آشپزخانه", code: "[hally_kitchen]" }],
    },
    {
      code: "[hally_admin]",
      title: "پنل مدیریت جامع کافه هالی",
      desc: "دسترسی مستقیم به تمامی بخش‌های انبار، هزینه‌های جاری، فرمول رسپی و سود و زیان درون سایت وردپرسی شما.",
      examples: [{ label: "پنل مدیریت", code: '[hally_admin height="950"]' }],
    },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      {/* هدر تبدیل به وردپرس */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black shadow">
                WP
              </span>
              <CardTitle className="text-xl">
                {t(
                  "مرکز افزونه وردپرس HallyCafe OS (نسخه بومی و مستقل ۲.۰.۰)",
                  "HallyCafe OS WordPress Plugin (Native v2.0.0)",
                  "إضافة ووردبريس HallyCafe OS (الإصدار الأصلي 2.0.0)",
                )}
              </CardTitle>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold">
                {t("نسخه ۲.۰.۰ بومی Fars.Company", "v2.0.0 Native Fars.Company", "الإصدار 2.0.0")}
              </Badge>
            </div>
            <CardDescription className="text-sm leading-6">
              {t(
                "افزونه ۱۰۰٪ بومی و مستقل بدون نیاز به آی‌فریم و سرور خارجی؛ با جداول اختصاصی پایگاه داده وردپرس، سیستم صندوق، تابلوی زنده آشپزخانه و منوی اختصاصی.",
                "100% native standalone WordPress plugin with internal database tables, POS, live kitchen display, and digital menu.",
                "إضافة ووردبريس أصلية ومستقلة 100% مع قواعد بيانات داخلية ونظام كاشير ومطبخ وقائمة إلكترونية.",
              )}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/HallyCafe-OS.zip"
              download="HallyCafe-OS.zip"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors"
            >
              <Download className="size-4" />
              {t(
                "دانلود مستقیم HallyCafe-OS.zip",
                "Download HallyCafe-OS.zip",
                "تنزيل HallyCafe-OS.zip",
              )}
            </a>
            <a
              href="https://github.com/abashash/HallyCafe-OS/releases/tag/v2.0.0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors"
            >
              <ExternalLink className="size-4" />
              {t("انتشار رسمی در گیت‌هاب", "GitHub Release v2.0.0", "إصدار جيت هاب v2.0.0")}
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 bg-background/80 p-4">
            <Label className="text-sm font-semibold">
              {t(
                "آدرس ریشه برنامه هالی برای درج در تنظیمات پیش‌فرض افزونه وردپرس:",
                "Default App URL embedded into WordPress plugin configuration:",
                "عنوان التطبيق الافتراضي لدمجه في إعدادات إضافة ووردبريس:",
              )}
            </Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                dir="ltr"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://app.yourcafe.com"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => setAppUrl(window.location.origin)}
                className="shrink-0"
              >
                {t("استفاده از آدرس فعلی", "Use Current Domain", "استخدام النطاق الحالي")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "این آدرس به عنوان مقدار اولیه در تنظیمات وردپرس قرار می‌گیرد، اما مدیر سایت در وردپرس بعداً می‌تواند هر زمان آن را تغییر دهد.",
                "This URL serves as default in WP settings, and can be changed later inside WordPress admin anytime.",
                "هذا الرابط يستخدم كقيمة افتراضية، ويمكن تغييره لاحقاً في لوحة تحكم ووردبريس.",
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* تب‌های راهنما، شورت‌کدها و سورس کد */}
      <Tabs defaultValue="shortcodes" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/60">
          <TabsTrigger value="shortcodes" className="gap-2 py-2.5">
            <Layers className="size-4" />
            {t("شورت‌کدهای اختصاصی", "Shortcodes Reference", "الأكواد القصيرة")}
          </TabsTrigger>
          <TabsTrigger value="install_guide" className="gap-2 py-2.5">
            <BookOpen className="size-4" />
            {t("راهنمای ۳ مرحله‌ای نصب", "3-Step Setup Guide", "دليل التثبيت")}
          </TabsTrigger>
          <TabsTrigger value="elementor" className="gap-2 py-2.5">
            <Sparkles className="size-4" />
            {t("اتصال به المنتور و QR", "Elementor & QR Codes", "الربط مع إليمينتور")}
          </TabsTrigger>
          <TabsTrigger value="php_source" className="gap-2 py-2.5">
            <Code2 className="size-4" />
            {t("مشاهده کد PHP افزونه", "PHP Source Code", "كود PHP المصدري")}
          </TabsTrigger>
        </TabsList>

        {/* ۱. تب شورت‌کدها */}
        <TabsContent value="shortcodes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {SHORTCODES.map((sc) => {
              const isCopied = copiedCode === sc.code;
              return (
                <Card
                  key={sc.code}
                  className="transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                        {sc.code}
                      </code>
                      <Button
                        size="sm"
                        variant={isCopied ? "default" : "secondary"}
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => copyToClipboard(sc.code, sc.title)}
                      >
                        {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {isCopied
                          ? t("کپی شد", "Copied", "تم النسخ")
                          : t("کپی شورت‌کد", "Copy", "نسخ")}
                      </Button>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground mt-2">
                      {sc.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-5">{sc.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5 border-t pt-3">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {t("نمونه پارامترها:", "Examples:", "أمثلة:")}
                      </span>
                      {sc.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs font-mono"
                        >
                          <span className="text-muted-foreground font-sans text-[11px]">
                            {ex.label}:
                          </span>
                          <span className="text-primary truncate">{ex.code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0"
                            onClick={() => copyToClipboard(ex.code, ex.label)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ۲. راهنمای ۳ مرحله‌ای نصب */}
        <TabsContent value="install_guide" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t(
                  "راهنمای گام‌به‌گام نصب افزونه کافه هالی در پیشخوان وردپرس",
                  "Step-by-Step Installation in WordPress Admin",
                  "دليل التثبيت خطوة بخطوة في لوحة تحكم ووردبريس",
                )}
              </CardTitle>
              <CardDescription>
                {t(
                  "بدون نیاز به هاست مجزا یا تنظیمات پیچیده، این ۳ گام ساده را در سایت وردپرسی خود طی کنید:",
                  "Follow these 3 simple steps to integrate this app with your WordPress site:",
                  "اتبع هذه الخطوات الـ 3 البسيطة لربط التطبيق بموقعك:",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    ۱
                  </div>
                  <h4 className="font-bold text-base text-foreground">
                    {t("دانلود و آپلود افزونه", "Download & Upload", "تنزيل ورفع الإضافة")}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-6">
                    دکمه <strong>دانلود فایل ZIP</strong> را در بالای همین صفحه بزنید. در وردپرس به
                    مسیر{" "}
                    <code className="text-primary bg-muted px-1 rounded">
                      پیشخوان &gt; افزونه‌ها &gt; افزودن افزونه &gt; بارگذاری افزونه
                    </code>{" "}
                    رفته و فایل{" "}
                    <code className="text-primary bg-muted px-1 rounded">
                      hally-cafe-wordpress-plugin.zip
                    </code>{" "}
                    را بارگذاری و فعال کنید.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    ۲
                  </div>
                  <h4 className="font-bold text-base text-foreground">
                    {t("تنظیم آدرس برنامه", "Configure App URL", "ضبط عنوان التطبيق")}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-6">
                    پس از فعال‌سازی، منوی جدید <strong>کافه هالی</strong> در نوار کناری پیشخوان ظاهر
                    می‌شود. به بخش <strong>تنظیمات و راهنما</strong> بروید و اطمینان حاصل کنید آدرس
                    سامانه هالی درج شده است.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-5 space-y-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    ۳
                  </div>
                  <h4 className="font-bold text-base text-foreground">
                    {t(
                      "قرار دادن شورت‌کد در برگه",
                      "Insert Shortcode in Page",
                      "إدراج الكود في صفحة",
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-6">
                    در وردپرس یک برگه جدید به نام <strong>«منوی آنلاین»</strong> یا{" "}
                    <strong>«رزرو میز»</strong> بسازید و شورت‌کد{" "}
                    <code className="text-primary bg-muted px-1 rounded">[hally_menu]</code> یا{" "}
                    <code className="text-primary bg-muted px-1 rounded">[hally_reserve]</code> را
                    داخل آن قرار داده و انتشار دهید!
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-900 dark:text-amber-200 leading-6 flex items-start gap-3">
                <Wrench className="size-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>نکته مهم برای صندوق و آشپزخانه:</strong> شورت‌کدهای{" "}
                  <code>[hally_pos]</code> و <code>[hally_kitchen]</code> برای پرسنل کافه طراحی
                  شده‌اند. پیشنهاد می‌شود برگه‌های مربوط به آن‌ها را در وردپرس در حالت «خصوصی
                  (Private)» یا دارای «رمز عبور (Password Protected)» قرار دهید، یا مستقیماً از منوی
                  درون پیشخوان وردپرس (پیشخوان &gt; کافه هالی &gt; صندوق و سفارش‌گیر) استفاده کنید.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ۳. اتصال با المنتور و QR کد */}
        <TabsContent value="elementor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t(
                  "نحوه طراحی با المنتور (Elementor) و اتصال بارکد QR میزها",
                  "Elementor Styling & Table QR Code Setup",
                  "التصميم باستخدام إليمينتور وإعداد QR الطاولات",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4 space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    استفاده در صفحه‌ساز المنتور:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>برگه منوی خود را در ویرایشگر المنتور باز کنید.</li>
                    <li>
                      ویجت <strong>کد کوتاه (Shortcode)</strong> یا <strong>HTML سفارشی</strong> را
                      در بخش دلخواه صفحه رها کنید.
                    </li>
                    <li>
                      عبارت <code>[hally_menu height="850"]</code> را داخل آن وارد کنید.
                    </li>
                    <li>
                      عرض بخش (Section) را روی «تمام عرض (Full Width)» قرار دهید تا منو کل صفحه گوشی
                      را پر کند.
                    </li>
                  </ol>
                </div>

                <div className="rounded-xl border p-4 space-y-2">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <ExternalLink className="size-4 text-primary" />
                    تنظیم QR Code برای هر میز کافه:
                  </h4>
                  <p className="text-xs">
                    اگر می‌خواهید روی هر میز کافه یک بارکد QR بگذارید که مشتری با اسکن آن مستقیماً
                    شماره میز خودش را در منو ببیند، از فرمت زیر در ساخت بارکد استفاده کنید:
                  </p>
                  <div className="rounded-md bg-muted p-2 font-mono text-xs text-primary truncate">
                    https://yoursite.com/menu?table=T-01
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    افزونه به صورت هوشمند پارامتر <code>table</code> را از آدرس سایت وردپرس دریافت
                    کرده و به منو پاس می‌دهد، بنابراین سفارشات ثبت شده با شماره میز صحیح ثبت
                    می‌شوند!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ۴. مشاهده کد PHP افزونه */}
        <TabsContent value="php_source" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  {t(
                    "کد کامل فایل اصلی افزونه (hally-cafe.php)",
                    "Complete Plugin Source Code (hally-cafe.php)",
                    "كود ملف الإضافة الرئيسي",
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  اگر به هاست cPanel یا FTP دسترسی دارید، می‌توانید مستقیماً این کد را در مسیر
                  wp-content/plugins/hally-cafe/hally-cafe.php قرار دهید.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  copyToClipboard(
                    PHP_PLUGIN_TEMPLATE.replace("{{APP_URL}}", appUrl.trim()),
                    "کد PHP افزونه",
                  )
                }
              >
                <Copy className="size-4" />
                {t("کپی کل کد PHP", "Copy PHP Code", "نسخ كود PHP")}
              </Button>
            </CardHeader>
            <CardContent>
              <pre
                className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs font-mono text-zinc-100"
                dir="ltr"
              >
                {PHP_PLUGIN_TEMPLATE.replace("{{APP_URL}}", appUrl.trim())}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
