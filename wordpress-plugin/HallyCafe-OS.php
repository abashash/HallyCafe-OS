<?php
/**
 * Plugin Name: HallyCafe OS | افزونه مدیریت و منوی آنلاین کافه هالی
 * Plugin URI:  https://github.com/abashash/HallyCafe-OS
 * Description: سیستم کاملاً مستقل، بومی و جامع مدیریت کافه و رستوران در وردپرس (بدون نیاز به سرور یا آی‌فریم خارجی)؛ شامل دیتابیس بومی در وردپرس، منوی دیجیتال آنلاین، صندوق فروشگاهی (POS)، تابلوی زنده آشپزخانه (KDS)، رزرواسیون میز، انبارداری و مدیریت هزینه‌ها.
 * Version:     2.0.0
 * Author:      Fars.Company
 * Author URI:  https://fars.company
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: HallyCafe-OS
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

if (class_exists('Hally_Native_Cafe_Plugin', false)) {
    return;
}

define('HALLY_CAFE_VERSION', '2.0.0');
define('HALLY_CAFE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HALLY_CAFE_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * کلاس اصلی سامانه بومی کافه هالی در وردپرس
 */
class Hally_Native_Cafe_Plugin {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // فعال‌سازی و ساخت جداول دیتابیس در وردپرس
        register_activation_hook(__FILE__, array($this, 'create_database_tables'));

        // ثبت منوها در پیشخوان وردپرس
        add_action('admin_menu', array($this, 'register_admin_menus'));

        // ثبت اسکریپت‌ها و استایل‌های بومی
        add_action('wp_enqueue_scripts', array($this, 'enqueue_native_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_native_assets'));

