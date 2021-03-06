"use strict";

var HexaLab = {}

// --------------------------------------------------------------------------------
// Utility
// --------------------------------------------------------------------------------
// File utility routines

HexaLab.FS = {
    file_exists: function (path) {
        var stat = FS.stat(path);
        if (!stat) return false;
        return FS.isFile(stat.mode);
    },
    make_file: function (data, name) {
        try {
            if (HexaLab.FS.file_exists("/" + name)) {
                FS.unlink('/' + name);
            }
        } catch (err) {
        }
        FS.createDataFile("/", name, data, true, true);
    },
    delete_file: function (name) {
        try {
            if (HexaLab.FS.file_exists("/" + name)) {
                FS.unlink('/' + name);
            }
        } catch (err) {
        }
    },
    open_dir: function (path) {
        var lookup = FS.lookupPath(path)
        console.log(lookup)
    },
    short_path: function(path) {
        if (path.includes("/")) {
            return path.substring(path.lastIndexOf('/') + 1);
        }
        return path
    },

    element: $('<input type="file">'),
    trigger_file_picker: function (callback) {
        this.element.val(null).off('change').change(function () {
            callback(this.files[0])
        })
        this.element.click()
    },

    store_blob: function (blob, filename) {
        saveAs(blob, filename)
    },

    reader: new FileReader(),
	
    read_json_file: function (file, callback) {
        this.reader.onload = function () {
            const json = JSON.parse(this.result)
            callback(file.name, json)
        }
        this.reader.readAsText(file, "UTF-8")
    },
	
    read_data_file: function (file, callback) {
        this.reader.onloadend = function () {
            const data = new Int8Array(this.result)
            callback(file.name, data)
			HexaLab.UI.mesh.infobox_2.element.css('background-size', '0% 100%');
        }
		this.reader.onprogress = function(event) {
			if (event.lengthComputable) {
				HexaLab.UI.set_progress_percent(100 * event.loaded / event.total);
			}
		}		
        this.reader.readAsArrayBuffer(file, "UTF-8")
    }
}

// --------------------------------------------------------------------------------
// UI
// --------------------------------------------------------------------------------

HexaLab.UI = {
    // To enable additional event trigger when the first mesh gets loaded in (clean up the page, ...)
    first_mesh: true,

    // body content
    display:                $('body'),
    // canvas container
    canvas_container:       $('#frame'),
    // side menu
    menu:                   $('#GUI'),
	quality_label:          $('quality_label'),

    dragdrop: {
        overlay:            $('#drag_drop_overlay'),
        header:             $('#drag_drop_header'),
        mesh:               $('#mesh_drag_drop_quad'),
        settings:           $('#settings_drag_drop_quad'),
    },

    // Mesh dialog
    mesh: {
        source:             $('#mesh_source'),
        dataset_content:    $('#paper_mesh_picker'),

        infobox_1: {
            element:        $('#mesh_info_1'),
            text:           $('#mesh_info_1 .box_text'),
            buttons: {
                container:  $('#mesh_info_1 .box_buttons'),
                pdf:        $('#source_pdf'),
                web:        $('#source_web'),
                doi:        $('#source_doi'),
            }
        },
        infobox_2: {
            element:        $('#mesh_info_2'),
            text:           $('#mesh_info_2 .box_text'),
        },
        quality_type: {
            element:        null,
            listeners:      [],
        },
    },
    
    // Toolbar
    topbar: {
        load_mesh:          $('#load_mesh'),
        reset_camera:       $('#home'),
        plot:               $('#plot'),
        load_settings:      $('#load_settings'),
        save_settings:      $('#save_settings'),
        github:             $('#github'),
        about:              $('#about'),
        snapshot:           $('#snapshot'),

        on_mesh_import: function () {
            this.reset_camera.prop("disabled", false)
            this.plot.prop("disabled", false)
            this.load_settings.prop("disabled", false)
            this.save_settings.prop("disabled", false)
            this.snapshot.prop("disabled", false)
            HexaLab.UI.settings.rendering_menu_content.prop('disabled', false)
            HexaLab.UI.settings.silhouette.slider('enable')    
            HexaLab.UI.settings.erode_dilate.slider('enable')    
            HexaLab.UI.settings.singularity_mode.slider('enable')
            HexaLab.UI.settings.wireframe.slider('enable')
            HexaLab.UI.settings.crack_size.slider('enable')
            HexaLab.UI.settings.rounding_radius.slider('enable')
            HexaLab.UI.settings.color.default.outside.spectrum('enable')
            HexaLab.UI.settings.color.default.inside.spectrum('enable')
        },
        on_mesh_import_fail: function () {
            this.reset_camera.prop("disabled", true)
            this.plot.prop("disabled", true)
            this.load_settings.prop("disabled", true)
            this.save_settings.prop("disabled", true)
            this.snapshot.prop("disabled", true)
        },
    },
    
    // Rendering
    settings: {
        color: {
            source:         $('#surface_color_source'),
            quality_map:    $('#color_map'),
            default: {
                wrapper:    $('#visible_color_wrapper'),
                outside:    $('#visible_outside_color'),
                inside:     $('#visible_inside_color'),
            }
        },
        silhouette:         $('#filtered_slider'),
        singularity_mode:   $('#singularity_slider'),
        occlusion:          $("#show_occlusion"),
        geometry_mode:      $('#geometry_mode'),
        lighting_mode:      $("#lighting_mode"),
        rendering_menu_content: $('#rendering_menu *'),
        wireframe:          $('#wireframe_slider'),
        rounding_radius:    $('#rounding_radius'),
        crack_size:         $('#crack_size'),
        erode_dilate:       $('#erode_dilate_slider')
    },
    
    // Mesh sources
    datasets_index: {},
}

// Copy-paste event listeners.
// On copy, app settings are copied on the user system clipboard.
// On paste, the app reads and imports settings from the user system clipboard. 
document.body.addEventListener('paste', function (e) { 
    var clipboardData, pastedData

    e.stopPropagation()
    e.preventDefault()

    clipboardData = e.clipboardData || window.clipboardData
    pastedData = clipboardData.getData('Text')

    HexaLab.app.set_settings(JSON.parse(pastedData))
})
document.body.addEventListener('copy', function (e) { 
    e.clipboardData.setData("text/plain;charset=utf-8", JSON.stringify(HexaLab.app.get_settings(), null, 4))
    e.stopPropagation()
    e.preventDefault()
})

