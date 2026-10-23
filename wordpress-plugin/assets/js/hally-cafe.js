/**
 * Hally Cafe Plugin - Frontend & Bridge Script
 */

(function ($) {
  "use strict";

  $(document).ready(function () {
    // دریافت پارامتر table از URL صفحه وردپرس در صورت وجود
    var urlParams = new URLSearchParams(window.location.search);
    var tableFromUrl = urlParams.get("table");

    if (tableFromUrl) {
      $(".hally-cafe-iframe").each(function () {
        var currentSrc = $(this).attr("src");
        if (currentSrc && currentSrc.indexOf("table=") === -1) {
          var separator = currentSrc.indexOf("?") !== -1 ? "&" : "?";
          $(this).attr("src", currentSrc + separator + "table=" + encodeURIComponent(tableFromUrl));
        }
      });
    }

    // گوش دادن به رویدادهای postMessage جهت تغییر خودکار ارتفاع در صورت ارسال از کافه هالی
    window.addEventListener("message", function (event) {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "hally:resize" && event.data.height) {
        var targetHeight = parseInt(event.data.height, 10);
        if (targetHeight > 300) {
          $(".hally-cafe-iframe").css("height", targetHeight + "px");
          $(".hally-cafe-wrapper").css("min-height", targetHeight + "px");
        }
      }

      if (event.data.type === "hally:scroll_to_top") {
        $("html, body").animate({ scrollTop: 0 }, 300);
      }
    });
  });
})(jQuery);
