/**
 * Created with PyCharm.
 * User: turim and nikola novitski
 * Date: 13.03.13
 * Time: 15:40
 * To change this template use File | Settings | File Templates.
 */

document.ontouchmove =  function(e){
    e.preventDefault();
};

var station = null; // the nearest station 1 object

var transition_in_progress = false;
var login = false;
var order = {};
var profile = {};
var map;
var map2;
var glob_markersObj= {};
var $glob_stations = null;
var glob_lat = "";
var glob_lon = "";
var glob_markers =[];
//var glob_url = "http://0.0.0.0:8000/shell/";
var glob_url = "http://shell.wmt.dk/shell/";

/*Codes for order state*/
var ORDER_IN_PROCESS = 1,
    ORDER_PPAYMENT_DONE = 2,
    ORDER_WORK_STARTED = 3,
    ORDER_WORK_ENDED = 4;


var DEBUG_MODE = true;
var glob_event = "click";
var glob_preloader = false;
var glob_block_current_client = false;
if (localStorage.getItem("blocked")){
    glob_block_current_client = true;
}
// check if device is iPhone or iPad and change variable
if(navigator.userAgent.match(/iPhone/i) || (navigator.userAgent.match(/iPod/i))){
    glob_url = "http://shell.wmt.dk/shell/";
    DEBUG_MODE = false;
    glob_event= "touchstart";
//    glob_event= "touchend";
}


function show_alert(str){
    try {
        navigator.notification.alert(str, null, 'Shell', "Ok");
    } catch(e){
        alert(str);
    }
}

function check_if_client_blocked(on_resume){
    if (glob_block_current_client){
        var data = {email:localStorage.getItem("email")};
        $.ajax({
        url: glob_url + "client/check/",
        type: "POST",
        data: data,
        success: function(response) {
            if (response.client ==="unblocked"){
                glob_block_current_client = false;
                localStorage.removeItem("blocked");
                if(on_resume){
                    move_sections($("section[data-page=#home]"), animation_ended);
                }
            }
        },
        async:false,
        dataType: "json"
    });

    }
}
function onResume(){
    alert(1);
    check_if_client_blocked(true);
    alert(2);
    glob_preloader = false;
    alert(3);
    activate_position();
}
$.validator.addMethod('english_email', function(value) {
    return value.match(/^([a-z0-9\+_\-]+)(\.[a-z0-9\+_\-]+)*@([a-z0-9\-]+\.)+[a-z]{2,6}$/gi);
    },
    'Please enter a valid email address.');

   if (!DEBUG_MODE){
        document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        if (typeof navigator.device == undefined){
            document.addEventListener("deviceready", onDeviceReady, false);
        } else {
            onDeviceReady();
        }
    }
function onDeviceReady() {
    check_if_client_blocked(false);
    glob_preloader = true;
    activate_position();
    document.addEventListener("resume", onResume, false);
}



function hide_preloader(){
        if (glob_preloader){
            $(".sl_load_bar").css("-webkit-animation", "none");
            if ($(".show_top_index").hasClass("show_top_index")){
                $(".show_top_index").removeClass("show_top_index");
        }
         if (glob_block_current_client){
             $(".js_load_bar").data("href","#block_page");
             $("#shell_blocked_email").text(localStorage.getItem("email"));
         }
        setTimeout(function(){move_sections($(".sl_load_bar"), animation_ended)}, 1500);
}
}