// --------------------------------------------------------------------------------
// Rendering GUI elements
// --------------------------------------------------------------------------------
// UI -> App events
HexaLab.UI.settings.color.source.on("change", function () {
    var value = this.options[this.selectedIndex].value
    HexaLab.app.show_visible_quality(value == "ColorMap")
})
HexaLab.UI.settings.color.default.outside.spectrum({
    cancelText: 'reset',
    showInput: true,
    cancel: function () {
        HexaLab.UI.settings.color.default.outside.spectrum("set", "#ffffff");
        HexaLab.app.set_visible_surface_default_outside_color($(this).spectrum('get').toHexString())
    }
}).on('change.spectrum', function (color) {
    HexaLab.app.set_visible_surface_default_outside_color($(this).spectrum('get').toHexString())
})

HexaLab.UI.settings.color.default.inside.spectrum({
    cancelText: 'reset',
    showInput: true,
    cancel: function () {
        HexaLab.UI.settings.color.default.inside.spectrum("set", "#ffff00");
        HexaLab.app.set_visible_surface_default_inside_color($(this).spectrum('get').toHexString())
    },
}).on('change.spectrum', function (color) {
    HexaLab.app.set_visible_surface_default_inside_color($(this).spectrum('get').toHexString())
})

HexaLab.UI.settings.silhouette.slider({min:0, max:20, step:1}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_silhouette_intensity(ui.value / 20)
})

HexaLab.UI.settings.color.quality_map.on('change', function () {
    HexaLab.app.set_color_map(this.options[this.selectedIndex].value)
})

HexaLab.UI.settings.wireframe.slider({
    min: 0,
    max: 20,
    step: 1
}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_visible_wireframe_opacity(ui.value / 20)
})

HexaLab.UI.settings.crack_size.slider({
    min: 2,
	value: 6,
    max: 10,
    step: 1
}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_crack_size(ui.value / 30)
})

HexaLab.UI.settings.rounding_radius.slider({
    min: 2,
	value: 5,
    max: 10,
    step: 1
}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_rounding_radius(ui.value / 15)
})

HexaLab.UI.settings.erode_dilate.slider({
    value: 0,
    min: 0,
    max: 5,
    step: 1
}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_erode_dilate_level(ui.value)
})

HexaLab.UI.settings.singularity_mode.slider({
    value: 1,
    min: 0,
    max: 6,
    step: 1
}).addClass('mini-slider').on('slide', function (e, ui) {
    HexaLab.app.set_singularity_mode(ui.value)
})

HexaLab.UI.settings.lighting_mode.on('change', function () {
    HexaLab.app.set_lighting_mode(this.options[this.selectedIndex].value)
})

HexaLab.UI.settings.occlusion.on('click', function () {
    HexaLab.app.set_occlusion(this.checked ? 'object space' : 'none')
})

HexaLab.UI.settings.geometry_mode.on('change', function () {
    HexaLab.app.set_geometry_mode(this.options[this.selectedIndex].value)
})

// App -> UI events
HexaLab.UI.on_set_visible_surface_default_outside_color = function (color) {
    HexaLab.UI.settings.color.default.outside.spectrum('set', color)
}

HexaLab.UI.on_set_visible_surface_default_inside_color = function (color) {
    HexaLab.UI.settings.color.default.inside.spectrum('set', color)
}

HexaLab.UI.on_show_visible_quality = function (do_show) {
    if (do_show) {
        $("#surface_colormap_input").css('display', 'flex');
        HexaLab.UI.settings.color.default.wrapper.hide();
        HexaLab.UI.settings.color.source.val("ColorMap")
        if (HexaLab.UI.plot_overlay) {
            HexaLab.UI.quality_plot_update()
        } else {
            HexaLab.UI.create_plot_panel()
        }
    } else {
        $("#surface_colormap_input").hide();
        HexaLab.UI.settings.color.default.wrapper.css('display', 'flex');
        HexaLab.UI.settings.color.source.val("Default")
        if (HexaLab.UI.plot_overlay) {
            HexaLab.UI.plot_overlay.remove()
            delete HexaLab.UI.plot_overlay
        }
    }
}

HexaLab.UI.on_set_crack_size = function (size) {
    HexaLab.UI.settings.crack_size.slider('value', size * 30)
}

HexaLab.UI.on_set_rounding_radius = function (rad) {
    HexaLab.UI.settings.rounding_radius.slider('value', rad * 15)
}

HexaLab.UI.on_set_wireframe_opacity = function (value) {
    HexaLab.UI.settings.wireframe.slider('value', value * 10)
}

HexaLab.UI.on_set_filtered_surface_opacity = function (value) {
    HexaLab.UI.settings.silhouette.slider('value', value * 20)
}

HexaLab.UI.on_set_singularity_mode = function (mode) {
    HexaLab.UI.settings.singularity_mode.slider('value', mode)
}

HexaLab.UI.on_set_lighting_mode = function (v) {
    HexaLab.UI.settings.lighting_mode.val(v)
    //HexaLab.UI.settings.occlusion.prop('checked', ao == 'object space')
}

HexaLab.UI.on_set_color_map = function (value) {
    HexaLab.UI.settings.color.quality_map_name = value
    HexaLab.UI.settings.color.quality_map.val(value)
    HexaLab.UI.quality_plot_update()
}

HexaLab.UI.on_set_erode_dilate = function (value) {
    HexaLab.UI.settings.erode_dilate.slider('value', value)
}

// --------------------------------------------------------------------------------
// Mesh/settings file bind and dispatch
// --------------------------------------------------------------------------------
HexaLab.UI.on_first_mesh = function () {
    HexaLab.UI.dragdrop.header.html('Drop the file in one of the boxes below.')
    HexaLab.UI.dragdrop.overlay.removeClass('first_drag_drop').hide();
    HexaLab.UI.dragdrop.mesh.css('margin-left', '20%');
    HexaLab.UI.dragdrop.settings.show();
}

