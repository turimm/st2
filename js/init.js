/**
 * Created with PyCharm.
 * User: turim
 * Date: 13.03.13
 * Time: 15:40
 * To change this template use File | Settings | File Templates.
 */

document.ontouchmove =  function(e){
    e.preventDefault();
}
var station = null;
var transition_in_progress = false;
var login = false;
var order = null;
var profile = {};
/*Codes for order state*/
var ORDER_IN_PROCESS = 1,
    ORDER_PPAYMENT_DONE = 2,
    ORDER_WORK_STARTED = 3,
    ORDER_WORK_ENDED = 4;

function onResume(){
    activate_position();
}

function onLoad(){
    if (!DEBUG_MODE){
        document.addEventListener("deviceready", onDeviceReady, false);
    } else {
        if (typeof navigator.device == undefined){
            document.addEventListener("deviceready", onDeviceReady, false);
        } else {
            onDeviceReady();
        }
    }
}

function onDeviceReady() {
    activate_position();
    document.addEventListener("resume", onResume, false);
}

/********************Work with position of user*****************************/
function successFunction(position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    console.log("Connect to server");
    $.get(
        "http://shell.d1.wmtcloud.tk/shell/?lat=" + lat + "&lon=" + lng,
        function(response){
            console.log("Response", response);
            if (response.length){
                station = response[0];
                $(".js_wash_station").html(station.city + ", "+station.address+ ", "+station.title );
                $(".js_washer_types_list").html(render_to('templates/list_of_washing_types.html', {station: station}));
                $(".sl_wrap").append(render_to('templates/washing_type_description.html', {station: station}))

            } else {
                $(".js_wash_station").html("Kan ikke forbinde til server");
            }
        }
        ,"json"
    ).error(function(){$(".js_wash_station").html("Kan ikke forbinde til server");});
}

//TODO: NEED TO UPDATE TEXTS AND PLACES
function errorFunction(err) {
    if(err.code == 1) {
        $(".js_wash_station").html("Kan ikke forbinde til server");
    }else if( err.code == 2) {
        $(".js_wash_station").html("Position is unavailable!");
    }
}

function activate_position() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(successFunction, errorFunction);
    }
}