function add_no_location(){
    if  (!$(".sl_wheel_buy").hasClass("js_no_geolocation")){
        $(".sl_wheel_buy").addClass("js_no_geolocation");
    }
    if (!$(".sl_part_b").hasClass("js_no_geolocation")){
        $(".sl_part_b").addClass("js_no_geolocation");
    }
    if (!$(".sl_part_l").hasClass("js_no_geolocation")){
        $(".sl_part_l").addClass("js_no_geolocation");
    }
}
function remove_no_location(){
    if ($(".sl_wheel_buy").hasClass("js_no_geolocation")){
        $(".sl_wheel_buy").removeClass("js_no_geolocation");
    }
    if ($(".sl_part_b").hasClass("js_no_geolocation")){
        $(".sl_part_b").removeClass("js_no_geolocation");
    }
    if ($(".sl_part_l").hasClass("js_no_geolocation")){
        $(".sl_part_l").removeClass("js_no_geolocation");
    }
}
function filter_stations(mas, self){
    map.setCenter(new google.maps.LatLng(glob_lat,glob_lon));
    map.setZoom(12);
    for (i in glob_markersObj){
        glob_markersObj[i].setMap(null);
        glob_markersObj[i].setMap(map);
    }
    if (mas.length){
        for (i in mas){
            glob_markersObj[mas[i]].setMap(null);
        }
    }
    setTimeout(function(){move_sections(self, animation_ended)},0);
}
//function initialize_google_map(lat, lng, markers, transition, _self) {
function initialize_google_map() {
    var lat = glob_lat;
    var lng = glob_lon;
    var markers = glob_markers;
    var transition, _self;
    var mapOptions = {
      center: new google.maps.LatLng(lat, lng),
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false
    };
    var mapOptions2 = {
      center: new google.maps.LatLng(lat, lng),
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      draggable: false,
      keyboardShortcuts: false,
      panControl: false,
      scaleControl: false,
      scrollwheel: false,
      zoomControl: false,
      disableDoubleClickZoom: true
    };

    if( !map || !map2){
        if( !map ){
            $('#google_map_canvas').prev('span').html('Initialize Google Maps');
        }
        if( !map2 ){
            $('#contact_google_map').prev('span').html('Initialize Google Maps');
        }

        map = new google.maps.Map(document.getElementById('google_map_canvas'), mapOptions);
        map2 = new google.maps.Map(document.getElementById('contact_google_map'), mapOptions2);

        // Feature for the nearest shell station and current client
        //  Make an array of the LatLng's of the markers you want to show
        var LatLngList = new Array (new google.maps.LatLng ($glob_stations[0].lat,$glob_stations[0].lon), mapOptions.center);
        //  Create a new viewpoint bound

        var bounds = new google.maps.LatLngBounds ();
        //  Go through each...
        for (var i = 0, LtLgLen = LatLngList.length; i < LtLgLen; i++) {
          //  And increase the bounds to take this point
          bounds.extend (LatLngList[i]);
        }
        //  Fit these bounds to the map
        map.fitBounds (bounds);
        map2.fitBounds (bounds);

//        var pinColor = "FE7569";
        var pinColor = "20712B";
        var pinImage = new google.maps.MarkerImage( "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"+pinColor,
            null, /* size is determined at runtime */
            null, /* origin is 0,0 */
            null, /* anchor is bottom center of the scaled image */
            new google.maps.Size(42, 68));

        var contact_client = new google.maps.Marker({
                map: map2,
                position: mapOptions2.center,
                icon: pinImage
            });
        var contact_station = new google.maps.Marker({
                map: map2,
                position: new google.maps.LatLng ($glob_stations[0].lat,$glob_stations[0].lon),
                icon: 'img/logo_mic.png'
            });
        var client = new google.maps.Marker({
                map: map,
                position: mapOptions.center,
                icon: pinImage
            });

        var phone;
        var image = 'img/logo_mic.png';
        var infowindow = new google.maps.InfoWindow(), marker;
        for (var i = 0; i < markers.length; i++) {
            phone = markers[i][3];
            marker = new google.maps.Marker({
                id: "marker_"+markers[i][1]+"_"+markers[i][2],
                position: new google.maps.LatLng(markers[i][1], markers[i][2]),
                map: map,
                icon: image
            });
            glob_markersObj[marker.id] = marker;

            google.maps.event.addListener(marker, 'click', (function(marker, i, phone) {
                return function() {
                    infowindow.setContent(markers[i][0]+"<br />"+markers[i][4]);
                    infowindow.open(map, marker);
                    $(".js_phone_station").attr("href", "tel:"+phone)
                }
            })(marker, i, phone));

        }

        google.maps.event.addListenerOnce(map, 'idle', function(){
            $('#google_map_canvas').prev('span').remove();
        });

        google.maps.event.addListenerOnce(map2, 'idle', function(){
            $('#contact_google_map').prev('span').remove();
        });

    }

    map.setCenter( mapOptions.center );
    map2.setCenter( mapOptions2.center );
//        if (glob_preloader){
//            google.maps.event.addListenerOnce(map, 'idle', function(){
//            if (countMap() === 2){hide_preloader();}
//            });
//            google.maps.event.addListenerOnce(map2, 'idle', function(){
//                if (countMap() === 2){hide_preloader();}
//            });
//        }
      }
$(document).on(glob_event,".js_search_stations", function(){
    var $checkboxes = $(this).closest("section").find("input[type=checkbox]:checked");
    if ($checkboxes.length){
        var checked_wash = [];
        for (i = 0; i < $checkboxes.length; i++){
            checked_wash.push(parseInt($checkboxes[i].id.replace("washing_type_",""), 10));
        }
        var stations = [];
        var mas_of_station =[];
        for (i = 0; i < $glob_stations.length; i++){
            var m =[];
            for(j = 0; j < $glob_stations[i].washing_types.length; j++ ){
                m.push($glob_stations[i].washing_types[j].washing_id);
            }
            var have_not_washing_types = false;
            for (k = 0; k < checked_wash.length; k++){
                if ( $.inArray ( checked_wash[k], m ) < 0 ) {
                    have_not_washing_types = true;
                    break;
                }
            }
            if(have_not_washing_types){
                mas_of_station.push("marker_"+ $glob_stations[i].lat+"_"+ $glob_stations[i].lon);
            }
        }
        filter_stations(mas_of_station, $(this));
    }
    else{
        filter_stations([], $(this));
    }

});