HexaLab.UI.clear_mesh_info_keep_source = function () {
    HexaLab.UI.mesh.infobox_2.element.hide()
    HexaLab.UI.mesh.dataset_content.hide()
}

HexaLab.UI.clear_mesh_info = function () {
    HexaLab.UI.mesh.infobox_1.element.hide();
    HexaLab.UI.mesh.infobox_2.element.hide()
    HexaLab.UI.mesh.dataset_content.hide()
}

HexaLab.UI.import_mesh = function (long_name, byte_array) {
    var name = HexaLab.FS.short_path(long_name)
    HexaLab.UI.mesh_long_name = long_name
    HexaLab.FS.make_file(byte_array, name);
	
	if (HexaLab.UI.first_mesh) {
		HexaLab.app.set_default_rendering_settings()
		console.log("FIRST MESH!!!!");
	}
	
    HexaLab.app.import_mesh(name);
    HexaLab.FS.delete_file(name);

    if (HexaLab.UI.first_mesh) {
        HexaLab.UI.on_first_mesh()
        HexaLab.UI.first_mesh = false
		//HexaLab.app.set_default_rendering_settings()
    }
}

HexaLab.UI.show_mesh_name = function (name) {
    HexaLab.UI.mesh.infobox_1.text.empty().append(name)
    HexaLab.UI.mesh.infobox_1.element.show().css('display', 'flex')
    HexaLab.UI.mesh.infobox_1.buttons.container.hide()
}

var force_redraw = function(el){
	/* nothing of this works, at least from emscripten code and chrome  :( */
	var trick;
	trick = el.offsetHeight;
	el.hide(0, function(){el.show(0);} );
	//el.hide();
	//el.show();
}

HexaLab.UI.set_progress_phasename = function( str ){
	HexaLab.UI.mesh.infobox_2.text.text(str).show();
	force_redraw( HexaLab.UI.mesh.infobox_2.text );
	force_redraw( HexaLab.UI.mesh.infobox_2.element );
	//console.log("PHASE NAME: '"+str+"'")
}

HexaLab.UI.set_progress_percent = function( num ){
	return; // doesn't work well enought yet
	num = num.toFixed(0);
	HexaLab.UI.mesh.infobox_2.element.css('background-size', "" + num + '% 100%');
	force_redraw( HexaLab.UI.mesh.infobox_2.text );
	force_redraw( HexaLab.UI.mesh.infobox_2.element );
	//console.log("PROGRESS "+num+"%")
}

HexaLab.UI.import_local_mesh = function (file) {
    HexaLab.UI.view_source =  HexaLab.UI.mesh.source[0].selectedIndex
    HexaLab.UI.view_mesh = null
    HexaLab.UI.clear_mesh_info()
    HexaLab.UI.mesh.infobox_2.element.show().css('display', 'flex');
	HexaLab.UI.set_progress_phasename('Loading...');
    HexaLab.FS.read_data_file(file, HexaLab.UI.import_mesh)
}

HexaLab.UI.import_remote_mesh = function (source, name) {
    var request = new XMLHttpRequest();
    request.open('GET', 'datasets/' + source.path + '/' + name, true);
    request.responseType = 'arraybuffer';
    request.onloadend = function(e) {
        var data = new Uint8Array(this.response)
        HexaLab.UI.import_mesh(name, data)
        HexaLab.UI.setup_dataset_content()
		HexaLab.UI.mesh.infobox_2.element.css('background-size', '0% 100%');
    }
	
	request.onprogress = function (event) {
		HexaLab.UI.set_progress_percent( 100 * event.loaded / event.total );
	};
	
	//request.addEventListener("progress", request.onprogress, false);

    HexaLab.UI.clear_mesh_info_keep_source()
    $.each(HexaLab.UI.mesh.source[0].options, function() {
        if ($(this).text() == source.text) $(this).prop('selected', true);
    })
    HexaLab.UI.view_source =  HexaLab.UI.mesh.source[0].selectedIndex
    HexaLab.UI.view_mesh = HexaLab.UI.mesh.dataset_content[0].selectedIndex
    HexaLab.UI.set_progress_phasename('Loading...'); // or, "Downloading...?"
    HexaLab.UI.mesh.dataset_content.css('font-style', 'normal').show()
    HexaLab.UI.mesh.infobox_2.element.show().css('display', 'flex');
	
	request.send();
}

HexaLab.UI.mesh.quality_type.element = $('<select id="quality_type" title="Choose Hex Quality measure">\
        <option value="Scaled Jacobian">Scaled Jacobian</option>\
        <option value="Edge Ratio">Edge Ratio</option>\
        <option value="Diagonal">Diagonal</option>\
        <option value="Dimension">Dimension</option>\
        <option value="Distortion">Distortion</option>\
        <option value="Jacobian">Jacobian</option>\
        <option value="Max Edge Ratio">Max Edge Ratio</option>\
        <option value="Max Aspect Frobenius">Max Aspect Frobenius</option>\
        <option value="Mean Aspect Frobenius">Mean Aspect Frobenius</option>\
        <option value="Oddy">Oddy</option>\
        <option value="Relative Size Squared">Relative Size Squared</option>\
        <option value="Shape">Shape</option>\
        <option value="Shape and Size">Shape and Size</option>\
        <option value="Shear">Shear</option>\
        <option value="Shear and Size">Shear and Size</option>\
        <option value="Skew">Skew</option>\
        <option value="Stretch">Stretch</option>\
        <option value="Taper">Taper</option>\
        <option value="Volume">Volume</option>\
    </select>')

