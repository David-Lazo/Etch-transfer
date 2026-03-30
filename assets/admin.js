(function ($) {
    'use strict';

    // ── Tabs ──────────────────────────────────────────────────────────────────
    $('.et-tab').on('click', function () {
        var tab = $(this).data('tab');
        $('.et-tab').removeClass('active');
        $('.et-tab-panel').removeClass('active');
        $(this).addClass('active');
        $('#et-tab-' + tab).addClass('active');
    });

    // ── Checkbox select all ───────────────────────────────────────────────────
    $(document).on('click', '.et-select-all', function () {
        var group   = $(this).data('group');
        var $checks = $('.et-multi-check[data-group="' + group + '"]');
        var allOn   = $checks.length === $checks.filter(':checked').length;
        $checks.prop('checked', !allOn);
        $(this).text(allOn ? 'Select all' : 'Deselect all');
        updateCount();
    });

    $(document).on('change', '.et-multi-check', updateCount);

    function updateCount() {
        var count = $('.et-multi-check:checked').length;
        $('#et-selected-count').text(count + ' selected');
        $('#et-export-multi-btn').prop('disabled', count === 0);
    }

    // ── Export ────────────────────────────────────────────────────────────────
    $('#et-export-multi-btn').on('click', function () {
        var $checked = $('.et-multi-check:checked');
        if (!$checked.length) return;

        // Split WS Form IDs from regular post IDs using dedicated class
        var ids    = $('.et-multi-check:checked:not(.et-wsf-check)').map(function () { return this.value; }).get();
        var wsfIds = $('.et-wsf-check:checked').map(function () { return this.value; }).get();

        var $btn = $(this);
        setLoading($btn, true);
        hideStatus('#et-multi-export-status');

        $.post(etchTransfer.ajaxUrl, {
            action:  'etch_export_multi',
            nonce:   etchTransfer.nonce,
            ids:     ids.join(','),
            wsf_ids: wsfIds.join(',')
        })
        .done(function (res) {
            if (res.success) {
                var p = res.data;
                downloadJSON(p, 'etch-bundle-' + p.item_count + '-items.json');
                showStatus('#et-multi-export-status', 'success', 'Bundle downloaded: ' + p.item_count + ' items.');
            } else {
                showStatus('#et-multi-export-status', 'error', res.data || 'Export failed.');
            }
        })
        .fail(function () { showStatus('#et-multi-export-status', 'error', 'Request failed.'); })
        .always(function () { setLoading($btn, false); $btn.prop('disabled', !$('.et-multi-check:checked').length); });
    });

    // ── Import ────────────────────────────────────────────────────────────────
    var $drop      = $('#et-file-drop');
    var $fileInput = $('#et-import-file');
    var $fileLabel = $('#et-file-label');
    var $importBtn = $('#et-import-btn');
    var importFile = null;

    $fileInput.on('change', function () {
        if (this.files[0]) validateFile(this.files[0]);
    });

    $drop.on('dragover dragenter', function (e) {
        e.preventDefault(); $drop.addClass('dragover');
    }).on('dragleave drop', function (e) {
        e.preventDefault(); $drop.removeClass('dragover');
        if (e.type === 'drop' && e.originalEvent.dataTransfer.files[0]) {
            validateFile(e.originalEvent.dataTransfer.files[0]);
        }
    });

    function validateFile(file) {
        if (!file.name.match(/\.json$/i)) {
            showStatus('#et-import-status', 'error', 'Please select a .json file.');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                if (data && data.success && data.data) data = data.data;
                if (!data || !data.etch_export_version) throw new Error('Not a valid Etch export file.');

                importFile = file;
                $drop.addClass('has-file');

                var isMulti  = data.etch_export_type === 'multi';
                var count    = isMulti ? data.item_count : 1;
                var typeList = '';

                if (isMulti) {
                    var typeCounts = {};
                    (data.items || []).forEach(function (item) {
                        var t = item.source_post_type || 'unknown';
                        if (t === 'wp_template') t = 'Templates';
                        else if (t === 'wp_block') t = 'Patterns/Components';
                        else if (t === 'page') t = 'Pages';
                        else if (t === 'post') t = 'Posts';
                        typeCounts[t] = (typeCounts[t] || 0) + 1;
                    });
                    var wsfCount = (data.wsf_forms || []).length;
                    if (wsfCount > 0) typeCounts['WS Forms'] = wsfCount;

                    typeList = Object.keys(typeCounts).map(function (t) {
                        return typeCounts[t] + ' ' + t;
                    }).join(', ');
                } else {
                    typeList = (data.source_post_type || 'page') + ': ' + (data.post_title || '');
                }

                $fileLabel.html('<strong>' + escHtml(file.name) + '</strong>');
                $('#et-import-summary').html(
                    '<div class="et-summary-row"><span>From:</span><strong>' + escHtml(data.source_site || '') + '</strong></div>' +
                    '<div class="et-summary-row"><span>Items:</span><strong>' + count + '</strong></div>' +
                    '<div class="et-summary-row"><span>Contents:</span><strong>' + escHtml(typeList) + '</strong></div>'
                ).show();

                $importBtn.prop('disabled', false);
                hideStatus('#et-import-status');
            } catch (err) {
                showStatus('#et-import-status', 'error', 'Invalid file: ' + err.message);
                importFile = null;
                $importBtn.prop('disabled', true);
                $('#et-import-summary').hide();
            }
        };
        reader.readAsText(file);
    }

    $importBtn.on('click', function () {
        if (!importFile) return;

        setLoading($importBtn, true);
        hideStatus('#et-import-status');

        var fd = new FormData();
        fd.append('action',      'etch_import');
        fd.append('nonce',       etchTransfer.nonce);
        fd.append('import_file', importFile, importFile.name);

        $.ajax({ url: etchTransfer.ajaxUrl, type: 'POST', data: fd, processData: false, contentType: false })
        .done(function (res) {
            if (res.success) {
                showStatus('#et-import-status', 'success', res.data.message);
            } else {
                showStatus('#et-import-status', 'error', res.data || 'Import failed.');
            }
        })
        .fail(function () { showStatus('#et-import-status', 'error', 'Request failed.'); })
        .always(function () { setLoading($importBtn, false); $importBtn.prop('disabled', !importFile); });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function downloadJSON(data, filename) {
        var str  = JSON.stringify(data, null, 2);
        var blob = new Blob([str], { type: 'application/json' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function showStatus(sel, type, msg) { $(sel).removeClass('success error').addClass(type).text(msg).show(); }
    function hideStatus(sel)            { $(sel).hide().text(''); }
    function setLoading($btn, on)       { $btn.toggleClass('loading', on).prop('disabled', on); }
    function escHtml(str)               { return $('<div>').text(str || '').html(); }

})(jQuery);