/********************Work with position of user*****************************/
function successFunction(position) {
//    show_alert(glob_lat);
//    show_alert(position.coords.latitude);
//    show_alert(glob_lon);
//    show_alert(position.coords.longitude);
//    if (glob_lat && glob_lon && position && glob_lat == position.coords.latitude && glob_lon == position.coords.longitude){
//        show_alert("successFunction return false");
//        return;
//    }
//    49.233292,28.466949
    glob_lat = position.coords.latitude;
    glob_lon = position.coords.longitude;
    $.get(
        glob_url+"?lat=" + glob_lat + "&lon=" + glob_lon,
        function(response){
            if (response.length){
                 $glob_stations = response[0]["stations"];
                // ---------------------------------------
                // Start for google
                glob_markers =[];
                for (i = 0; i < $glob_stations.length; i ++){
                    glob_markers.push([$glob_stations[i].title, $glob_stations[i].lat, $glob_stations[i].lon, $glob_stations[i].phone, $glob_stations[i].address]);
                }
                // ------------------------------------------
                remove_no_location();
                if (station && station.id!== $glob_stations[0].id){
                    move_sections($("section[data-page=#home]"), animation_ended);
                }
                station = $glob_stations[0];
                if (station.washtec == 1 && $(".js_hide_washtec").hasClass("js_hide_washtec")){
                    $(".js_hide_washtec").removeClass("js_hide_washtec");
                }
                var washing_types = response[1]["washing_types"];
                $(".js_wash_station").text(station.city + ", "+station.address+ ", "+station.title );
                $(".js_washer_types_list").html(render_to('templates/list_of_washing_types.html', {station: station}));
                $("section[data-page^=#washing_type_]").remove();
                $("section[data-page^=#description_washing_type_]").remove();
                $(".sl_wrap").prepend(render_to('templates/washing_type_description.html', {station: station}));
                $(".sl_wrap").append(render_to('templates/washing_type_description2.html', {washing_types: washing_types}));
                $(".js_station_info").html(station.description);
                $(".offer_information").html(render_to('templates/list_of_special_offers.html', {station: station}));
                $(".js_all_washing_types").html(render_to('templates/all_washing_types.html', {washing_types: washing_types}));
                $(".js_phone_station").attr("href","tel:"+station.phone);
                // for Contact info
                $("#js_contact_title").text(station.title);
                $("#js_contact_info").html(station.address +"<br />" + station.city + "<br /> TELEFON: " + station.phone + "<br /> Email: " + "<a class='show_as_text' href='mailto:" + station.email + "'>"+ station.email + "</a>" );
                $("#js_phone_nearest_station").attr("href","tel:"+station.phone);
//                add slides fallery for speciall offers
                if (station.special_offers.length >1){
//                    function onAfter(curr,next,opts){
//                        var index=opts.currSlide;
//                        $('.prev_offer')[index==0?'hide':'show']();
//                        $('.next_offer')[index==opts.slideCount-1?'hide':'show']();
//                    }
                $(".js_gallery").cycle({
                    fx:     'scrollHorz',
                    prev:   '.prev_offer',
                    next:   '.next_offer',
//                    after:   onAfter,
                    timeout: 0,
//                    easing:  'easeInOutBack',
                    fit :1,
                    width: "640",
                    speed: 500
               });
                    $(".js_gallery").touchwipe({
                          wipeLeft: function() {
                                $(".js_gallery").cycle("next");
                          },
                          wipeRight: function() {
                                $(".js_gallery").cycle("prev");
                          }
                    });

                    var $special_offers = $(".js_move_to_top").find(".js_special_offer_info");
                    for (var i=0; i<$special_offers.length; i++){
                        $special_offers[i].outerText = " <<  " +$special_offers[i].outerText+ "  >> "
                    }
                }
                // try to hide block if not exist special offers
                //initialize_google_map(glob_lat, glob_lon, glob_markers);
            } else {
                add_no_location();
                $(".js_wash_station").html("Kan ikke forbinde til server");
            }
            hide_preloader();

        }
        ,"json"
    ).error(function(){
                    add_no_location();
                    $(".js_wash_station").html("Kan ikke forbinde til server");
                    setTimeout(function(){move_sections($(".sl_load_bar"), animation_ended)}, 500);
                });

}

//TODO: NEED TO UPDATE TEXTS AND PLACES
function errorFunction(err) {
    add_no_location();
    if(err.code == 1) {
        $(".js_wash_station").html("GEOLOCATION ER <br />DEAKTIVERET");
    }else if( err.code == 2) {
        $(".js_wash_station").text("Position is unavailable!");
    }
    else if( err.code == 3) {
        $(".js_wash_station").text("Connection Timeout!");
    }
    else{
        $(".js_wash_station").html("Geolocation er ikke <br/> installeret");
    }
    setTimeout(function(){move_sections($(".sl_load_bar"), animation_ended)}, 500);
}

function activate_position() {
    if (navigator.geolocation) {
//        Fake location:
//        var position = {
//            coords:{
//                latitude: 49.233292,
//                longitude: 28.466949
//            }
//        };
//        successFunction(position);
        navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
    }
    else{
        $(".js_wash_station").text("Enheden understøtter ikke geolocation");
        add_no_location();
    }
}

var stop_timer = null;


function timer(elem, timer/*Seconds*/, callback/*What to do after timer stopped*/){
    var start_time = new Date(),
        elem = elem,
        timer = timer,
        callback = callback||function(){};
        var timeout;
    function show_left_time(){
        var delta = (timer - parseInt((new Date() - start_time)/1000)), minutes, seconds;

        if (delta > 0){
            minutes = parseInt((delta/60));
            seconds = delta - (minutes * 60);
            elem.html(minutes + ":" + ((seconds < 10) ? ("0" + seconds) : seconds));
            stop_timer = setTimeout(show_left_time, 1000);
        } else {
            minutes = parseInt((delta/60));
            seconds = delta - (minutes * 60);
            elem.html(minutes + ":" + ((seconds < 10) ? ("0" + seconds) : seconds));
            callback();
        }
    }
    stop_timer = setTimeout(show_left_time, 1000);
//    timeout = setTimeout(show_left_time, 1000);
}


function slideOn(cur_elem, cur_limit_max, cur_limit_min, cur_axis, cur_callback ){
    var elem = cur_elem,
        limit_max = (typeof cur_limit_max != 'undefined') ? cur_limit_max: 0,
        limit_min = (typeof cur_limit_min != 'undefined') ? cur_limit_min: (-900),
        axis = cur_axis || "top",
        callback_if_max_position = (typeof callback_if_max_position!= 'undefined' ? callback_if_max_position : true),
        callback = cur_callback||function(){},
        style = {};
        var start_position;
        $(elem).draggable({
            scroll:false,
            axis: (axis == "top" ? "y" : "x"),
            handle: ".js_move_to_top",
            grid: [25,25],
            distance : 30,
            start:function (event, ui) {
                start_position = ui.position[axis];
                if($(elem).removeClass("js_show_offer_information")){
                    $(elem).removeClass("js_show_offer_information").css({
                        "-webkit-animation": ""
                    });

                }
            },
            drag:function (event, ui) {
                if (ui.position[axis]> limit_max ){
                    ui.position[axis] = limit_max;
                    return false;
                } else if (ui.position[axis] < limit_min){
                    ui.position[axis] = limit_min;
                    return false;
                }
            },
            stop:function (event, ui) {
                var state;
                var half_way = Math.abs(limit_max - limit_min)/2;
                if((limit_min + half_way) > ui.position[axis]){
                    style[axis] = limit_min + "px";
                    state = false;
                } else {
                    style[axis] = limit_max + "px";
                    state = true;
                }
                setTimeout(function(){
                        callback(elem, state);
                    }, 250);

                $(elem).css(style);
            }
        });

}