HexaLab.UI.setup_mesh_stats = function(name) {
    var mesh = HexaLab.app.backend.get_mesh()
    HexaLab.UI.mesh.infobox_2.element.show()
    HexaLab.UI.mesh.infobox_2.text.empty()
    const name_html = HexaLab.UI.view_source == 1 ? '<div class="menu_row_label" style="line-height: 100%; padding-bottom: 10px;">' + name + '</div>' : ''
    HexaLab.UI.mesh.infobox_2.text.append('<div class="menu_row">' + name_html +
            '<div class="menu_row_input simple-font" style="line-height: 100%; padding-bottom: 10px;">' +
                mesh.vert_count + ' vertices, ' + mesh.hexa_count + ' hexas' +
            '</div>' +
        '</div>')
    // HexaLab.UI.mesh.infobox_2.text.append('<div id="mesh_stats_wrapper">' +
    //     '<div><span class="mesh_stat">vertices: </span><span class="simple-font">' + mesh.vert_count + '</span></div>' +
    //     '<div><span class="mesh_stat">hexas:    </span><span class="simple-font">' + mesh.hexa_count + '</span></div>' +
    //     '</div>'
    // )

    HexaLab.UI.mesh.infobox_2.text.append('<div class="menu_row"><div class="menu_row_label">Quality</div>\
    <div class="menu_row_input">\
        <div class="menu_row_input_block">\
        </div>\
    </div></div>')
    HexaLab.UI.mesh.infobox_2.element.find('.menu_row_input_block').append(HexaLab.UI.mesh.quality_type.element)

    if (HexaLab.UI.view_quality_measure) HexaLab.UI.mesh.quality_type.element.val(HexaLab.UI.view_quality_measure)
    let min = mesh.quality_min.toFixed(3)
    let max = mesh.quality_max.toFixed(3)
    let avg = mesh.quality_avg.toFixed(3)
    let vri = mesh.quality_var.toFixed(3)
    if (min == 0) min = mesh.quality_min.toExponential(2)
    if (max == 0) max = mesh.quality_max.toExponential(2)
    if (avg == 0) avg = mesh.quality_avg.toExponential(2)
    if (vri == 0) vri = mesh.quality_var.toExponential(2)
    HexaLab.UI.mesh.infobox_2.text.append('<table style="width:100%;">' +
        // '<tr> <th>Min</th> <th>Max</th> <th>Avg</th> <th>Var</th> </tr>' +
        '<tr> <td align="center"><span class="simple-font">Min: </span> <span class="simple-font">' + min + '</span></td>' +
            ' <td align="center"><span class="simple-font">Max: </span> <span class="simple-font">' + max + '</span></td>' +
            ' <td align="center"><span class="simple-font">Avg: </span> <span class="simple-font">' + avg + '</span></td>' + 
            ' <td align="center"><span class="simple-font">Var: </span> <span class="simple-font">' + vri + '</span></td> </tr>' +
        '</table>'
    )
    // HexaLab.UI.mesh.infobox_2.text.append('<div id="mesh_stats_wrapper">' +
    //     '<div><span class="mesh_stat">min: </span>' + min + '</div>' +
    //     '<div><span class="mesh_stat">max: </span>' + max + '</div>' +
    //     '<div><span class="mesh_stat">avg: </span>' + avg + '</div>' +
    //     '<div><span class="mesh_stat">var: </span>' + vri + '</div>' +
    //     '</div>'
    // )
    // TODO
    HexaLab.UI.mesh.quality_type.element.on('change', function () {
        const v = this.options[this.selectedIndex].value
        HexaLab.app.set_quality_measure(v);
        for (let x in HexaLab.UI.mesh.quality_type.listeners) {
            HexaLab.UI.mesh.quality_type.listeners[x]()
        }
    })
}

HexaLab.UI.on_set_quality_measure = function (measure) {
    HexaLab.UI.view_quality_measure = measure
    HexaLab.UI.setup_mesh_stats( HexaLab.FS.short_path(HexaLab.UI.mesh_long_name) )
    HexaLab.UI.quality_plot_update()
}

HexaLab.UI.on_set_geometry_mode = function (v) {
    HexaLab.UI.settings.geometry_mode.val(v)
    HexaLab.UI.settings.wireframe.hide()
    HexaLab.UI.settings.crack_size.hide()
    HexaLab.UI.settings.rounding_radius.hide()
    if (v == 'Lines' || v == 'DynamicLines') {
        HexaLab.UI.settings.wireframe.show()
    } else if (v == 'Cracked') {
        HexaLab.UI.settings.crack_size.show()
    } else if (v == 'Smooth') {
        HexaLab.UI.settings.rounding_radius.show()
    }
}

HexaLab.UI.on_import_mesh = function (name) {
    HexaLab.UI.topbar.on_mesh_import()
    // if (HexaLab.UI.view_source == 1) HexaLab.UI.show_mesh_name(name)
    if (HexaLab.UI.view_source == 2) HexaLab.UI.setup_dataset_content()
    HexaLab.UI.setup_mesh_stats(name)
    
    HexaLab.UI.quality_plot_update()
}

HexaLab.UI.on_import_mesh_fail = function (name) {
    HexaLab.UI.topbar.on_mesh_import_fail()
    HexaLab.UI.mesh.infobox_2.text.empty().append('<span>Can\'t parse the file.</span>')
    HexaLab.UI.view_source = null
    HexaLab.UI.view_mesh = null
}

HexaLab.UI.import_settings_from_txt = function (file) {
    HexaLab.FS.read_json_file(file, function (file, json) {
        HexaLab.app.set_settings(json)
    })
}

HexaLab.UI.import_settings_from_png = function (file) {
	
	var fr = new FileReader();
	fr.onloadend = function( e ) {
		
		pngitxt.get( fr.result, "hexalab" , 
			function(err,d) {
				if (err != null) {
					alert("No HexaLab settings found in \n\"" + file.name +"\"" );
				}
				const json = JSON.parse(d.value)
				HexaLab.app.set_settings(json)
			}	
		)
	}
	fr.readAsBinaryString( file );
	
}

// --------------------------------------------------------------------------------
// Datasets
// --------------------------------------------------------------------------------

$.ajax({
    url: 'datasets/index.json',
    dataType: 'json'
}).done(function(data) {
    HexaLab.UI.datasets_index = data
    $.each(HexaLab.UI.datasets_index.sources, function (i, source) {
        HexaLab.UI.mesh.source.append($('<option>', {
            value: i,
            text : source.label
        }));
    });
})