function timer(elem, timer/*Seconds*/, callback/*What to do after timer stopped*/){
    var start_time = new Date(),
        elem = elem,
        timer = timer,
        callback = callback||function(){};
    function show_left_time(){
        var delta = (timer - parseInt((new Date() - start_time)/1000)), minutes, seconds;

        if (delta > 0){
            minutes = parseInt((delta/60));
            seconds = delta - (minutes * 60);
            elem.html(minutes + ":" + ((seconds < 10) ? ("0" + seconds) : seconds));
            setTimeout(show_left_time, 1000);
        } else {
            minutes = parseInt((delta/60));
            seconds = delta - (minutes * 60);
            elem.html(minutes + ":" + ((seconds < 10) ? ("0" + seconds) : seconds));
            callback();
        }
    }
    setTimeout(show_left_time, 1000);
}
function slideOn(cur_elem, cur_limit_max, cur_limit_min, cur_axis, cur_callback ){
    var elem = cur_elem,
        limit_max = (typeof cur_limit_max != 'undefined') ? cur_limit_max: 0,
        limit_min = (typeof cur_limit_min != 'undefined') ? cur_limit_min: (-900),
        axis = cur_axis || "top",
        callback_if_max_position = (typeof callback_if_max_position!= 'undefined' ? callback_if_max_position : true),
        callback = cur_callback||function(){},
        style = {};
        $(elem).draggable({
            scroll:false,
            axis: (axis == "top" ? "y" : "x"),
            handle: ".js_move_to_top",
            grid: [25,25],
            start:function (event, ui) {
                if($(elem).removeClass("js_show_offer_information")){
                    $(elem).removeClass("js_show_offer_information").css({
                        "-webkit-animation": ""
                    });

                }
            },
            drag:function (event, ui) {
                if (ui.position[axis]> limit_max){
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
    var href = get_href($(elem));
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
        var move_to_class = activate_section.hasClass("js_dissable") ? "js_pushed": "js_dissable"
        parent_section.removeClass("js_activate").addClass(move_to_class);
        if(activate_section.hasClass("disable_form_elements")) {
            activate_section.removeClass("disable_form_elements")
        }
        activate_section.removeClass(activate_section.hasClass("js_dissable") ? "js_dissable" : "js_pushed").addClass("js_activate");
    } else {
        transition_in_progress = false;
    }
    activate_method(elem);
    callback(elem);
}
function animation_ended(elem){
    var was_rotated = $(elem).data("rotation") ? $(elem).data("rotation") : null;
    $('section').on('webkitTransitionEnd moztransitionend transitionend oTransitionEnd', function () {
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
    console.log(elem)
    var variable = variable | null;
    var method = $(elem).data("method") ? $(elem).data("method") : null;
    var variable = $(elem).data("variable") ? $(elem).data("variable") : null;
    try {
        console.log(method);
        method = eval(method);
        method(elem, variable);
    } catch (e) {}
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
            $(".js_process_description").text("PROCESS - UNDERVOGNSSKYL");//TO DO: Should be changed in the future to context variable
            timer($(".js_wash_timer"), 300, function(){
                $(".js_time_wash").removeClass("show_time_to_wash");
                $(".js_process_description").text("VASK AFSLUTTET");
            });
        }
        setTimeout(function(){
            var animate_it = $("section[data-page=#home] .js_move_to_top");
            animate_it.addClass("js_show_offer_information").css({
                "-webkit-animation": "show_it .5s ease-in 1 forwards"
            });
            setTimeout(function(){
                if(animate_it.hasClass("js_show_offer_information")) {
                    animate_it.removeClass("js_show_offer_information").css({
                        "-webkit-animation": "hide_it .5s ease-in 1 forwards"
                    });
                }
            }, 2000);
        }, 300);
        $("form").not(".should_not_be_reseted").each(function(){
           $(this)[0].reset();
        });
    }
}
function show_offer(elem){
    $(".offer_information").parent().css({"display": "block"})
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
    });
    return strReturn;
}

function update_profile(elem, finish_profile){
    var form = (elem).closest("section").find("form");
    form.find("input, textarea").each(function(){
       console.log($(this).attr("name"));
       if($(this).attr("name")){
           profile[$(this).attr("name")] = $(this).is("[type=checkbox]") ? $(this).is(":checked"): $(this).val();
       }
    });
    if(finish_profile){
        //TODO: Need to send profile to server and set cookies
        console.log(profile);
    }
}
/********************************************/
/*                   Ordering functions     */
/********************************************/

function start_order(elem, variable){
    if(!variable){
        //TODO: Need to add custom alert
        console.log("Wrong washing type")
        move_sections($(elem).closest("section"), animation_ended);
        return false;
    }
    $(".js_back_button_to_washing_description").data({"href": $(elem).closest("section").data("page")})
    order = {};
    order["washer_id"] = variable;
    order["type"] = ORDER_IN_PROCESS;
    for(var washing_key in station.washing_types){
        var washing_type = station.washing_types[washing_key];
        if(washing_type.washing_id == order["washer_id"]){
            order["price"] = washing_type.cost;
            break;
        }
    }
//    if(!profile.hasOwnProperty("code")){
//        if($(".js_login_button").hasClass("js_button_click")){
//            $(".js_login_button").removeClass("js_button_click")
//            if (!$(".js_login_button").hasClass("sl_btn_dissabled"))
//                $(".js_login_button").addClass("sl_btn_dissabled");
//        }
//    } else {
//        if(!$(".js_login_button").hasClass("js_button_click")){
//            $(".js_login_button").addClass("js_button_click")
//            if ($(".js_login_button").hasClass("sl_btn_dissabled"))
//                $(".js_login_button").removeClass("sl_btn_dissabled");
//        }
//    }
}



$(document).ready(function(){
    simulateTouchEvents(".js_move_to_top, .js_button_move");
    $("section[data-page=#home] .js_move_to_top").on('animationend mozanimationend webkitAnimationEnd oAnimationEnd msanimationend', function () {
        if($(this).hasClass("sl_bbtn_next_down")){
            $(this).removeClass("sl_bbtn_next_down");
        }else{
            $(this).addClass("sl_bbtn_next_down");
        }
    });
    $("form").on("submit", function(){
        if ($(this).valid()){
            transition_in_progress = true;
            move_sections($(this), animation_ended);
        }
        return false;
    });

    $("form").each(function(){
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
                    email: true
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
                password:{
                    required: true,
                    digits: true,
                    maxlength: 4,
                    minlength: 4
                },
                postnumber: {
                    required: true
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
    $(document).on("click", ".js_button_click", function(event){
        if(!transition_in_progress) {

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
                var form = $(this).parents("form");
                form.data({"href": get_href($(this))})
                form.submit();
            } else {
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
        if(position) move_sections($(elem), animation_ended)
    });

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