function simulateTouchEvents(oo, bIgnoreChilds) {
    if (!$(oo)[0]) {
        return false;
    }

    if (!window.__touchTypes) {
        window.__touchTypes = {touchstart:'mousedown', touchmove:'mousemove', touchend:'mouseup'};
        window.__touchInputs = {INPUT:1, TEXTAREA:1, SELECT:1, OPTION:1, 'input':1, 'textarea':1, 'select':1, 'option':1};
    }

    $(oo).bind('touchstart touchmove touchend', function (ev) {
        var bSame = (ev.target == this);
        if (bIgnoreChilds && !bSame) {
            return;
        }

        var b = (!bSame && ev.target.__ajqmeclk), // Get if object is already tested or input type
            e = ev.originalEvent;
        if (b === true || !e.touches || e.touches.length > 1 || !window.__touchTypes[e.type]) {
            return;
        } //allow multi-touch gestures to work

        var oEv = ( !bSame && typeof b != 'boolean') ? $(ev.target).data('events') : false,
            b = (!bSame) ? (ev.target.__ajqmeclk = oEv ? (oEv['click'] || oEv['mousedown'] || oEv['mouseup'] || oEv['mousemove']) : false ) : false;

        if (b || window.__touchInputs[ev.target.tagName]) {
            return;
        } //allow default clicks to work (and on inputs)

        // https://developer.mozilla.org/en/DOM/event.initMouseEvent for API
        var touch = e.changedTouches[0], newEvent = document.createEvent("MouseEvent");
        newEvent.initMouseEvent(window.__touchTypes[e.type], true, true, window, 1,
            touch.screenX, touch.screenY,
            touch.clientX, touch.clientY, false,
            false, false, false, 0, null);

        touch.target.dispatchEvent(newEvent);
        e.preventDefault();
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
    });
    return true;
}

function move_sections(elem, callback){
    var parent_section = $(elem).parents("section");
    var href = get_href(elem);
    if ($(elem).is("section")){
        parent_section = $("section.js_activate");
        href = $(elem).data("page");
        transition_in_progress = false;
    }
    var activate_section = $("section[data-page=" + href +"]");
    if (href=="#home"){
        var sections = $(".js_pushed").not("[data-page=#home]");
        var duration = sections.css('-webkit-transition-duration');
        sections.addClass("animation_stopped");
        sections.removeClass("js_pushed").addClass("js_dissable");
    }

    if(activate_section.length && !activate_section.hasClass("js_activate")){
        var move_to_class = activate_section.hasClass("js_dissable") ? "js_pushed": "js_dissable";
        parent_section.removeClass("js_activate").addClass(move_to_class);
        if(activate_section.hasClass("disable_form_elements")) {
            activate_section.removeClass("disable_form_elements")
        }
        activate_section.removeClass(activate_section.hasClass("js_dissable") ? "js_dissable" : "js_pushed").addClass("js_activate");
    } else {
        transition_in_progress = false;
    }
    activate_method(elem);

    // hide element  if station have not special_offers
    if (href=="#start_wash" && station){
        if (station.special_offers.length ===0){
            $(".js_move_to_top").hide();
        }

    }
    callback(elem);
}
function animation_ended(elem){
    var was_rotated = $(elem).data("rotation") ? $(elem).data("rotation") : null;
     $('div.sl_wrap').on('webkitTransitionEnd moztransitionend transitionend oTransitionEnd', "section", function () {
        if($("section.js_dissable, section.js_pushed").not(".disable_form_elements").length){
            $("section.js_dissable, section.js_pushed").not(".disable_form_elements").addClass("disable_form_elements");
        }
        if($(".animation_stopped").length){
            $(".animation_stopped").removeClass("animation_stopped");
        }
        if(was_rotated){
            $("." + was_rotated).removeClass(was_rotated);
        }
        transition_in_progress = false;
        $("section").off('webkitTransitionEnd moztransitionend transitionend oTransitionEnd');
    });
}


function get_href(elem){
    return $(elem).attr("href") ? $(elem).attr("href") : ($(elem).data("href") ? $(elem).data("href") : "#home");
}

/***
Working with methods of forms etc.
Try to imitate real mechanisms
***/
function activate_method(elem){
    var method = $(elem).data("method") ? $(elem).data("method") : null;
    var variable = $(elem).data("variable") ? $(elem).data("variable") : null;
    if( method )
        try {
            method = eval(method);
            method(elem, variable);
        } catch (e) {
            console.log(e);
        }
}


function find_washer(elem){
    if($("#searching_results").length) {
        $("#searching_results").attr("src", "img/map_s.jpg")
    }
}


function wash_info(elem){
    if($(".js_time_wash").length){
        if($(".js_button_move").length) {
            $(".js_button_move").css({"left": "0"});
        }
        if(!$(".js_time_wash").hasClass("show_time_to_wash")){
            $(".js_time_wash").addClass("show_time_to_wash");
            $(".js_wash_timer").text("5:00");
            $(".js_process_description").text("PROCESS - UNDERVOGNSSKYL");//TODO: Should be changed in the future to context variable
            timer($(".js_wash_timer"), 300, function(){
                $(".js_time_wash").removeClass("show_time_to_wash");
                $(".js_process_description").text("VASK AFSLUTTET");
            });
        }
        setTimeout(function(){
            var animate_it = $("section[data-page=#wash_info] .js_move_to_top");
//            animate_it.addClass("js_show_offer_information");//.css({
            animate_it.css({
                "-webkit-animation": "show_it .5s ease-in 1 forwards"
//                top: '-1055px',
//                display: 'block'
            });
//            animate_it.show().animate({top: -1055}, 1000);
            setTimeout(function(){
                if(animate_it.hasClass("js_show_offer_information")) {
//                    animate_it.animate({top: 0}, 1000, function(){
//                        $(this).hide();
//                    });
                    animate_it.removeClass("js_show_offer_information").css({
                        "-webkit-animation": "hide_it .5s ease-in 1 forwards"
//                        'display': "none",
//                        top: 0
                    });
                }
            }, 3000);
        }, 300);
        $("form").not(".should_not_be_reseted").each(function(){
           $(this)[0].reset();
        });
    }
}
function show_offer(elem){
    $(".offer_information").parent().css({"display": "block"})
}