HexaLab.UI.setup_dataset_content = function () {
    var v = HexaLab.UI.mesh.selected_source
    var i = parseInt(v)
    var source = HexaLab.UI.datasets_index.sources[i]

    HexaLab.UI.mesh.infobox_1.text.empty().append('<span class="paper-title">' + source.paper.title + '</span>' + '<br />' +
        '<span class="paper-authors">' + source.paper.authors + '</span>' + ' - ' +
        '<span class="paper-venue">' + source.paper.venue + ' (' + source.paper.year + ') ' + '</span>')
    HexaLab.UI.mesh.infobox_1.element.show().css('display', 'flex');
    HexaLab.UI.mesh.infobox_1.buttons.container.show().css('display', 'flex');

    if (source.paper.PDF) {
        HexaLab.UI.mesh.infobox_1.buttons.pdf.removeClass('inactive').off('click').on('click', function() { window.open(source.paper.PDF) })
    } else {
        HexaLab.UI.mesh.infobox_1.buttons.pdf.addClass('inactive')
    }

    if (source.paper.web) {
        HexaLab.UI.mesh.infobox_1.buttons.web.removeClass('inactive').off('click').on('click', function() { window.open(source.paper.web) })
    } else {
        HexaLab.UI.mesh.infobox_1.buttons.web.addClass('inactive')
    }

    if (source.paper.DOI) {
        HexaLab.UI.mesh.infobox_1.buttons.doi.removeClass('inactive').off('click').on('click', function() { window.open('http://doi.org/' + source.paper.DOI) })
    } else {
        HexaLab.UI.mesh.infobox_1.buttons.doi.addClass('inactive')
    }

    HexaLab.UI.mesh.dataset_content.empty()
    if (HexaLab.UI.view_mesh == null) HexaLab.UI.mesh.dataset_content.css('font-style', 'italic')
    HexaLab.UI.mesh.dataset_content.append($('<option>', {
            value: "-1",
            text : 'Select a mesh',
            style: 'display:none;'
        }));
    $.each(source.data, function (i, name) {
        var s = HexaLab.UI.view_source == HexaLab.UI.mesh.source[0].selectedIndex && HexaLab.UI.view_mesh - 1 == i ? true : false
        if (s) HexaLab.UI.setup_mesh_stats(HexaLab.FS.short_path(name))
        HexaLab.UI.mesh.dataset_content.append($('<option>', {
            value: i,
            text : name,
            style: 'font-style: normal;',
            selected: s
        }));
    });

    HexaLab.UI.mesh.dataset_content.show()
}

// HexaLab.UI.mesh.source.on("click", function () {
//     if (HexaLab.UI.mesh.source.select_focus_file_flag) {
//         HexaLab.UI.mesh.source.select_focus_file_flag = 0
//         return
//     }
//     this.selectedIndex = -1
// })

HexaLab.UI.mesh.source.on("click", function () {
    if (HexaLab.UI.mesh.source.select_click_flag) {
        HexaLab.UI.mesh.source.select_click_flag = 0
        return
    }
    this.selectedIndex = -1
})

HexaLab.UI.mesh.source.on("change", function () {
    HexaLab.UI.mesh.source.css('font-style', 'normal')
    
    HexaLab.UI.mesh.source.select_click_flag = 1

    var v = this.options[this.selectedIndex].value
    HexaLab.UI.mesh.selected_source = v
    if (v == "-1") {
        // HexaLab.UI.mesh.source.select_focus_file_flag = 1
        HexaLab.UI.clear_mesh_info()
        if (HexaLab.UI.view_source == 1) HexaLab.UI.setup_mesh_stats(HexaLab.FS.short_path(HexaLab.UI.mesh_long_name))
        HexaLab.FS.trigger_file_picker(HexaLab.UI.import_local_mesh)
    } else {
        HexaLab.UI.clear_mesh_info()
        HexaLab.UI.setup_dataset_content()
    }
})

HexaLab.UI.mesh.dataset_content.on("click", function () {
    // TODO Do we want this?
    // if (HexaLab.UI.mesh.dataset_content.select_click_flag) {
    //     HexaLab.UI.mesh.dataset_content.select_click_flag = 0
    // }
    // this.selectedIndex = -1
})

HexaLab.UI.mesh.dataset_content.on("change", function () {
    HexaLab.UI.mesh.dataset_content.select_click_flag = 1
    var v = this.options[this.selectedIndex].value
    var i = parseInt(v)
    var j = parseInt(HexaLab.UI.mesh.selected_source)
    var source = HexaLab.UI.datasets_index.sources[j]
    var mesh = source.data[i]

    HexaLab.UI.import_remote_mesh(source, mesh)
})

// --------------------------------------------------------------------------------
// Drag n Drop logic
// --------------------------------------------------------------------------------
HexaLab.UI.canvas_container.on('dragbetterenter', function (event) {
    HexaLab.UI.dragdrop.overlay.show();
})
HexaLab.UI.canvas_container.on('dragover', function (event) {
    event.preventDefault();
})
HexaLab.UI.canvas_container.on('drop', function (event) {
    event.preventDefault();
})
HexaLab.UI.canvas_container.on('dragbetterleave', function (event) {
    if (!HexaLab.UI.first_mesh) HexaLab.UI.dragdrop.overlay.hide();
})

HexaLab.UI.dragdrop.mesh.on('dragbetterenter', function (event) {
    $(this).removeClass('drag_drop_quad_off').addClass('drag_drop_quad_on');
})
HexaLab.UI.dragdrop.mesh.on('dragover', function (event) {
    event.preventDefault()
})
HexaLab.UI.dragdrop.mesh.on('drop', function (event) {
    event.preventDefault()
    var files = event.originalEvent.target.files || event.originalEvent.dataTransfer.files
    HexaLab.UI.import_local_mesh(files[0])
})
HexaLab.UI.dragdrop.mesh.on('dragbetterleave', function (event) {
    $(this).removeClass('drag_drop_quad_on').addClass('drag_drop_quad_off');
})


HexaLab.UI.dragdrop.settings.on('dragbetterenter', function (event) {
    $(this).removeClass('drag_drop_quad_off').addClass('drag_drop_quad_on');
})

HexaLab.UI.dragdrop.settings.on('dragover', function (event) {
    event.preventDefault()
})


