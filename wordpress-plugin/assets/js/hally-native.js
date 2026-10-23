/**
 * Hally Cafe & Restaurant OS - Native WordPress Client Engine
 * Developed by Fars.Company
 */

(function($) {
  'use strict';

  window.HallyCafe = {
    cart: [],
    menuData: null,
    activeCategory: 'all',
    selectedTable: 'T-01',

    init: function() {
      var self = this;
      $(document).ready(function() {
        self.bindMenuEvents();
        self.bindPosEvents();
        self.bindKdsEvents();
        self.bindReserveEvents();
        self.loadInitialData();
      });
    },

    loadInitialData: function() {
      var self = this;
      if ($('#hally-native-menu').length || $('#hally-native-pos').length) {
        $.ajax({
          url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'menu',
          method: 'GET',
          beforeSend: function(xhr) {
            if (window.hallyData && window.hallyData.nonce) {
              xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
            }
          },
          success: function(res) {
            if (res && res.success) {
              self.menuData = res.data;
              self.renderMenuGrid();
              self.renderPosGrid();
            }
          }
        });
      }
    },

    bindMenuEvents: function() {
      var self = this;

      // Category filter pills
      $(document).on('click', '.hally-cat-pill', function() {
        $('.hally-cat-pill').removeClass('active');
        $(this).addClass('active');
        self.activeCategory = $(this).data('category');
        self.renderMenuGrid();
      });

      // Search filter
      $(document).on('input', '#hally-menu-search', function() {
        var query = $(this).val().toLowerCase().trim();
        self.renderMenuGrid(query);
      });

      // Add item to cart
      $(document).on('click', '.hally-add-to-cart', function() {
        var itemId = $(this).data('id');
        self.addToCart(itemId);
      });

      // Open Cart Modal
      $(document).on('click', '#hally-open-cart-btn', function() {
        self.renderCartModal();
        $('#hally-cart-modal').fadeIn(200);
      });

      // Close Modal
      $(document).on('click', '.hally-close-modal', function() {
        $('.hally-modal-overlay').fadeOut(200);
      });

      // Cart Item Quantity
      $(document).on('click', '.hally-cart-plus', function() {
        var idx = $(this).data('index');
        self.cart[idx].qty++;
        self.updateCartUI();
        self.renderCartModal();
      });

      $(document).on('click', '.hally-cart-minus', function() {
        var idx = $(this).data('index');
        if (self.cart[idx].qty > 1) {
          self.cart[idx].qty--;
        } else {
          self.cart.splice(idx, 1);
        }
        self.updateCartUI();
        self.renderCartModal();
      });

      // Submit Online Order
      $(document).on('submit', '#hally-order-form', function(e) {
        e.preventDefault();
        self.submitOrder();
      });
    },

    addToCart: function(itemId) {
      if (!this.menuData || !this.menuData.items) return;
      var item = this.menuData.items.find(function(i) { return i.id == itemId; });
      if (!item) return;

      var existing = this.cart.find(function(c) { return c.id == itemId; });
      if (existing) {
        existing.qty++;
      } else {
        this.cart.push({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          qty: 1
        });
      }

      this.updateCartUI();
      this.showToast('«' + item.name + '» به سفارش اضافه شد.');
    },

    updateCartUI: function() {
      var totalCount = 0;
      var totalPrice = 0;

      this.cart.forEach(function(item) {
        totalCount += item.qty;
        totalPrice += (item.price * item.qty);
      });

      $('#hally-cart-count').text(totalCount);
      $('#hally-cart-total').text(this.formatMoney(totalPrice) + ' تومان');

      if (totalCount > 0) {
        $('#hally-floating-cart').slideDown(200);
      } else {
        $('#hally-floating-cart').slideUp(200);
      }
    },

    renderMenuGrid: function(searchQuery) {
      if (!this.menuData || !this.menuData.items) return;
      var self = this;
      var filtered = this.menuData.items;

      if (this.activeCategory !== 'all') {
        filtered = filtered.filter(function(i) {
          return i.category_id == self.activeCategory || i.category_slug == self.activeCategory;
        });
      }

      if (searchQuery) {
        filtered = filtered.filter(function(i) {
          return i.name.toLowerCase().indexOf(searchQuery) !== -1 ||
                 (i.description && i.description.toLowerCase().indexOf(searchQuery) !== -1);
        });
      }

      var html = '';
      if (filtered.length === 0) {
        html = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#64748b;">هیچ آیتمی در این دسته‌بندی یافت نشد.</div>';
      } else {
        filtered.forEach(function(item) {
          var img = item.image_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80';
          html += '<div class="hally-item-card">';
          html += '  <img src="' + img + '" class="hally-item-img" alt="' + item.name + '" loading="lazy" />';
          html += '  <div class="hally-item-body">';
          html += '    <h3 class="hally-item-title">' + item.name + '</h3>';
          html += '    <p class="hally-item-desc">' + (item.description || 'تهیه شده از تازه‌ترین مواد اولیه درجه یک') + '</p>';
          html += '    <div class="hally-item-footer">';
          html += '      <div class="hally-item-price">' + self.formatMoney(item.price) + ' <small>تومان</small></div>';
          html += '      <button type="button" class="hally-add-btn hally-add-to-cart" data-id="' + item.id + '">+ افزودن</button>';
          html += '    </div>';
          html += '  </div>';
          html += '</div>';
        });
      }

      $('#hally-menu-items-container').html(html);
    },

    renderCartModal: function() {
      var self = this;
      var html = '';
      var subtotal = 0;

      if (this.cart.length === 0) {
        html = '<p style="text-align:center; color:#64748b; padding:20px 0;">سبد سفارش شما خالی است.</p>';
        $('#hally-order-submit-btn').prop('disabled', true);
      } else {
        $('#hally-order-submit-btn').prop('disabled', false);
        html += '<div style="max-height: 250px; overflow-y:auto; margin-bottom: 15px;">';
        this.cart.forEach(function(item, idx) {
          var itemTotal = item.price * item.qty;
          subtotal += itemTotal;
          html += '<div class="hally-ticket-row">';
          html += '  <div>';
          html += '    <strong>' + item.name + '</strong>';
          html += '    <div style="font-size:12px; color:#64748b;">' + self.formatMoney(item.price) + ' تومان</div>';
          html += '  </div>';
          html += '  <div style="display:flex; align-items:center; gap:8px;">';
          html += '    <button type="button" class="hally-cart-minus" data-index="' + idx + '" style="width:28px; height:28px; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer;">-</button>';
          html += '    <span style="font-weight:700; min-width:20px; text-align:center;">' + item.qty + '</span>';
          html += '    <button type="button" class="hally-cart-plus" data-index="' + idx + '" style="width:28px; height:28px; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer;">+</button>';
          html += '  </div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<div style="border-top:2px dashed #cbd5e1; padding-top:12px; margin-top:12px; display:flex; justify-content:space-between; font-weight:800; font-size:16px;">';
        html += '  <span>مبلغ کل سفارش:</span>';
        html += '  <span style="color:#8b5cf6;">' + self.formatMoney(subtotal) + ' تومان</span>';
        html += '</div>';
      }

      $('#hally-cart-modal-items').html(html);
    },

    submitOrder: function() {
      var self = this;
      if (this.cart.length === 0) return;

      var tableNum = $('#hally-order-table').val() || 'T-01';
      var phone = $('#hally-order-phone').val() || '';
      var notes = $('#hally-order-notes').val() || '';

      var total = 0;
      this.cart.forEach(function(i) { total += (i.price * i.qty); });

      var payload = {
        table_number: tableNum,
        customer_phone: phone,
        notes: notes,
        total_amount: total,
        items: this.cart
      };

      $('#hally-order-submit-btn').prop('disabled', true).text('در حال ثبت سفارش...');

      $.ajax({
        url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'orders',
        method: 'POST',
        data: JSON.stringify(payload),
        contentType: 'application/json',
        beforeSend: function(xhr) {
          if (window.hallyData && window.hallyData.nonce) {
            xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
          }
        },
        success: function(res) {
          $('#hally-cart-modal').fadeOut(200);
          self.cart = [];
          self.updateCartUI();
          self.showToast('✅ سفارش شما با موفقیت ثبت شد و به آشپزخانه ارسال گردید.');
          $('#hally-order-submit-btn').prop('disabled', false).text('تایید و ثبت نهایی سفارش');
        },
        error: function() {
          self.showToast('خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.');
          $('#hally-order-submit-btn').prop('disabled', false).text('تایید و ثبت نهایی سفارش');
        }
      });
    },

    // POS Implementation
    bindPosEvents: function() {
      var self = this;
      $(document).on('click', '.hally-pos-item-btn', function() {
        var id = $(this).data('id');
        self.addToCart(id);
        self.renderPosTicket();
      });

      $(document).on('click', '#hally-pos-clear', function() {
        self.cart = [];
        self.updateCartUI();
        self.renderPosTicket();
      });

      $(document).on('click', '#hally-pos-checkout', function() {
        if (self.cart.length === 0) {
          alert('لطفاً ابتدا حداقل یک آیتم انتخاب کنید.');
          return;
        }
        self.submitPosOrder();
      });
    },

    renderPosGrid: function() {
      if (!this.menuData || !this.menuData.items || !$('#hally-pos-items-grid').length) return;
      var self = this;
      var html = '';
      this.menuData.items.forEach(function(item) {
        html += '<button type="button" class="hally-pos-item-btn" data-id="' + item.id + '" style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:12px; text-align:right; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.05);">';
        html += '  <div style="font-weight:700; color:#1e293b; font-size:14px;">' + item.name + '</div>';
        html += '  <div style="color:#8b5cf6; font-weight:800; font-size:13px; margin-top:4px;">' + self.formatMoney(item.price) + ' <span style="font-size:11px; font-weight:normal; color:#64748b;">تومان</span></div>';
        html += '</button>';
      });
      $('#hally-pos-items-grid').html(html);
    },

    renderPosTicket: function() {
      var self = this;
      var html = '';
      var subtotal = 0;

      this.cart.forEach(function(item, idx) {
        var total = item.price * item.qty;
        subtotal += total;
        html += '<div class="hally-ticket-row">';
        html += '  <span>' + item.name + ' × ' + item.qty + '</span>';
        html += '  <span style="font-weight:700;">' + self.formatMoney(total) + '</span>';
        html += '</div>';
      });

      $('#hally-pos-ticket-list').html(html || '<div style="text-align:center; color:#94a3b8; padding:30px 0;">سفارشی ثبت نشده است</div>');
      $('#hally-pos-subtotal').text(self.formatMoney(subtotal) + ' تومان');
    },

    submitPosOrder: function() {
      var self = this;
      var tableNum = $('#hally-pos-table-select').val() || 'میز سالن';
      var payment = $('input[name="pos_payment"]:checked').val() || 'pos';
      var total = 0;
      this.cart.forEach(function(i) { total += (i.price * i.qty); });

      var payload = {
        table_number: tableNum,
        payment_method: payment,
        payment_status: 'paid',
        order_status: 'preparing',
        total_amount: total,
        items: this.cart
      };

      $.ajax({
        url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'orders',
        method: 'POST',
        data: JSON.stringify(payload),
        contentType: 'application/json',
        beforeSend: function(xhr) {
          if (window.hallyData && window.hallyData.nonce) {
            xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
          }
        },
        success: function(res) {
          alert('سفارش صندوق با موفقیت ثبت و فیش صادر گردید.');
          self.cart = [];
          self.updateCartUI();
          self.renderPosTicket();
        }
      });
    },

    // KDS Kitchen Board
    bindKdsEvents: function() {
      var self = this;
      if ($('#hally-kds-board').length) {
        self.loadKdsOrders();
        setInterval(function() {
          self.loadKdsOrders();
        }, 10000);

        $(document).on('click', '.hally-kds-status-btn', function() {
          var orderId = $(this).data('id');
          var nextStatus = $(this).data('status');
          self.updateOrderStatus(orderId, nextStatus);
        });
      }
    },

    loadKdsOrders: function() {
      var self = this;
      $.ajax({
        url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'orders?status=active',
        method: 'GET',
        beforeSend: function(xhr) {
          if (window.hallyData && window.hallyData.nonce) {
            xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
          }
        },
        success: function(res) {
          if (res && res.data) {
            self.renderKdsCards(res.data);
          }
        }
      });
    },

    renderKdsCards: function(orders) {
      var html = '';
      if (!orders || orders.length === 0) {
        html = '<div style="grid-column:1/-1; text-align:center; padding:50px; background:#fff; border-radius:12px; color:#64748b;">در حال حاضر سفارش فعالی در آشپزخانه وجود ندارد.</div>';
      } else {
        orders.forEach(function(o) {
          var isReady = o.order_status === 'ready';
          html += '<div class="hally-kds-card ' + (isReady ? 'ready' : 'cooking') + '">';
          html += '  <div class="hally-kds-header">';
          html += '    <span>' + (o.table_number || 'میز') + '</span>';
          html += '    <span style="font-size:12px; color:#64748b;">سفارش #' + o.id + '</span>';
          html += '  </div>';
          html += '  <div class="hally-kds-body">';
          if (o.items && o.items.length) {
            html += '    <ul style="list-style:none; padding:0; margin:0 0 15px 0;">';
            o.items.forEach(function(it) {
              html += '      <li style="padding:4px 0; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between;">';
              html += '        <strong>' + it.name + '</strong>';
              html += '        <span style="background:#ede9fe; color:#6d28d9; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:700;">' + it.quantity + ' عدد</span>';
              html += '      </li>';
            });
            html += '    </ul>';
          }
          if (o.notes) {
            html += '    <p style="background:#fffbeb; padding:8px; border-radius:6px; font-size:12px; color:#b45309; margin-bottom:12px;">یادداشت: ' + o.notes + '</p>';
          }
          if (!isReady) {
            html += '    <button type="button" class="hally-kds-status-btn hally-btn-primary" data-id="' + o.id + '" data-status="ready" style="background:#10b981;">✅ آماده تحویل</button>';
          } else {
            html += '    <button type="button" class="hally-kds-status-btn hally-btn-primary" data-id="' + o.id + '" data-status="delivered" style="background:#64748b;">📦 تحویل داده شد (بستن)</button>';
          }
          html += '  </div>';
          html += '</div>';
        });
      }
      $('#hally-kds-board').html(html);
    },

    updateOrderStatus: function(orderId, status) {
      var self = this;
      $.ajax({
        url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'orders/update-status',
        method: 'POST',
        data: JSON.stringify({ id: orderId, status: status }),
        contentType: 'application/json',
        beforeSend: function(xhr) {
          if (window.hallyData && window.hallyData.nonce) {
            xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
          }
        },
        success: function() {
          self.loadKdsOrders();
        }
      });
    },

    // Table Reservation
    bindReserveEvents: function() {
      var self = this;
      $(document).on('submit', '#hally-reservation-form', function(e) {
        e.preventDefault();
        var payload = {
          customer_name: $('#res-name').val(),
          customer_phone: $('#res-phone').val(),
          table_number: $('#res-table').val(),
          guests_count: $('#res-guests').val(),
          reservation_date: $('#res-date').val(),
          reservation_time: $('#res-time').val(),
          notes: $('#res-notes').val()
        };

        $.ajax({
          url: (window.hallyData && window.hallyData.restUrl ? window.hallyData.restUrl : '/wp-json/hally/v1/') + 'reservations',
          method: 'POST',
          data: JSON.stringify(payload),
          contentType: 'application/json',
          beforeSend: function(xhr) {
            if (window.hallyData && window.hallyData.nonce) {
              xhr.setRequestHeader('X-WP-Nonce', window.hallyData.nonce);
            }
          },
          success: function() {
            alert('درخواست رزرو میز شما با موفقیت ثبت شد. به‌زودی با شما تماس خواهیم گرفت.');
            $('#hally-reservation-form')[0].reset();
          }
        });
      });
    },

    formatMoney: function(num) {
      return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    showToast: function(msg) {
      var $t = $('<div style="position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#0f172a; color:#fff; padding:12px 24px; border-radius:30px; z-index:999999; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-size:14px; font-weight:600;">' + msg + '</div>');
      $('body').append($t);
      setTimeout(function() {
        $t.fadeOut(300, function() { $(this).remove(); });
      }, 3000);
    }
  };

  HallyCafe.init();

})(jQuery);