function autofill_order(elem){
    var $form = $('#id_order_form');
    $form.find('input[name=first_name]').val( localStorage.getItem("first_name") || '' );
    $form.find('input[name=last_name]').val( localStorage.getItem("last_name") || '' );
    $form.find('input[name=address]').val( localStorage.getItem("address") || '' );
    $form.find('input[name=phone]').val( localStorage.getItem("phone") || '' );
    $form.find('input[name=email]').val( localStorage.getItem("email") || '' );
    $form.find('input[name=by_post]').val( localStorage.getItem("by_post") || '' );
    $form.find('input[name=code]').val( '' );
}

function try_order(elem){

}
function render_to(url_to_template, locals){
    var strReturn = "";
    $.ajax({
        url: url_to_template,
        success: function(html) {
            var tmpl = swig.compile(html);
            locals['filename'] = locals.hasOwnProperty("filename") ? locals.filename : url_to_template;
            strReturn = tmpl(locals);
        },
        async:false
//        isLocal: true
    });
    return strReturn;
}

/*                   Ordering functions     */
/********************************************/

function start_order(elem, variable){
    $(".js_back_button_to_washing_description").data({"href": $(elem).closest("section").data("page")});
    order = {};
    order["washing_id"] = variable;
    order["type"] = ORDER_IN_PROCESS;
    for(var washing_key in station.washing_types){
        var washing_type = station.washing_types[washing_key];
        if(washing_type.washing_id == order["washing_id"]){
            order["price"] = washing_type.cost;
            order["station_id"] = station.id;
            break;
        }
    }
}

  $.preloadImage=function(src,onSuccess,onError)
    {
        var img = new Image();
        img.src=src;
        var error=false;
        img.onerror=function(){
            error=true;
            if(onError)onError.call(img);
        }
        if(error==false)
        setTimeout(function(){
            if(img.height>0&&img.width>0){
                if(onSuccess)onSuccess.call(img);
                return img;
            }   else {
                setTimeout(arguments.callee,5);
            }
        },0);
        return img;
    }

    $.preloadImages=function(arrayOfImages){
        $.each(arrayOfImages,function(){
            $.preloadImage(this);
        })
    }

function hideSplashScreen(){
     if (!DEBUG_MODE){
                setTimeout(function(){
                    navigator.splashscreen.hide();
                     if (!$(".js_load_bar").hasClass("sl_load_bar")){
                        $(".js_load_bar").addClass("sl_load_bar");
                    }
                },0);
            }
     else{
         if (!$(".js_load_bar").hasClass("sl_load_bar")){
                        $(".js_load_bar").addClass("sl_load_bar");
                    }
     }
}
function isLocalStorageAvailable() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
}
function set_profile(){
     if (!isLocalStorageAvailable()){show_alert("Your browser do not support LocalStorage technology")}
    else{
        if (localStorage.length){
            $("#payment_login").attr("href","#order_login");
            var $button_user = $("#js_client_login");
            var $parent  = $button_user.parent(); // link
            if (!$parent.hasClass("js_update_profile")){$parent.addClass("js_update_profile")}
            $button_user.text("UPDATE");
            var current_input;
            $button_user.closest("form").find("input").each(function(){
                current_input = $(this).attr("name");
                switch (current_input){
                    case "first_name":
                        $(this).val(localStorage.getItem("first_name"));
                        break;
                    case "last_name":
                        $(this).val(localStorage.getItem("last_name"));
                        break;
                    case "address":
                        $(this).val(localStorage.getItem("address"));
                        break;
                    case "phone":
                        $(this).val(localStorage.getItem("phone"));
                        break;
                    case "email":
                        $(this).val(localStorage.getItem("email"));
                        break;
                    case "by_post":
                        $(this).val(localStorage.getItem("by_post"));
                        break;
                    case "code":
                        $(this).val(localStorage.getItem("code"));
                        break;
                }
            });
            $button_user.closest("form").find("select option:selected").removeAttr("selected");
            $button_user.closest("form").find("select option[value=" + localStorage.getItem("car_type") + "]").attr("selected", "selected");
        }
    }
}

function setLocalStorage(data){
    localStorage.setItem('first_name', data.client.first_name);
    localStorage.setItem('last_name', data.client.last_name);
    localStorage.setItem('address', data.client.address);
    localStorage.setItem('phone', data.client.phone);
    localStorage.setItem('email', data.client.email);
    localStorage.setItem('by_post', data.client.by_post);
    localStorage.setItem('code', data.client.code);
    localStorage.setItem('client_id', data.client.client_id);
    localStorage.setItem('car_type', data.client.car_type);
}
var dots;

function fakeOrder(){
    var interval = 2000;
    var element = 0;
    $(".hidden_elem").each(function(){
        if ($(this).hasClass("js_order_button_ok")){
            interval -= 1900;
        }
        var $self = $(this);
            setTimeout(function(){
                element++;
                clearInterval(dots);
                switch(element){
                    case 2:
                    case 4:
                    case 6:
                        $self.prev().removeClass("js_dot_wait");
                        $self.prev().text('...');
                    break;
                }

                    dots = window.setInterval( function() {
                        var wait = $('.js_dot_wait').first();
                        if (wait.text().length > 2){
                            wait.text("");
                        }
                        else{
                            wait.text("."+wait.text()) ;
                        }
                        }, 200);

                $self.removeClass("hidden_elem");
            }, interval);
        interval += 2000;
    });

}