HexaLab.UI.dragdrop.settings.on('drop', function (event) {
    event.preventDefault()
    var files = event.originalEvent.target.files || event.originalEvent.dataTransfer.files
	var fn = files[0];
	if (fn.name.toLowerCase().endsWith(".png")) {
		HexaLab.UI.import_settings_from_png(fn)
	} else {
		HexaLab.UI.import_settings_from_txt(fn)
	}
})
HexaLab.UI.dragdrop.settings.on('dragbetterleave', function (event) {
    $(this).removeClass('drag_drop_quad_on').addClass('drag_drop_quad_off');
})

/* drop on canvas: guess based on file name */
HexaLab.UI.display.on('drop', function (event) {
    event.preventDefault()
    var files = event.originalEvent.target.files || event.originalEvent.dataTransfer.files
    
	var fn = files[0];
	var st = fn.name.toLowerCase();
	if (st.endsWith(".png")) {
		HexaLab.UI.import_settings_from_png(fn)
	} else if (st.endsWith(".txt"))  {
		HexaLab.UI.import_settings_from_txt(fn)
	} else if (st.endsWith(".mesh"))  {
		HexaLab.UI.import_local_mesh(fn)
	}
})

// --------------------------------------------------------------------------------
// Plot
// --------------------------------------------------------------------------------

HexaLab.UI.quality_plot_dialog = $('<div></div>')

HexaLab.UI.quality_plot_update = function () {
    if (HexaLab.UI.plot_overlay) {
        var axis = HexaLab.UI.plot_overlay.axis
        HexaLab.UI.quality_plot(HexaLab.UI.plot_overlay, axis)
    }
}

function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    var ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var blob = new Blob([ab], {type: mimeString});
    return blob;
}

HexaLab.UI.quality_plot = function(container, axis) {
    if (HexaLab.UI.settings.color.quality_map_name == 'Parula') {
        HexaLab.UI.settings.color.quality_map_bar_filename = axis == 'x' ? 'img/parula-h.png' : 'img/parula-v.png'
    } else if (HexaLab.UI.settings.color.quality_map_name == 'Jet') {
        HexaLab.UI.settings.color.quality_map_bar_filename = axis == 'x' ? 'img/jet-h.png' : 'img/jet-v.png'
    } else if (HexaLab.UI.settings.color.quality_map_name == 'RedBlue') {
        HexaLab.UI.settings.color.quality_map_bar_filename = axis ==  'x' ? 'img/redblue-h.png' : 'img/redblue-v.png'
    }
    if (axis == 'x') {
        container.find('#bar_img').attr('src', HexaLab.UI.settings.color.quality_map_bar_filename).
            height('16px')
            .width(container.width() - 60 - 30)
            .css('padding', '5px')
            .css('padding-left', '60px')
        container.find("#plot_div")
            .height(container.height() - 16 - 10)
            .width(container.width())
        container.find("#plot_container")[0].style.flexDirection = "column-reverse"//.css('flex-direction', 'column-reverse;')
    } else {
        container.find('#bar_img').attr('src', HexaLab.UI.settings.color.quality_map_bar_filename).
            height(container.height() - 30 - 50)
            .width('16px')
            .css('padding', '5px')
            .css('padding-top', '30px')
        container.find("#plot_div").height(container.height()).width(container.width() - 16 - 10)
        container.find("#plot_container")[0].style.flexDirection = "row"
    }

    // https://community.plot.ly/t/using-colorscale-with-histograms/150
    let data = []
    let bins_colors = []
    let colorscale = []

    let range_min = HexaLab.app.backend.get_lower_quality_range_bound()
    let range_max = HexaLab.app.backend.get_upper_quality_range_bound()
    let reversed = false

    let min = range_min < range_max ? range_min : range_max 
    let max = range_min < range_max ? range_max : range_min 

    let quality = HexaLab.app.backend.get_hexa_quality()
    if (quality != null) {
        let t = new Float32Array(Module.HEAPU8.buffer, quality.data(), quality.size())
        for (let i = 0; i < quality.size() ; i++) {
            data[i] = t[i]
        }
    }

    // problem: plotly does not map the color to the range, it maps the color to the bins.
    //          the first color is given to the first non-empty bin, the others follow.
    //          following non-empty bins are correctly counted and their color is skipped.
    // solution: skip the first n color ticks, where n is the number of empty bins at the start.
    let mesh = HexaLab.app.backend.get_mesh()
    let bins = 100
    let bin_size = (max - min) / bins
    let base = Math.trunc((mesh.quality_min - min) / bin_size)
    for (let i = base; i < bins ; i++) {
        bins_colors[i - base] = 100 - i
    }

    for (let i = 0; i <= 10; ++i) {
        let v = i / 10
        let v2 = range_min < range_max ? 1 - v : v
        let rgb = HexaLab.app.backend.map_value_to_color(v2)
        let r = (rgb.x() * 255).toFixed(0)
        let g = (rgb.y() * 255).toFixed(0)
        let b = (rgb.z() * 255).toFixed(0)
        colorscale[i] = [v.toString(), 'rgb(' + r + ',' + g + ',' + b + ')']
    }

    var plot_data = [{
        type:       'histogram',
        histfunc:   'count',
        histnorm:   '',
        cauto:      false,
        autobinx:   false,
        //nbinsx: 100,
        marker: {
            // showscale: true,
            cmin:   0,
            cmax:   bins - 1,
            color:  bins_colors,
            colorscale: colorscale,
        },
    }]
    plot_data[0][axis] = data
    plot_data[0][axis.concat('bins')] = {
        start:  min,
        end:    max,
        size:   bin_size
    }

    var plot_layout = {
        paper_bgcolor: 'rgba(255, 255, 255, 0.2)',
        plot_bgcolor:  'rgba(255, 255, 255, 0.2)',
        autosize:       true,
        font: {
                size: 12,
        },
        margin: {
            l:  60,
            r:  30,
            b:  50,
            t:  30,
            pad: 4
        },
    }
    plot_layout[axis.concat('axis')] = {
        autorange:  false,
        range:      [range_max, range_min],
        type:       'linear',
        ticks:      'outside',
        tick0:      0,
        dtick:      (range_max - range_min) / 10, //0.25,
        ticklen:    2,
        tickwidth:  2,
        tickcolor:  '#444444'
    }

    var plot_config = {
        modeBarButtons: [
            [{
                name: 'Flip',
                icon: Plotly.Icons['3d_rotate'],
                click: function() {
                    if (axis == 'x') {
                        HexaLab.UI.quality_plot(container, 'y')
                    } else if (axis == 'y') {
                        HexaLab.UI.quality_plot(container, 'x')
                    }
                }
            }],
            [{
                name: 'Save',
                icon: Plotly.Icons['camera'],
                click: function() {
                    let magFac=4
                    plot_layout.paper_bgcolor = 'rgba(255, 255, 255, 1)'
                    plot_layout.plot_bgcolor = 'rgba(255, 255, 255, 1)'
                    plot_layout.font.size *= magFac
                    plot_layout.margin.l *= magFac
                    plot_layout.margin.r *= magFac
                    plot_layout.margin.b *= magFac
                    plot_layout.margin.t *= magFac
                    Plotly.newPlot($("<div></div>")[0], {
                        data: plot_data,
                        layout: plot_layout,
                        config: plot_config
                    })
                    Plotly.toImage(container.find('#plot_div')[0], {
                        format: 'png', 
                        width: container.find('#plot_div').width()*magFac, 
                        height: container.find('#plot_div').height()*magFac,
                      
                    }).then(function(data) {
                        let canvas_width, canvas_height
                        if (axis == 'x') {
                            canvas_width  = container.find('#plot_div').width()*magFac
                            canvas_height = (container.find('#plot_div').height() + 16 + 10)*magFac
                        } else {
                            canvas_width  = (container.find('#plot_div').width()  + 16 + 10)*magFac
                            canvas_height = container.find('#plot_div').height()*magFac
                        }
                        let c = $('<canvas width="' + canvas_width
                                     + '" height="' + canvas_height
                                     + '"></canvas>')[0]
                        let ctx = c.getContext("2d")
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas_width, canvas_height);

                        let plot_img = new Image()
                        let bar_img  = new Image()
                        
                        plot_img.src = data
                        plot_img.onload = function() {
                            bar_img.src = HexaLab.UI.settings.color.quality_map_bar_filename
                            bar_img.onload = function() {
                                if (axis == 'x') {
                                    ctx.drawImage(plot_img, 0, 0)
                                    ctx.drawImage(bar_img, 60*magFac, canvas_height - (16 + 5)*magFac, canvas_width - (60 + 30)*magFac, 16*magFac)
                                } else {
                                    ctx.drawImage(bar_img, 5*magFac, 30*magFac, 16*magFac, canvas_height - (30 + 50)*magFac)
                                    ctx.drawImage(plot_img, (5 + 16)*magFac, 0)
                                }
                                let img = c.toDataURL("image/png")
                                saveAs(dataURItoBlob(img), "HLplot.png")
                            }
                        }
                    })
                    plot_layout.paper_bgcolor = 'rgba(255, 255, 255, 0.2)'
                    plot_layout.plot_bgcolor = 'rgba(255, 255, 255, 0.2)'
                    plot_layout.font.size /= magFac                    
                    plot_layout.margin.l /= magFac
                    plot_layout.margin.r /= magFac
                    plot_layout.margin.b /= magFac
                    plot_layout.margin.t /= magFac
                    Plotly.newPlot(container.find('#plot_div')[0], {
                        data: plot_data,
                        layout: plot_layout,
                        config: plot_config
                    })
                }
            }]
        ],
        displaylogo: false,
        displayModeBar: true
    }

    container.axis = axis

    Plotly.newPlot(container.find('#plot_div')[0], {
        data: plot_data,
        layout: plot_layout,
        config: plot_config
    });
}

