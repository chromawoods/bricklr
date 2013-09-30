/**!
 * bricklr - yep, it creates bricks
 * @author Andreas Larsson, http://chromawoods.com
 */
(function (win, $) {
    win.bricklr = function (opts) {

        // Private vars/config
        var 
            startTime = new Date().getTime(),
                    
            status = {
                init : 'initializing',
                idle : 'idle',
                flip : 'flipping'
            },

            currStatus = status.init,
            enableLogging = true, // Function out will keep quiet if this is false.
            brickClass = 'bricklr-brick',
            targetClass = 'bricklr-target',

            flip = { // List of possible flipping orderings.
                rand : 'random',
                lrtd : 'leftRightTopDown'
            },

            effects = { // List of possible flipping effects.
                fade : 'fade',
                slide : 'slide',
                none : 'none'
            },

            defaults = {
                target : 'body', // Will cover the entire viewport regardless of body dimensions.
                brickW : 100,
                brickH : 100,
                opacity : 1,
                behavior : flip.rand,
                delay : 200,
                effect : effects.fade,
                effectDuration : 400,
                brickBg : 'random', // Can be a hex color string or any of the color.variants members.
                repeat : false, // When all bricks are flipped, we can start over.
                debugElem : '#bricklr-debug',
                onBricksCreated : false // Callback for when all bricks have been created (but not yet displayed).
            },

            // Assemble settings.
            s = (function (d) {
                var original;
                
                for (var i in opts) {
                    if (d.hasOwnProperty(i) && opts.hasOwnProperty(i)) {
                        d[i] = opts[i];
                    }
                }
                
                // jQueryfy some stuff.
                d.selector = d.target;
                original = $(d.target).css('position', 'relative'); // Ensure relative position.
                
                // Create a ghost element on which to draw the bricks.
                d.target = $('<div/>', {
                    'class' : targetClass,
                    css : {
                        width : original.outerWidth(),
                        height : original.outerHeight(),
                        position: 'absolute',
                        top : 0,
                        left : 0,
                        background : 'transparent',
                        overflow : 'hidden',
                        'z-index' : 9999999
                    }
                }).appendTo(original);
                
                d.debugElem = $(d.debugElem);
                d.fillWindow = d.target[0].nodeName.toLowerCase() === 'body';
                return d;
            })(defaults),

            // Find out where target area coordinates are.
            startPos = (function (fill, adjust) {
                if (adjust && !fill) {
                    return { x : s.target.offset().left, y : s.target.offset().top };
                } else {
                    return { x : 0, y : 0 };
                }
            }(s.fillWindow, s.target.css('position') === 'static'));

        // Just a shorthand logging function, keeps silent if enableLogging = false.
        // If there's a #bricklr-debug elem on the page, it will log there too 
        // unless there's a specific debugElem for the current target.. Awesome!
        var out = function (msg, severity) {
            if (enableLogging) {
                severity = severity || 'log';
                msg = '[Bricklr][target:' + s.selector + '] ' + msg;
                console[severity](msg);
                if (s.debugElem.length) {
                    msg += '\n' + s.debugElem.text().substring(0, 3096);
                    s.debugElem.text(msg);
                }
            }
        };

        // This object holds functions related to color, obviously.
        var color = {
            lightness : '00',
            solid : null, // This will be set later.

            // Returns a hex section with leading zero.
            getRandomSection : function () {
                var hex = Math.floor(Math.random() * 255).toString(16);
                if (hex.length < 2) { return '0' + hex; }
                else { return hex; }
            }
        };

        // These will return a random color, but only within their respective spectrum (except member "random" of course).
        color.variants = {
            redish : function () { return '#' + color.getRandomSection() + color.lightness + color.lightness; },
            greenish : function () { return '#' + color.lightness + color.getRandomSection() + color.lightness; },
            blueish : function () { return '#' + color.lightness + color.lightness + color.getRandomSection(); },
            yellowish : function () { var c = color.getRandomSection(); return '#' + c + c + color.lightness; },
            purplish : function () { var c = color.getRandomSection(); return '#' + c + color.lightness + c; },
            greyscalish : function () { var c = color.getRandomSection(); return '#' + c + c + c; },
            random : function () { return (function(h){ return '#000000'.substr(0,7 - h.length) + h; })((~~(Math.random() * (1<<24))).toString(16)); }
        };

        // Returns a hex color based on the existance of clr in the variants.
        color.get = function (clr) {
            if (color.variants[clr]) {
                s.target.bgSolid = false;
                return color.variants[clr];
            } else {
                s.target.bgSolid = true;
                return clr;
            }
        };

        // Just updates the status var.
        var setStatus = function (newStatus) {
            currStatus = newStatus;
            out('Status: ' + currStatus + '.');
        };

        // Returns an array containing objects representing the bricks.
        var getBricks = function () {
            var bs = [], xPos = 0, yPos = 0, 
                iw = s.fillWindow ? win.innerWidth : s.target.width(),
                ih = s.fillWindow ? win.innerHeight : s.target.height(),
                bricksX = Math.ceil(iw / s.brickW),
                bricksY = Math.ceil(ih / s.brickH),
                bricksTot = bricksX * bricksY,
                bg = color.get(s.brickBg);
        
            for (var i = 0; i < bricksTot; i++) {
                if (i && i % bricksX === 0) {
                    xPos = 0;
                    yPos++;
                } else if(i) {
                    xPos++;
                }
                bs.push({
                    x : xPos,
                    y : yPos,
                    elem : $('<div/>', { // Prepare an HTML element representing a brick.
                        'class' : brickClass,
                        id : brickClass + i,
                        css : {
                            display : 'none',
                            margin : 0,
                            padding : 0,
                            border : 'none',
                            position : 'absolute',
                            left : startPos.x + (xPos * s.brickW) + 'px',
                            top : startPos.y + (yPos * s.brickH) + 'px',
                            width : s.brickW + 'px',
                            height : s.brickH + 'px',
                            opacity : s.opacity,
                            background : s.target.bgSolid ? bg : color.get(s.brickBg)
                        }
                    })
                });
            }
            out('getBricks created ' + bs.length + ' bricks.');
            !!(typeof s.onBricksCreated === 'function') && s.onBricksCreated(bs);
            return bs;
        };

        // Iterate the bricks and inject them.
        var drawAll = function () {
            var bricks, len, i = 0, flipIndex = i, r = (s.behavior === flip.rand);

            if (!s.target.data('bricks')) { // Only create bricks if we have to.
                s.target.data('bricks', getBricks());
            }

            bricks = s.target.data('bricks').slice(0); // Make a copy of the array.
            len = bricks.length;

            // Will call itself until all bricks have been flipped.
            var handleNext = function () {
                flipIndex = r ? Math.floor(Math.random() * bricks.length) : i;

                // Inject the brick and show it using the specified effect.
                (function handleShow (el, callback) {
                    switch (s.effect) {
                        case effects.fade : 
                            el.fadeIn(s.effectDuration, function () {
                                callback($(this).data('index'));
                            });
                            break;
                        case effects.slide :
                            el.slideDown(s.effectDuration, function () {
                                callback($(this).data('index'));
                            });
                            break;
                        default : el.show(); callback(el.data('index'));
                    }
                }(bricks[flipIndex].elem.data('index', i).appendTo(s.target), function (index) {
                    if(index === len - 1) {
                        // Last brick has finished, fire custom event.
                        s.target.trigger('lastFlipComplete');
                    }
                }));

                bricks.splice(flipIndex, r ? 1 : 0); // Only remove the array brick if we're in random mode.
                i++;
                out('Handled brick ' + i + ' of ' + len + '.');

                if (i < len) { // There are still bricks to handle..
                    setTimeout(function () {
                        handleNext();
                    }, s.delay);
                } else {
                    out('All ' + i + ' bricks handled.');
                    setStatus(status.idle);
                }
            };

            if (currStatus === status.idle) {
                out('Will begin drawing bricks now.');
                setStatus(status.flip);
                handleNext();
            } else {
                out('Will not draw bricks because status is: ' + currStatus + '.');
            }
        };
        
        var attachEvents = function () {
            // Don't check repeat until the last brick has completely finished its effect.
            s.target.on('lastFlipComplete', function () {
                var ch = s.target.children('.' + brickClass);
                
                if (s.repeat) { // Clean up previous bricks and start over.
                    out('lastFlipComplete - will repeat.');

                    ch.fadeOut(s.effectDuration).promise().done(function () {
                        var bricks, len;
                        ch.remove();
                        if (!s.target.bgSolid) { // Generate new colors.
                            out('Will generate new brick colors.');
                            bricks = s.target.data('bricks');
                            len = bricks.length;
                            for (var i = 0; i < len; i++) {
                                bricks[i].elem.css('background', color.get(s.brickBg));
                            }
                        }
                        drawAll();
                    });

                }
            });
        };

        // Ready for action.
        var elapsedTime = new Date().getTime();
        out('Loaded in ' + (elapsedTime - startTime) + 'ms.');
        setStatus(status.idle);

        // Kick things off!
        if (s.target.length > 1) { // Multiple targets - we need to run a bricklr for each of them.
            s.target.each(function (index) {
                var newClass = 'bricklr-target-' + index,
                    newSettings = s;
                
                $(this).addClass(newClass);
                newSettings.target = '.' + newClass;
                bricklr(newSettings);
            });
        } else { // Only one target - draw it.
            attachEvents();
            drawAll();
        }

    };
}(this, jQuery));