        // ثبت APIهای REST وردپرس
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // شورت‌کدهای کاملاً بومی (بدون نیاز به آی‌فریم یا سرور خارجی)
        add_shortcode('hally_menu', array($this, 'render_shortcode_menu'));
        add_shortcode('hally_pos', array($this, 'render_shortcode_pos'));
        add_shortcode('hally_kitchen', array($this, 'render_shortcode_kitchen'));
        add_shortcode('hally_reserve', array($this, 'render_shortcode_reserve'));
        add_shortcode('hally_dashboard', array($this, 'render_shortcode_dashboard'));
        add_shortcode('hally_admin', array($this, 'render_shortcode_dashboard'));
    }

    /**
     * ساخت جداول اختصاصی سامانه در دیتابیس وردپرس
     */
    public function create_database_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // جدول دسته‌بندی‌ها
        $table_categories = $wpdb->prefix . 'hally_categories';
        $sql_cat = "CREATE TABLE $table_categories (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            name varchar(191) NOT NULL,
            slug varchar(191) NOT NULL,
            sort_order int(11) DEFAULT 0,
            is_active tinyint(1) DEFAULT 1,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta($sql_cat);

        // جدول اقلام منو
        $table_menu = $wpdb->prefix . 'hally_menu_items';
        $sql_menu = "CREATE TABLE $table_menu (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            category_id bigint(20) NOT NULL,
            name varchar(191) NOT NULL,
            description text,
            price decimal(12,0) NOT NULL DEFAULT 0,
            cost_price decimal(12,0) DEFAULT 0,
            image_url text,
            is_available tinyint(1) DEFAULT 1,
            is_popular tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta($sql_menu);

        // جدول میزها
        $table_tables = $wpdb->prefix . 'hally_tables';
        $sql_tables = "CREATE TABLE $table_tables (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            number varchar(50) NOT NULL,
            label varchar(100) NOT NULL,
            capacity int(11) DEFAULT 4,
            status varchar(50) DEFAULT 'available',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta($sql_tables);

        // جدول سفارشات
        $table_orders = $wpdb->prefix . 'hally_orders';
        $sql_orders = "CREATE TABLE $table_orders (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            order_number varchar(100) NOT NULL,
            table_number varchar(50) DEFAULT 'T-01',
            customer_phone varchar(50),
            total_amount decimal(12,0) NOT NULL DEFAULT 0,
            discount_amount decimal(12,0) DEFAULT 0,
            tax_amount decimal(12,0) DEFAULT 0,
            final_amount decimal(12,0) NOT NULL DEFAULT 0,
            payment_status varchar(50) DEFAULT 'pending',
            payment_method varchar(50) DEFAULT 'online',
            order_status varchar(50) DEFAULT 'preparing',
            notes text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate ENGINE=InnoDB;";
        dbDelta($sql_orders);

        // جدول آیتم‌های فاکتور سفارش
        $table_order_items = $wpdb->prefix . 'hally_order_items';
        $sql_items = "CREATE TABLE $table_order_items (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            order_id bigint(20) NOT NULL,
            name varchar(191) NOT NULL,
            quantity int(11) NOT NULL DEFAULT 1,
            unit_price decimal(12,0) NOT NULL DEFAULT 0,
            total_price decimal(12,0) NOT NULL DEFAULT 0,
            PRIMARY KEY (id)
        ) $charset_collate ENGINE=InnoDB;";
        dbDelta($sql_items);

        // جدول هزینه‌های جاری
        $table_expenses = $wpdb->prefix . 'hally_expenses';
        $sql_expenses = "CREATE TABLE $table_expenses (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            title varchar(191) NOT NULL,
            category varchar(100) DEFAULT 'عمومی',
            amount decimal(12,0) NOT NULL DEFAULT 0,
            expense_date date DEFAULT NULL,
            description text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta($sql_expenses);

        // جدول رزرواسیون میزها
        $table_reservations = $wpdb->prefix . 'hally_reservations';
        $sql_res = "CREATE TABLE $table_reservations (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            customer_name varchar(191) NOT NULL,
            customer_phone varchar(50) NOT NULL,
            table_number varchar(50) DEFAULT 'T-01',
            guests_count int(11) DEFAULT 2,
            reservation_date date DEFAULT NULL,
            reservation_time varchar(20) DEFAULT NULL,
            status varchar(50) DEFAULT 'pending',
            notes text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        dbDelta($sql_res);

        // ثبت داده‌های پیش‌فرض اولیه در صورت خالی بودن دیتابیس
        $this->seed_initial_cafe_data();
    }

    /**
     * درج داده‌های اولیه استاندارد کافه (منو، دسته‌بندی و میزها)
     */
    private function seed_initial_cafe_data() {
        global $wpdb;
        $table_cat = $wpdb->prefix . 'hally_categories';
        $table_menu = $wpdb->prefix . 'hally_menu_items';
        $table_tables = $wpdb->prefix . 'hally_tables';

        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_cat");
        if ($count == 0) {
            // ایجاد دسته‌ها
            $wpdb->insert($table_cat, array('name' => 'نوشیدنی‌های گرم بر پایه اسپرسو', 'slug' => 'hot-coffee', 'sort_order' => 1));
            $cat_hot = $wpdb->insert_id;

            $wpdb->insert($table_cat, array('name' => 'نوشیدنی‌های سرد و بار سرد', 'slug' => 'cold-drinks', 'sort_order' => 2));
            $cat_cold = $wpdb->insert_id;

            $wpdb->insert($table_cat, array('name' => 'کیک و دسر روز', 'slug' => 'cakes', 'sort_order' => 3));
            $cat_cake = $wpdb->insert_id;

            $wpdb->insert($table_cat, array('name' => 'صبحانه و میان‌وعده', 'slug' => 'breakfast', 'sort_order' => 4));
            $cat_bf = $wpdb->insert_id;

            // ایجاد آیتم‌های نمونه
            $items = array(
                array($cat_hot, 'اسپرسو دبل ۱۰۰٪ عربیکا', 'عصاره‌گیری استاندارد از دانه‌های تخصصی اتیوپی', 68000, 22000, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'),
                array($cat_hot, 'کافه لاته با شیر تازه', 'شات دبل اسپرسو با فوم مخملی شیر تبخیر شده', 95000, 32000, 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=400&q=80'),
                array($cat_hot, 'کاپوچینو ایتالیایی', 'ترکیب متوازن اسپرسو، شیر گرم و فوم متراکم با پودر دارچین', 92000, 30000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80'),
                array($cat_cold, 'آیس آمریکانو خنک', 'دبل شات اسپرسو روی تکه‌های یخ و آب سرد معدنی', 75000, 24000, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80'),
                array($cat_cold, 'اسموتی توت‌فرنگی و موز', 'پوره توت‌فرنگی طبیعی همراه با موز و شیر عسلی', 115000, 38000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80'),
                array($cat_cake, 'چیزکیک سن سباستین', 'چیزکیک سوخته اسپانیایی همراه با سس شکلات تلخ بلژیکی', 135000, 48000, 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?auto=format&fit=crop&w=400&q=80'),
                array($cat_bf, 'املت باربیکیو هالی', 'تخم‌مرغ محلی، گوجه فرنگی پخته، فلفل دلمه و نان تازه سنگک', 110000, 35000, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80')
            );

            foreach ($items as $it) {
                $wpdb->insert($table_menu, array(
                    'category_id' => $it[0],
                    'name' => $it[1],
                    'description' => $it[2],
                    'price' => $it[3],
                    'cost_price' => $it[4],
                    'image_url' => $it[5],
                    'is_available' => 1,
                    'is_popular' => 1
                ));
            }

            // ایجاد میزهای سالن
            for ($i = 1; $i <= 8; $i++) {
                $wpdb->insert($table_tables, array(
                    'number' => 'T-0' . $i,
                    'label' => 'میز شماره ' . $i . ' (سالن اصلی)',
                    'capacity' => ($i % 2 == 0) ? 4 : 2,
                    'status' => 'available'
                ));
            }
        }
    }

    /**
     * بارگذاری استایل‌ها و اسکریپت‌های بومی در فرانت و ادمین
     */
    public function enqueue_native_assets() {
        wp_enqueue_style(
            'hally-vazir-font',
            'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css',
            array(),
            HALLY_CAFE_VERSION
        );

        wp_enqueue_style(
            'hally-native-css',
            HALLY_CAFE_PLUGIN_URL . 'assets/css/hally-native.css',
            array('hally-vazir-font'),
            HALLY_CAFE_VERSION
        );

        wp_enqueue_script(
            'hally-native-js',
            HALLY_CAFE_PLUGIN_URL . 'assets/js/hally-native.js',
            array('jquery'),
            HALLY_CAFE_VERSION,
            true
        );

        wp_localize_script('hally-native-js', 'hallyData', array(
            'restUrl' => esc_url_raw(rest_url('hally/v1/')),
            'nonce' => wp_create_nonce('wp_rest'),
            'siteUrl' => home_url()
        ));
    }

    /**
     * ثبت مسیرهای REST API بومی در وردپرس
     */
    public function register_rest_routes() {
        // دریافت منو و دسته‌بندی‌ها
        register_rest_route('hally/v1', '/menu', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_menu'),
            'permission_callback' => '__return_true'
        ));

        // دریافت لیست میزها
        register_rest_route('hally/v1', '/tables', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_tables'),
            'permission_callback' => '__return_true'
        ));

        // ثبت سفارش جدید
        register_rest_route('hally/v1', '/orders', array(
            'methods' => 'POST',
            'callback' => array($this, 'api_create_order'),
            'permission_callback' => '__return_true'
        ));

        // دریافت سفارشات فعال (برای KDS و صندوق)
        register_rest_route('hally/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_orders'),
            'permission_callback' => array($this, 'can_manage_orders')
        ));

        // آپدیت وضعیت سفارش (آماده، تحویل شده و...)
        register_rest_route('hally/v1', '/orders/update-status', array(
            'methods' => 'POST',
            'callback' => array($this, 'api_update_order_status'),
            'permission_callback' => array($this, 'can_manage_orders')
        ));

        // ثبت رزرو میز
        register_rest_route('hally/v1', '/reservations', array(
            'methods' => 'POST',
            'callback' => array($this, 'api_create_reservation'),
            'permission_callback' => '__return_true'
        ));
    }

    public function api_get_menu() {
        global $wpdb;
        $table_cat = $wpdb->prefix . 'hally_categories';
        $table_menu = $wpdb->prefix . 'hally_menu_items';

        $categories = $wpdb->get_results("SELECT * FROM $table_cat WHERE is_active = 1 ORDER BY sort_order ASC");
        $items = $wpdb->get_results("SELECT * FROM $table_menu WHERE is_available = 1 ORDER BY id DESC");

        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'categories' => $categories,
                'items' => $items
            )
        ));
    }

    public function api_get_tables() {
        global $wpdb;
        $table_tables = $wpdb->prefix . 'hally_tables';
        $tables = $wpdb->get_results("SELECT * FROM $table_tables ORDER BY number ASC");
        return rest_ensure_response(array('success' => true, 'data' => $tables));
    }

    public function can_manage_orders() {
        return current_user_can('manage_options');
    }

    public function api_create_order($request) {
        global $wpdb;
        $params = $request->get_json_params();
        if (!is_array($params)) {
            return new WP_Error('invalid_order', 'درخواست سفارش معتبر نیست', array('status' => 400));
        }
        $items = $params['items'] ?? null;
        if (!is_array($items) || count($items) === 0 || count($items) > 50) {
            return new WP_Error('invalid_order', 'اقلام سفارش معتبر نیستند', array('status' => 400));
        }

        $table_num = sanitize_text_field($params['table_number'] ?? 'T-01');
        $phone = sanitize_text_field($params['customer_phone'] ?? '');
        $notes = sanitize_textarea_field($params['notes'] ?? '');
        $is_admin_order = current_user_can('manage_options');
        $payment_method = $is_admin_order
            ? sanitize_text_field($params['payment_method'] ?? 'pos')
            : 'online';
        $payment_status = $is_admin_order && ($params['payment_status'] ?? '') === 'paid'
            ? 'paid'
            : 'pending';
        $allowed_order_statuses = array('preparing', 'ready', 'delivered', 'cancelled');
        $requested_status = sanitize_text_field($params['order_status'] ?? 'preparing');
        $order_status = $is_admin_order && in_array($requested_status, $allowed_order_statuses, true)
            ? $requested_status
            : 'preparing';

        $table_orders = $wpdb->prefix . 'hally_orders';
        $table_items = $wpdb->prefix . 'hally_order_items';
        $table_menu = $wpdb->prefix . 'hally_menu_items';
        $order_items = array();
        $total = 0;

        foreach ($items as $item) {
            if (!is_array($item)) {
                return new WP_Error('invalid_order_item', 'یکی از اقلام سفارش معتبر نیست', array('status' => 400));
            }
            $item_id = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($item['qty'] ?? null, FILTER_VALIDATE_INT);
            if ($item_id === false || $item_id < 1 || $quantity === false || $quantity < 1 || $quantity > 99) {
                return new WP_Error('invalid_order_item', 'شناسه یا تعداد یکی از اقلام معتبر نیست', array('status' => 400));
            }

            $menu_item = $wpdb->get_row($wpdb->prepare(
                "SELECT id, name, price FROM $table_menu WHERE id = %d AND is_available = 1",
                $item_id
            ));
            if (!$menu_item) {
                return new WP_Error('unavailable_item', 'یکی از اقلام سفارش در دسترس نیست', array('status' => 400));
            }

            $unit_price = (float) $menu_item->price;
            $line_total = $unit_price * $quantity;
            $total += $line_total;
            $order_items[] = array(
                'name' => sanitize_text_field($menu_item->name),
                'quantity' => $quantity,
                'unit_price' => $unit_price,
                'total_price' => $line_total
            );
        }

        $order_num = 'ORD-' . date('ymd') . '-' . rand(100, 999);

        if ($wpdb->query('START TRANSACTION') === false) {
            return new WP_Error('db_error', 'خطا در شروع ثبت سفارش', array('status' => 500));
        }

        $inserted = $wpdb->insert($table_orders, array(
            'order_number' => $order_num,
            'table_number' => $table_num,
            'customer_phone' => $phone,
            'total_amount' => $total,
            'final_amount' => $total,
            'payment_status' => $payment_status,
            'payment_method' => $payment_method,
            'order_status' => $order_status,
            'notes' => $notes,
            'created_at' => current_time('mysql')
        ));

        if (!$inserted) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', 'خطا در ثبت فاکتور سفارش', array('status' => 500));
        }

        $order_id = $wpdb->insert_id;

        foreach ($order_items as $item) {
            $item_inserted = $wpdb->insert($table_items, array(
                'order_id' => $order_id,
                'name' => $item['name'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total_price' => $item['total_price']
            ));
            if (!$item_inserted) {
                $wpdb->query('ROLLBACK');
                return new WP_Error('db_error', 'خطا در ثبت اقلام سفارش', array('status' => 500));
            }
        }

        if ($wpdb->query('COMMIT') === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('db_error', 'خطا در نهایی‌سازی سفارش', array('status' => 500));
        }

        return rest_ensure_response(array(
            'success' => true,
            'order_id' => $order_id,
            'order_number' => $order_num
        ));
    }

    public function api_get_orders($request) {
        global $wpdb;
        $status = $request->get_param('status');
        $table_orders = $wpdb->prefix . 'hally_orders';
        $table_items = $wpdb->prefix . 'hally_order_items';

        $where = "1=1";
        if ($status === 'active') {
            $where .= " AND order_status IN ('preparing', 'ready')";
        }

        $orders = $wpdb->get_results("SELECT * FROM $table_orders WHERE $where ORDER BY id DESC LIMIT 50");

        foreach ($orders as &$order) {
            $order->items = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_items WHERE order_id = %d", $order->id));
        }

        return rest_ensure_response(array('success' => true, 'data' => $orders));
    }

    public function api_update_order_status($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $order_id = intval($params['id'] ?? 0);
        $status = sanitize_text_field($params['status'] ?? 'preparing');

        $table_orders = $wpdb->prefix . 'hally_orders';
        $wpdb->update($table_orders, array('order_status' => $status), array('id' => $order_id));

        return rest_ensure_response(array('success' => true));
    }

    public function api_create_reservation($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $table_res = $wpdb->prefix . 'hally_reservations';

        $wpdb->insert($table_res, array(
            'customer_name' => sanitize_text_field($params['customer_name'] ?? ''),
            'customer_phone' => sanitize_text_field($params['customer_phone'] ?? ''),
            'table_number' => sanitize_text_field($params['table_number'] ?? 'T-01'),
            'guests_count' => intval($params['guests_count'] ?? 2),
            'reservation_date' => sanitize_text_field($params['reservation_date'] ?? date('Y-m-d')),
            'reservation_time' => sanitize_text_field($params['reservation_time'] ?? '19:00'),
            'notes' => sanitize_textarea_field($params['notes'] ?? ''),
            'status' => 'pending',
            'created_at' => current_time('mysql')
        ));

        return rest_ensure_response(array('success' => true));
    }

    /**
     * شورت‌کد ۱: منوی آنلاین دیجیتال [hally_menu] (بومی ۱۰۰٪)
     */
    public function render_shortcode_menu($atts) {
        global $wpdb;
        $table_cat = $wpdb->prefix . 'hally_categories';
        $table_tables = $wpdb->prefix . 'hally_tables';

        $categories = $wpdb->get_results("SELECT * FROM $table_cat WHERE is_active = 1 ORDER BY sort_order ASC");
        $tables = $wpdb->get_results("SELECT * FROM $table_tables ORDER BY number ASC");

        ob_start();
        ?>
        <div class="hally-native-app" id="hally-native-menu">
            <!-- هدر منو -->
            <div class="hally-header">
                <div>
                    <h2 class="hally-header-title">☕ منوی دیجیتال آنلاین کافه هالی</h2>
                    <p class="hally-header-subtitle">انتخاب آسان، سفارش سریع و اسکن بارکد میزها</p>
                </div>
                <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; font-size: 13px;">
                    🟢 سفارش‌گیری فعال
                </div>
            </div>

            <!-- باکس جستجو -->
            <div style="margin-bottom: 20px;">
                <input type="text" id="hally-menu-search" class="hally-input" placeholder="🔍 جستجوی نام آیتم، قهوه، نوشیدنی یا دسر..." style="margin:0; border-radius: 30px; padding: 14px 22px; font-size: 15px; background: #fff;" />
            </div>

            <!-- بار دسته‌بندی‌ها -->
            <div class="hally-categories-bar">
                <button type="button" class="hally-cat-pill active" data-category="all">✨ همه آیتم‌ها</button>
                <?php foreach ($categories as $cat): ?>
                    <button type="button" class="hally-cat-pill" data-category="<?php echo esc_attr($cat->id); ?>">
                        <?php echo esc_html($cat->name); ?>
                    </button>
                <?php endforeach; ?>
            </div>

            <!-- شبکه نمایش محصولات منو -->
            <div class="hally-menu-grid" id="hally-menu-items-container">
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
                    در حال بارگذاری منوی آنلاین...
                </div>
            </div>

            <!-- سبد شناور سفارش -->
            <div class="hally-cart-drawer" id="hally-floating-cart" style="display: none;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="background: #8b5cf6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;" id="hally-cart-count">0</span>
                    <span style="font-weight: 700;">سفارشات شما</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span id="hally-cart-total" style="font-weight: 800; color: #a78bfa;">0 تومان</span>
                    <button type="button" id="hally-open-cart-btn" style="background: #8b5cf6; color: #fff; border: none; padding: 8px 18px; border-radius: 20px; font-weight: 700; cursor: pointer;">مشاهده فاکتور 🛒</button>
                </div>
            </div>

            <!-- مودال فاکتور و ثبت نهایی سفارش -->
            <div class="hally-modal-overlay" id="hally-cart-modal" style="display: none;">
                <div class="hally-modal-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 800;">🛒 سبد سفارش و اطلاعات تحویل</h3>
                        <button type="button" class="hally-close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8;">✕</button>
                    </div>

                    <div id="hally-cart-modal-items"></div>

                    <form id="hally-order-form" style="margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                        <label style="font-weight: 700; font-size: 13px;">انتخاب شماره میز کافه:</label>
                        <select id="hally-order-table" class="hally-input">
                            <?php foreach ($tables as $t): ?>
                                <option value="<?php echo esc_attr($t->number); ?>"><?php echo esc_html($t->label . ' (' . $t->number . ')'); ?></option>
                            <?php endforeach; ?>
                        </select>

                        <label style="font-weight: 700; font-size: 13px;">شماره موبایل جهت هماهنگی و پیگیری:</label>
                        <input type="tel" id="hally-order-phone" class="hally-input" placeholder="۰۹۱۲۳۴۵۶۷۸۹" required />

                        <label style="font-weight: 700; font-size: 13px;">یادداشت یا توضیحات سفارش (اختیاری):</label>
                        <textarea id="hally-order-notes" class="hally-input" rows="2" placeholder="کم‌شیرین، بدون یخ، فوم بیشتر..."></textarea>

                        <button type="submit" id="hally-order-submit-btn" class="hally-btn-primary">تایید و ثبت نهایی سفارش</button>
                    </form>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * شورت‌کد ۲: صندوق و تبلت سفارش‌گیر سالن [hally_pos] (بومی ۱۰۰٪)
     */
    public function render_shortcode_pos($atts) {
        global $wpdb;
        $table_tables = $wpdb->prefix . 'hally_tables';
        $tables = $wpdb->get_results("SELECT * FROM $table_tables ORDER BY number ASC");

        ob_start();
        ?>
        <div class="hally-native-app" id="hally-native-pos">
            <div class="hally-pos-layout">
                <!-- ستون آیتم‌های سریع -->
                <div>
                    <div style="background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin:0; font-size: 18px; font-weight: 800;">🖥️ صندوق فروشگاهی و تبلت سفارش‌گیر سالن</h2>
                        <span style="background: #10b981; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">آماده ثبت</span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;" id="hally-pos-items-grid">
                        در حال بارگذاری اقلام صندوق...
                    </div>
                </div>

                <!-- ستون فاکتور سفارش -->
                <div class="hally-pos-ticket">
                    <div class="hally-pos-ticket-header">
                        <div>
                            <h3 style="margin:0; font-size: 16px; font-weight: 800;">🧾 فاکتور جاری</h3>
                            <span style="font-size: 12px; color: #64748b;"><?php echo current_time('Y/m/d - H:i'); ?></span>
                        </div>
                        <button type="button" id="hally-pos-clear" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 12px; border-radius:8px; font-size:12px; cursor:pointer; font-weight:700;">پاک کردن</button>
                    </div>

                    <label style="font-size: 13px; font-weight: 700;">میز سفارش:</label>
                    <select id="hally-pos-table-select" class="hally-input" style="margin-bottom: 12px;">
                        <?php foreach ($tables as $t): ?>
                            <option value="<?php echo esc_attr($t->number); ?>"><?php echo esc_html($t->label); ?></option>
                        <?php endforeach; ?>
                    </select>

                    <div class="hally-ticket-items" id="hally-pos-ticket-list">
                        <div style="text-align: center; color: #94a3b8; padding: 40px 0;">روی آیتم‌های سمت راست کلیک کنید</div>
                    </div>

                    <div style="background: #f8fafc; padding: 14px; border-radius: 10px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 16px;">
                            <span>جمع کل فاکتور:</span>
                            <span style="color:#8b5cf6;" id="hally-pos-subtotal">0 تومان</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">روش پرداخت:</label>
                        <div style="display: flex; gap: 15px; font-size: 13px;">
                            <label><input type="radio" name="pos_payment" value="pos" checked> 💳 کارتخوان (POS)</label>
                            <label><input type="radio" name="pos_payment" value="cash"> 💵 نقدی</label>
                        </div>
                    </div>

                    <button type="button" id="hally-pos-checkout" class="hally-btn-primary">ثبت فاکتور و ارسال به آشپزخانه 🖨️</button>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * شورت‌کد ۳: تابلوی نمایشگر آشپزخانه [hally_kitchen] (بومی ۱۰۰٪)
     */
    public function render_shortcode_kitchen($atts) {
        ob_start();
        ?>
        <div class="hally-native-app" id="hally-native-kitchen">
            <div class="hally-header" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
                <div>
                    <h2 class="hally-header-title">👨‍🍳 تابلوی هوشمند آشپزخانه و بار گرم (KDS)</h2>
                    <p class="hally-header-subtitle">مانیتورینگ زنده فیش‌ها، زمان سفارش و وضعیت آماده‌سازی</p>
                </div>
                <div style="font-size: 14px; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px;">
                    🔄 به‌روزرسانی خودکار هر ۱۰ ثانیه
                </div>
            </div>

            <div class="hally-kds-grid" id="hally-kds-board">
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
                    در حال دریافت سفارشات فعال آشپزخانه...
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * شورت‌کد ۴: فرم رزرواسیون آنلاین میز [hally_reserve] (بومی ۱۰۰٪)
     */
    public function render_shortcode_reserve($atts) {
        global $wpdb;
        $table_tables = $wpdb->prefix . 'hally_tables';
        $tables = $wpdb->get_results("SELECT * FROM $table_tables ORDER BY number ASC");

        ob_start();
        ?>
        <div class="hally-native-app" style="max-width: 600px; margin: 0 auto;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                <h2 style="margin-top:0; font-size: 22px; font-weight: 800; text-align: center; color: #1e1b4b; margin-bottom: 8px;">
                    📅 فرم رزرواسیون آنلاین میز کافه هالی
                </h2>
                <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 25px;">
                    میز مورد نظر و ساعت مراجعه را انتخاب نمایید تا همکاران ما رزرو شما را قطعی کنند.
                </p>

                <form id="hally-reservation-form">
                    <label style="font-weight: 700; font-size: 13px;">نام و نام خانوادگی:</label>
                    <input type="text" id="res-name" class="hally-input" placeholder="مثال: علی احمدی" required />

                    <label style="font-weight: 700; font-size: 13px;">شماره موبایل جهت پیامک تایید:</label>
                    <input type="tel" id="res-phone" class="hally-input" placeholder="۰۹۱۲۳۴۵۶۷۸۹" required />

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 700; font-size: 13px;">تاریخ رزرو:</label>
                            <input type="date" id="res-date" class="hally-input" value="<?php echo date('Y-m-d'); ?>" required />
                        </div>
                        <div>
                            <label style="font-weight: 700; font-size: 13px;">ساعت مراجعه:</label>
                            <input type="time" id="res-time" class="hally-input" value="19:00" required />
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 700; font-size: 13px;">میز دلخواه:</label>
                            <select id="res-table" class="hally-input">
                                <?php foreach ($tables as $t): ?>
                                    <option value="<?php echo esc_attr($t->number); ?>"><?php echo esc_html($t->label . ' (ظرفیت ' . $t->capacity . ' نفر)'); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 700; font-size: 13px;">تعداد میهمانان:</label>
                            <input type="number" id="res-guests" class="hally-input" min="1" max="20" value="2" required />
                        </div>
                    </div>

                    <label style="font-weight: 700; font-size: 13px;">یادداشت یا تمایل به چیدمان تولد/جلسه:</label>
                    <textarea id="res-notes" class="hally-input" rows="3" placeholder="تزیین میز، گل‌آرایی، منوی ویژه..."></textarea>

                    <button type="submit" class="hally-btn-primary" style="margin-top: 10px;">ثبت درخواست رزرواسیون میز</button>
                </form>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * پیشخوان و گزارشات جامع [hally_dashboard]
     */
    public function render_shortcode_dashboard($atts) {
        global $wpdb;
        $table_orders = $wpdb->prefix . 'hally_orders';
        $table_menu = $wpdb->prefix . 'hally_menu_items';
        $table_res = $wpdb->prefix . 'hally_reservations';

        $total_sales = $wpdb->get_var("SELECT SUM(final_amount) FROM $table_orders WHERE payment_status = 'paid'") ?: 0;
        $total_orders = $wpdb->get_var("SELECT COUNT(*) FROM $table_orders") ?: 0;
        $total_items = $wpdb->get_var("SELECT COUNT(*) FROM $table_menu") ?: 0;
        $total_res = $wpdb->get_var("SELECT COUNT(*) FROM $table_res") ?: 0;

        ob_start();
        ?>
        <div class="hally-native-app">
            <div class="hally-header">
                <div>
                    <h2 class="hally-header-title">📊 پیشخوان آمار و عملکرد کافه هالی</h2>
                    <p class="hally-header-subtitle">توسعه داده شده توسط Fars.Company</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-size: 13px; color: #64748b; font-weight: 600;">💰 مجموع فروش کل:</div>
                    <div style="font-size: 22px; font-weight: 800; color: #10b981; margin-top: 8px;"><?php echo number_format($total_sales); ?> <small style="font-size:12px;">تومان</small></div>
                </div>
                <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-size: 13px; color: #64748b; font-weight: 600;">🧾 کل فاکتورهای ثبت‌شده:</div>
                    <div style="font-size: 22px; font-weight: 800; color: #8b5cf6; margin-top: 8px;"><?php echo number_format($total_orders); ?> <small style="font-size:12px;">سفارش</small></div>
                </div>
                <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-size: 13px; color: #64748b; font-weight: 600;">☕ اقلام فعال منو:</div>
                    <div style="font-size: 22px; font-weight: 800; color: #f59e0b; margin-top: 8px;"><?php echo number_format($total_items); ?> <small style="font-size:12px;">قلم کالا</small></div>
                </div>
                <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-size: 13px; color: #64748b; font-weight: 600;">📅 رزرواسیون‌ها:</div>
                    <div style="font-size: 22px; font-weight: 800; color: #3b82f6; margin-top: 8px;"><?php echo number_format($total_res); ?> <small style="font-size:12px;">مورد</small></div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * منوهای پیشخوان ادمین وردپرس
     */
    public function register_admin_menus() {
        add_menu_page(
            'کافه هالی',
            'کافه هالی',
            'manage_options',
            'hally-cafe-admin',
            array($this, 'admin_page_dashboard'),
            'dashicons-coffee',
            26
        );

        add_submenu_page(
            'hally-cafe-admin',
            'پیشخوان کافه',
            'پیشخوان کافه',
            'manage_options',
            'hally-cafe-admin',
            array($this, 'admin_page_dashboard')
        );

        add_submenu_page(
            'hally-cafe-admin',
            'صندوق و سفارش‌گیر (POS)',
            'صندوق و سفارش‌گیر (POS)',
            'manage_options',
            'hally-cafe-pos',
            array($this, 'admin_page_pos')
        );

        add_submenu_page(
            'hally-cafe-admin',
            'تابلوی آشپزخانه (KDS)',
            'تابلوی آشپزخانه (KDS)',
            'manage_options',
            'hally-cafe-kds',
            array($this, 'admin_page_kitchen')
        );

        add_submenu_page(
            'hally-cafe-admin',
            'مدیریت منو و قیمت‌ها',
            'منو و قیمت‌ها',
            'manage_options',
            'hally-cafe-menu',
            array($this, 'admin_page_menu')
        );

        add_submenu_page(
            'hally-cafe-admin',
            'رزرواسیون میزها',
            'رزرواسیون‌ها',
            'manage_options',
            'hally-cafe-res',
            array($this, 'admin_page_reservations')
        );
    }

    public function admin_page_dashboard() {
        echo '<div class="wrap" style="direction:rtl; font-family: Tahoma, sans-serif;">';
        echo $this->render_shortcode_dashboard(array());
        echo '</div>';
    }

    public function admin_page_pos() {
        echo '<div class="wrap" style="direction:rtl; font-family: Tahoma, sans-serif;">';
        echo $this->render_shortcode_pos(array());
        echo '</div>';
    }

    public function admin_page_kitchen() {
        echo '<div class="wrap" style="direction:rtl; font-family: Tahoma, sans-serif;">';
        echo $this->render_shortcode_kitchen(array());
        echo '</div>';
    }

    public function admin_page_menu() {
        global $wpdb;
        $table_menu = $wpdb->prefix . 'hally_menu_items';
        $items = $wpdb->get_results("SELECT * FROM $table_menu ORDER BY id DESC");

        echo '<div class="wrap" style="direction:rtl; font-family: Tahoma, sans-serif;">';
        echo '<h1 style="font-weight:800; margin-bottom:20px;">☕ اقلام منوی کافه هالی</h1>';
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>تصویر</th><th>نام آیتم</th><th>توضیحات</th><th>قیمت فروش</th><th>بهای تمام‌شده</th><th>وضعیت</th></tr></thead>';
        echo '<tbody>';
        foreach ($items as $item) {
            echo '<tr>';
            echo '<td><img src="' . esc_url($item->image_url) . '" style="width:48px; height:48px; object-fit:cover; border-radius:8px;" /></td>';
            echo '<td><strong>' . esc_html($item->name) . '</strong></td>';
            echo '<td>' . esc_html($item->description) . '</td>';
            echo '<td><strong>' . number_format($item->price) . ' تومان</strong></td>';
            echo '<td>' . number_format($item->cost_price) . ' تومان</td>';
            echo '<td>' . ($item->is_available ? '<span style="color:#10b981; font-weight:700;">موجود</span>' : '<span style="color:#ef4444;">ناموجود</span>') . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '</div>';
    }

    public function admin_page_reservations() {
        global $wpdb;
        $table_res = $wpdb->prefix . 'hally_reservations';
        $reservations = $wpdb->get_results("SELECT * FROM $table_res ORDER BY id DESC LIMIT 50");

        echo '<div class="wrap" style="direction:rtl; font-family: Tahoma, sans-serif;">';
        echo '<h1 style="font-weight:800; margin-bottom:20px;">📅 لیست رزرواسیون میزها</h1>';
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>شناسه</th><th>نام مشتری</th><th>موبایل</th><th>میز</th><th>تعداد نفرات</th><th>تاریخ و ساعت</th><th>وضعیت</th></tr></thead>';
        echo '<tbody>';
        if (empty($reservations)) {
            echo '<tr><td colspan="7" style="text-align:center; padding:30px;">هیچ رزرواسیونی ثبت نشده است.</td></tr>';
        } else {
            foreach ($reservations as $r) {
                echo '<tr>';
                echo '<td>#' . $r->id . '</td>';
                echo '<td><strong>' . esc_html($r->customer_name) . '</strong></td>';
                echo '<td>' . esc_html($r->customer_phone) . '</td>';
                echo '<td>' . esc_html($r->table_number) . '</td>';
                echo '<td>' . esc_html($r->guests_count) . ' نفر</td>';
                echo '<td>' . esc_html($r->reservation_date . ' - ' . $r->reservation_time) . '</td>';
                echo '<td><span style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:12px; font-weight:700; font-size:12px;">' . esc_html($r->status) . '</span></td>';
                echo '</tr>';
            }
        }
        echo '</tbody></table>';
        echo '</div>';
    }
}

function hally_cafe_native_init() {
    return Hally_Native_Cafe_Plugin::get_instance();
}
add_action('plugins_loaded', 'hally_cafe_native_init');