// --------------------------------------------------------------------------------
// Side menu resize
// --------------------------------------------------------------------------------
HexaLab.UI.menu.resizable({
    handles: 'e',
    minWidth: 300,
    maxWidth: 600,
    // https://stackoverflow.com/questions/27233822/how-to-force-jquery-resizable-to-use-percentage
    start: function(event, ui){
        ui.total_width = ui.originalSize.width + ui.originalElement.next().outerWidth();
    },
    stop: function(event, ui){     
        var cellPercentWidth=100 * ui.originalElement.outerWidth()/ HexaLab.UI.display.innerWidth();
        ui.originalElement.css('width', cellPercentWidth + '%');  
        var nextCell = ui.originalElement.next();
        var nextPercentWidth=100 * nextCell.outerWidth()/HexaLab.UI.display.innerWidth();
        nextCell.css('width', nextPercentWidth + '%');
    },
    resize: function(event, ui){ 
        ui.originalElement.next().width(ui.total_width - ui.size.width);
    }
})

/*
$('.mini-slider').each(function () {
    $(this).width(HexaLab.UI.menu.width() * 0.4)
})
*/

HexaLab.UI.menu.on('resize', function () {
    HexaLab.UI.menu_resize_time = new Date()
    const delta = 200
    function on_resize_end () {
        if (new Date() - HexaLab.UI.menu_resize_time < delta) {
            setTimeout(on_resize_end, delta)
        } else {
            HexaLab.UI.menu_resize_timeout = false
            if (HexaLab.UI.plot_overlay) {
                // TODO move?
                // HexaLab.UI.plot_overlay.remove()
                // delete HexaLab.UI.plot_overlay
                // HexaLab.UI.create_plot_panel()
            }
        }  
    }
    if (!HexaLab.UI.menu_resize_timeout) {
        HexaLab.UI.menu_resize_timeout = true
        setTimeout(on_resize_end, delta)
    }

    var canvas_width = HexaLab.UI.display.width() - HexaLab.UI.menu.width()
    var perc_canvas_width = canvas_width / HexaLab.UI.display.width() * 100
    var perc_menu_width = HexaLab.UI.menu.width() / HexaLab.UI.display.width() * 100
    HexaLab.UI.canvas_container.css('margin-left', perc_menu_width + '%')
    HexaLab.UI.canvas_container.width(perc_canvas_width + '%')
    HexaLab.app.resize()

	/*
    $('.mini-slider').each(function () {
        $(this).width(HexaLab.UI.menu.width() * 0.4)
    })*/

    $('#mesh_info_2').css('left', (HexaLab.UI.menu.width() + 10).toString().concat('px'))
})