function clearInputPassword(form){
    form.find("input").each(function(){
        $(this).val("");
    });
}

(function($) {
    jQuery.fn.buildSeparatedFields = function() {
        return this.each(function() {
            var $self = $(this);
            var params = {
                fields: $self.find('input'),
                otpMask: (/[^0-9]+/g)
            };
            params.fieldsCount = params.fields.length;
            $.each(params.fields, function(index, field) {
                if (field) {
                    $(field).on({
                        keydown : function(event) {
                            this.value = "";
                        },
                        keyup : function(event) {
                            var current_val = this.value;
                            this.value = "";
                            this.value = (current_val || '').replace(params.otpMask, '');
                            if ((event.keyCode >= 48 && event.keyCode <= 57) || event.keyCode === 8) {
                                if (this.value.length === 1) {
                                    var next = $(this).next('input')[0];
                                    if (next) {
                                        this.parentNode.insertBefore(next, this);
                                        var val = (next.value || '').replace(params.otpMask, '');
                                        next.value = (this.value || '').replace(params.otpMask, '');
                                        this.value = val;
                                    }
//                                    else{
//                                        var uncomplete = false;
//                                        $.each(params.fields, function(_index, _field){
//                                            if(!_field.value.length)
//                                                    });
//
//
//                                            $(this).blur();
//                                        }
                                }else {
                                    if (event.keyCode === 8) {
                                        if(!this.value){
                                            var previous = this.previousElementSibling;
                                            if (previous) {
                                                this.parentNode.insertBefore(previous, $(this).next('input')[0]);
                                                this.value = previous.value;
                                                previous.value = "";
                                            }
                                        }else{
                                            this.value = "";
                                        }
                                    }
                                }
                            }
                        },
                        focus : function(event) {
//                            this.value = "";
                        }
                    });
                }
            });
        });
    };
})(jQuery);