// --------------------------------------------------------------------------------
// Top bar
// --------------------------------------------------------------------------------

HexaLab.UI.topbar.load_mesh.on('click', function () {
    HexaLab.UI.mesh.source.val('-1')
    if (HexaLab.UI.view_source == 1) HexaLab.UI.setup_mesh_stats(HexaLab.FS.short_path(HexaLab.UI.mesh_long_name))
    HexaLab.FS.trigger_file_picker(HexaLab.UI.import_local_mesh)
})

HexaLab.UI.topbar.reset_camera.on('click', function () {
    HexaLab.app.set_camera_settings(HexaLab.app.default_camera_settings)
}).prop("disabled", true);

HexaLab.UI.create_plot_panel = function () {
    var size = HexaLab.app.get_canvas_size()
    var x = HexaLab.UI.menu.width()
    var y = 0
    var width = size.width / 4
    var height = size.height - 2
    HexaLab.UI.plot_overlay = HexaLab.UI.overlay(x, y, width, height,
        '<div id="plot_container" style="display:flex;"><div id="bar_div"><img id="bar_img" /></div><div id="plot_div"></div></div>').appendTo(document.body)
    HexaLab.UI.quality_plot(HexaLab.UI.plot_overlay, 'y')
    HexaLab.UI.plot_overlay.on('resize', function () {
        HexaLab.UI.quality_plot_update()
    })
}

// window.addEventListener('resize', function () {
//     if (HexaLab.UI.plot_overlay) {
//         HexaLab.UI.plot_overlay.remove()
//         delete HexaLab.UI.plot_overlay
//         HexaLab.UI.create_plot_panel()
//     }
// })

HexaLab.UI.topbar.plot.on('click', function () {
    if (HexaLab.UI.plot_overlay) {
        HexaLab.UI.plot_overlay.remove()
        delete HexaLab.UI.plot_overlay
    } else {
        HexaLab.UI.create_plot_panel()
    }
}).prop("disabled", true);

HexaLab.UI.topbar.load_settings.on('click', function () {
    HexaLab.FS.trigger_file_picker(HexaLab.UI.import_settings)
}).prop("disabled", true);

HexaLab.UI.topbar.save_settings.on('click', function () {
    const settings = JSON.stringify(HexaLab.app.get_settings(), null, 4)
    const blob = new Blob([settings], { type: "text/plain;charset=utf-8" })
    HexaLab.FS.store_blob(blob, "HLsettings.txt")
}).prop("disabled", true);

HexaLab.UI.topbar.github.on('click', function () {
    window.open('https://github.com/cnr-isti-vclab/HexaLab#hexalabnet-an-online-viewer-for-hexahedral-meshes', '_blank');
})

HexaLab.UI.overlay = function (x, y, width, height, content) {
    var x = jQuery(
        [
            '<div id="overlay" style="',
            'left:', x, 'px;',
            'top:', y, 'px;',
            'width:', width, 'px;',
            'height:', height, 'px;',
            'position:fixed;',
            'border: 1px solid rgba(64, 64, 64, .25);',
            ' ">', content, ' </div>'
        ].join(''))
    return x.resizable().draggable({
        cursor: "move"
    });
}

HexaLab.UI.topbar.about.on('click', function () {
    if (HexaLab.UI.about_dialog) {
        HexaLab.UI.about_dialog.dialog('close')
        delete HexaLab.UI.about_dialog;
    } else {
        HexaLab.UI.about_dialog = $('<div title="About"><h3><b>HexaLab</b></h3>\n\
A webgl, client based, hexahedral mesh viewer. \n\
Developed by <a href="https://github.com/c4stan">Matteo Bracci</a> as part of his Bachelor Thesis \n\
in Computer Science, under the supervision of <a href="http://vcg.isti.cnr.it/~cignoni">Paolo Cignoni</a> \n\
and <a href="http://vcg.isti.cnr.it/~pietroni">Nico Pietroni</a>.<br><br>  \n\
Copyright (C) 2017  <br>\
<a href="http://vcg.isti.cnr.it">Visual Computing Lab</a>  <br>\
<a href="http://www.isti.cnr.it">ISTI</a> - <a href="http://www.cnr.it">Italian National Research Council</a> <br><br> \n\
<i>All the shown datasets are copyrighted by the referred paper authors</i>.</div>').dialog({
            close: function()
            {
                $(this).dialog('close')
                delete HexaLab.UI.about_dialog;
            }
        });
    }
    /*if (HexaLab.UI.about_overlay) {
        HexaLab.UI.about_overlay.remove()
        delete HexaLab.UI.about_overlay
    } else {
        HexaLab.UI.about_overlay = HexaLab.UI.overlay(100, 100, 100, 100, '\\m/').appendTo(document.body)
    }*/
})

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

HexaLab.UI.topbar.snapshot.on('click', function () {
    HexaLab.app.canvas.element.toBlob(function (blob) {
        	
			var reader = new FileReader();
			
			reader.onloadend = function (e) {
				const settingsStr = JSON.stringify(HexaLab.app.get_settings(), null, 4)
				pngitxt.set(
					reader.result, 
					{  
						keyword: "hexalab", 
						value: settingsStr	
					},
					function (res) {
						var by = new Uint8Array(res.length);
						for (var i=0; i<res.length; i++) by[i]=res.charCodeAt(i);
						blob = new Blob( [by.buffer] )
						saveAs(blob, "hexalab.png")
					}
				)
				
			}

			reader.readAsBinaryString( blob );

    }, "image/png");
}).prop("disabled", true);

HexaLab.UI.settings.rendering_menu_content.prop('disabled', true)
HexaLab.UI.settings.silhouette.slider('disable')    
HexaLab.UI.settings.erode_dilate.slider('disable')    
HexaLab.UI.settings.singularity_mode.slider('disable')
//HexaLab.UI.settings.wireframe_row.hide()
//HexaLab.UI.settings.crack_size_row.hide()
//HexaLab.UI.settings.rounding_radius_row.hide()
HexaLab.UI.settings.color.default.outside.spectrum('disable')
HexaLab.UI.settings.color.default.inside.spectrum('disable')