$(document).ready(function(){
    set_profile();
    $.preloadImage(
        'css/img/bg_1.jpg',
        function(){
           hideSplashScreen();
        },
        function(){
             hideSplashScreen();
        }
    );
    simulateTouchEvents(".js_move_to_top, .js_button_move");

    $(".js_password_items").buildSeparatedFields();


    $("section[data-page=#home] .js_move_to_top").on('animationend mozanimationend webkitAnimationEnd oAnimationEnd msanimationend', function () {
        if($(this).hasClass("sl_bbtn_next_down")){
            $(this).removeClass("sl_bbtn_next_down");
        }else{
            $(this).addClass("sl_bbtn_next_down");
        }
    });


    $('#id_order_form').on("submit", function(event){
        event.preventDefault();
        var $form = $(this);
//        var url = $form.attr('action');
        var url = glob_url + 'order/create/';
        var $preloader = $(".js_preloader");
        var $self = $(this);
        var $profile = $("#js_profile_client");


        if( $form.valid() ){
            var data = $form.serialize();
            data += "&order="+JSON.stringify(order);

            $.post(url, data,
                    function(response){
                        switch (response.status){
                            case "user_are_blocked":
                                var email = localStorage.getItem("email") || "a";
                                if (response.email.toLowerCase() === email.toLowerCase()){
                                    localStorage.setItem("blocked","1")
                                }
                                var href = $self.data("href");
                                $self.data("href","#block_page");
                                $("#shell_blocked_email").text(response.email);
                                $preloader.hide();
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                glob_block_current_client = true;
                                $self.data("href", href);
                                break;
                            case "error_code":
                                if ($self.hasClass("js_update_profile") || $self.hasClass("js_ord_log_pass")){
                                    $self.find("input").each(function(){
                                        if ($(this).hasClass("valid")){$(this).removeClass("valid");}
                                        if (!$(this).hasClass("error")){$(this).addClass("error");}
                                    });
                                }
                                else{
                                    var $code = $self.find("input[name=login_code]");
                                    if ($code.hasClass("valid")){$code.removeClass("valid");}
                                    if (!$code.hasClass("error")){$code.addClass("error");}
                                }
                                break;
                            case "client_not_exist":
                                var $login_email = $self.find("input[name=login_email]");
                                if ($login_email.hasClass("valid")){$login_email.removeClass("valid");}
                                if (!$login_email.hasClass("error")){$login_email.addClass("error");}
                                break;
                            case "client_create":
                                 move_sections($self, animation_ended);
                                setLocalStorage(response);
                                set_profile();
                                $preloader.hide();
                                break;
                            case "email_exist":
                                if ($self.hasClass("js_update_profile")){
                                    $self.find("input").each(function(){
                                        $(this).val("");
                                    });
                                    var mail = $profile.find("input[name=email]");
                                    if (mail.hasClass("valid")){mail.removeClass("valid");}
                                    if (!mail.hasClass("error")){mail.addClass("error");}
                                    transition_in_progress = true;
                                    move_sections($self, animation_ended);
                                }
                                else{
                                    var $email = $self.find("input[name=email]");
                                    if ($email.hasClass("valid")){$email.removeClass("valid");}
                                    if (!$email.hasClass("error")){$email.addClass("error");}
                                }
                                $preloader.hide();
                                break;
                            case "client_update":
                            case "login_success":
                                setLocalStorage(response);
                                set_profile();
                                if (response.status ==="client_update"){
                                     clearInputPassword($self);
                                }
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                $preloader.hide();
                                break;
                            case "order_create":
                                if (response.hasOwnProperty("client")){
                                    setLocalStorage(response);
                                    set_profile();
                                }
                                order = {};
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                $preloader.hide();
                                fakeOrder();
                                break;
                            case "form_not_valid":
                                show_alert("form_not_valid");
                                break;
                            case "not_post":
                                show_alert("not_post");
                                break;
                            case "no_order":
                                show_alert("no_order");
                                break;
                        }

                    }
                ,'json');
        }
    });

    $('#id_login_form').on("submit", function(event){
//     ToDo: remove it
        event.preventDefault();
        var $form = $(this);
//        var url = $form.attr('action');
        var url = glob_url + 'order/create/';

        if( $form.valid() ){
            var data = $form.serialize();
            data += "&order="+JSON.stringify(order);

            $.post(url, data, function(response){
            }, 'json');
        }
    });


    $("form").not('#id_order_form, #id_login_form').on("submit", function(){
//    $("form").not('#id_login_form').on("submit", function(){
        if ($(this).valid()){
            if ($(this).hasClass("js_form_client")){
                var $preloader = $(".js_preloader");
                var $self = $(this);
                var $profile = $("#js_profile_client");
                var url = $(this).attr("action");
                var data = $(this).serialize();
                if ($self.hasClass("js_update_profile")){
                    data = "extra_code=";
                    $self.find("input").each(function(){
                        data += $(this).val();
                    });
                    data +="&extra_email="+localStorage.getItem("email")+"&" + $profile.serialize();
                }
                else if($self.hasClass("js_order_login")){
                    if ($self.hasClass("js_authorize_client")){
                        data = "code=";
                        $self.find("input").each(function(){
                            data += $(this).val();
                        });
                        data +="&email="+localStorage.getItem("email");
                    }
                    data += "&order="+JSON.stringify(order);
                }
                $preloader.show();
                $.post(
                    url,
                    data,
                    function(response){
                        switch (response.status){
                            case "user_are_blocked":
//                                var $client_forms = $("form.js_form_client");
//                                $client_forms.find("input").each(function(){
//                                    $(this).attr('disabled','disabled');
//                                    if (!$(this).hasClass("shell_input_disabled")){
//                                        $(this).addClass("shell_input_disabled");
//                                    }
//                                });
//                                $client_forms.find("a").each(function(){
//                                    $(this).removeAttr("href");
//                                    if (!$(this).hasClass("form_disabled")){
//                                        $(this).addClass("form_disabled");
//                                    }
//                                });
                                var email = localStorage.getItem("email") || "a";
                                if (response.email.toLowerCase() === email.toLowerCase()){
                                    localStorage.setItem("blocked","1")
                                }
                                var href = $self.data("href");
                                $self.data("href","#block_page");
                                $("#shell_blocked_email").text(response.email);
                                $preloader.hide();
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                glob_block_current_client = true;
                                $self.data("href", href);
                                break;
                            case "error_code":
                                if ($self.hasClass("js_update_profile") || $self.hasClass("js_ord_log_pass")){
                                    $self.find("input").each(function(){
                                        if ($(this).hasClass("valid")){$(this).removeClass("valid");}
                                        if (!$(this).hasClass("error")){$(this).addClass("error");}
                                    });
                                }
                                else{
                                    var $code = $self.find("input[name=login_code]");
                                    if ($code.hasClass("valid")){$code.removeClass("valid");}
                                    if (!$code.hasClass("error")){$code.addClass("error");}
                                }
                                break;
                            case "client_not_exist":
                                var $login_email = $self.find("input[name=login_email]");
                                if ($login_email.hasClass("valid")){$login_email.removeClass("valid");}
                                if (!$login_email.hasClass("error")){$login_email.addClass("error");}
                                break;
                            case "client_create":
                                 move_sections($self, animation_ended);
                                setLocalStorage(response);
                                set_profile();
                                $preloader.hide();
                                break;
                            case "email_exist":
                                if ($self.hasClass("js_update_profile")){
                                    $self.find("input").each(function(){
                                        $(this).val("");
                                    });
                                    var mail = $profile.find("input[name=email]");
                                    if (mail.hasClass("valid")){mail.removeClass("valid");}
                                    if (!mail.hasClass("error")){mail.addClass("error");}
                                    transition_in_progress = true;
                                    move_sections($self, animation_ended);
                                }
                                else{
                                    var $email = $self.find("input[name=email]");
                                    if ($email.hasClass("valid")){$email.removeClass("valid");}
                                    if (!$email.hasClass("error")){$email.addClass("error");}
                                }
                                $preloader.hide();
                                break;
                            case "client_update":
                            case "login_success":
                                setLocalStorage(response);
                                set_profile();
                                if (response.status ==="client_update"){
                                     clearInputPassword($self);
                                }
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                $preloader.hide();
                                break;
                            case "order_create":
                                if (response.hasOwnProperty("client")){
                                    setLocalStorage(response);
                                    set_profile();
                                }
                                order = {};
                                transition_in_progress = true;
                                move_sections($self, animation_ended);
                                $preloader.hide();
                                fakeOrder();
                                break;
                            case "form_not_valid":
                                show_alert("form_not_valid");
                                break;
                            case "not_post":
                                show_alert("not_post");
                                break;
                            case "no_order":
                                show_alert("no_order");
                                break;
                        }

                    }
                    ,"json"
                ).always(function(){setTimeout(function(){$preloader.hide();},0)})
                    .error(function (xhr, ajaxOptions, thrownError){
                        console.log("xhr: ", xhr);
                        console.log("ajaxOptions: ", ajaxOptions);
                        console.log("thrownError: ", thrownError);
                    show_alert("Server is not responding");
                });
            }
            else{
                transition_in_progress = true;
                move_sections($(this), animation_ended);
            }
        }
        return false;
    });
    $("form").each(function(){
        $(this).attr("action", glob_url+"client/create/");
        if($(this).hasClass("js_update_profile")){$(this).attr("action", glob_url+"client/update/")}
        else if ($(this).hasClass("js_form_login")){ $(this).attr("action", glob_url+"client/login/"); }
        else if ($(this).hasClass("js_order_login")){ $(this).attr("action", glob_url+"order/create/"); }
        $(this).validate({
            onKeyup : true,
            onSubmit: true,
            rules: {
                card_number: {
                    required: true,
                    creditcard: true
                },
                card_mrd: {
                    required:true,
                    digits: true
                },
                card_ar: {
                    required:true,
                    digits: true,
                    minlength: 2
                },
                card_cvs: {
                    required:true,
                    digits: true,
                    minlength: 3
                },
                email: {
                    required:true,
                    english_email: true
//                    email: true
                },
                first_name: {
                    required:true
                },
                last_name: {
                    required:true
                },
                address: {
                    required:true
                },
                phone: {
                    required:true,
                    digits: true
                },
                login: {
                    required:true
                },
                password_1: {
                    required:true,
                    digits: true
                },
                password_2: {
                    required:true,
                    digits: true
                },
                password_3: {
                    required:true,
                    digits: true
                },
                password_4: {
                    required:true,
                    digits: true
                },
                code:{
                    required: true,
                    digits: true,
                    maxlength: 4,
                    minlength: 4
                },
                by_post: {
                    required: true
                },
                login_code:{
                    required: true,
                    digits: true,
                    maxlength: 4,
                    minlength: 4
                },
                login_email: {
                    required:true,
                    english_email: true
                },
                free_email:{
                    required:true,
                    english_email: true
                }
            },
            errorPlacement: function(error, element) { }
        })
    });
    if($(".sl_load_bar").length){
        $(".sl_load_bar").on('animationend mozanimationend webkitAnimationEnd oAnimationEnd msanimationend', function () {
            $(".show_top_index").removeClass("show_top_index");
            move_sections($(this), animation_ended);
        });
    }
    $(document).on(glob_event, ".js_button_click", function(event){
        if(!transition_in_progress) {
//            if ($(this).hasClass("js_search_stations")){
//                search_stations($(this));
//            }
            // display error when client not check  washing_type
            if($(this).hasClass("js_no_washing_type")){
                if(!$(this).hasClass("shell_error")){
                    $(this).addClass(("shell_error"));
                }
                $(this).on("webkitAnimationEnd", function(){
                    if($(this).hasClass("shell_error")){
                        $(this).removeClass("shell_error");
                    }
                });
                return false;
            }
            if($(this).hasClass("js_order_done")){
                clearInterval(dots);
                var $self = $(this);
                $(".js_waiting").each(function(){
                    if (!$(this).hasClass("js_dot_wait")){
                        $(this).addClass("js_dot_wait");
                    }
                });
                    $(".js_order_status").delay(2000).each(function(){
                        if (!$(this).hasClass("hidden_elem")){
                            $(this).addClass("hidden_elem");
                        }
                    });
                transition_in_progress = true;
                move_sections($(this), animation_ended);
            }
            // display error if no have goe location
            if($(this).hasClass("js_no_geolocation")){
                    var $wash_station = $(".js_wash_station").closest(".js_wash_station_parent");
                    if (!$wash_station.hasClass("shell_error")){
                        $wash_station.addClass("shell_error");
                    }
                    $wash_station.on("webkitAnimationEnd", function(){
                        if ($wash_station.hasClass("shell_error")){
                            $wash_station.removeClass("shell_error");
                        }
                    });
                return false;
            }
            if ($(this).hasClass("js_create_order")){
                var washing_id = $(this).data("washing_id");
                if(!washing_id){
                    //TODO: Need to add custom alert
                    show_alert("Wrong washing type");
                    move_sections($(elem).closest("section"), animation_ended);
                    return false;
                }
                 start_order($(this),washing_id);
            }
            if($(this).hasClass("js_animate_rotation")){
                transition_in_progress = true;
                var rotate_to = $(this).data("rotation") ? $(this).data("rotation") : "";
                if(!$(this).parents(".sl_wheel_segments").hasClass(rotate_to)) {
                    var click_target = $(this);
                    $(this).parents(".sl_wheel_segments").addClass(rotate_to);
                    $(this).parents(".sl_wheel_segments").on('animationend mozanimationend webkitAnimationEnd oAnimationEnd msanimationend', function () {
                        $(this).off('animationend mozanimationend webkitAnimationEnd oAnimationEnd msanimationend');
                        setTimeout(function(){move_sections(click_target, animation_ended)}, 250);
                    });
                } else {
                    setTimeout(function(){move_sections($(this), animation_ended)}, 250);
                }
            } else if($(this).hasClass("check_form")){
                var form = $(this).closest("form");
                if (!form.hasClass("js_form_client")){
                    form.data({"href": get_href($(this))});
                }
                if ($(this).hasClass("js_update_profile")){
                    if (form.valid()){
                        transition_in_progress = true;
                        move_sections($(this), animation_ended);
                    }
                }
                else{
                    form.submit();
                }
            }

            else {
                transition_in_progress = true;
                move_sections($(this), animation_ended);
            }
        }
        return false;
    });
    slideOn($("section .js_move_to_top"), 0, -900, "top", function(elem, position/*True if callback should be activated only when position of elementis max*/){
        if (!position) {
            if(!$(elem).hasClass("sl_bbtn_next_down") && $(elem).hasClass("js_move_to_top")) $(elem).addClass("sl_bbtn_next_down");
        } else {
            if($(elem).hasClass("sl_bbtn_next_down")) $(elem).removeClass("sl_bbtn_next_down");
        }
    });
    slideOn($("section .js_button_move"), 408, 0, "left", function(elem, position){
        if(position){

            move_sections($(elem), animation_ended)
        }
    });

//    hide_preloader();

    /*.on("mouseup",function(event){
            event.stopPropagation();
            slice = Math.abs(slice - parseInt(event.pageY));
            if (slice > 80)
                if($(this).hasClass("show_offer_animation")){
                    $(this).removeClass("show_offer_animation")
                } else{
                    $(this).addClass("show_offer_animation");
                }
            return false;
        });*/


});

