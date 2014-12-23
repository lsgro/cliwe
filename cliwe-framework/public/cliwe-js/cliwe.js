(function( $ ) {

    var currentCharIndex = 0,
        caretElement = $("<span class='caret'>&#x2038;</span>").css({ "position": "absolute", "color": "blue", top: "-3px" }),
        commandBuffer = [],
        linePrompt = "&gt;&nbsp;",
        options = {};

    $.fn.cliwe = function ( methodOrOptions ) {

        var terminalElem = this,
            container = this.parent(),
            methods = {
                setLinePrompt: setLinePrompt,
                resetCommandBuffer: resetCommandBuffer,
                appendToCommandBuffer: appendToCommandBuffer,
                dump: dump,
                setMenu: setMenu,
                callObjectMethod: callObjectMethod
            };

        if ( methods[ methodOrOptions ]) {

            return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ) );

        } else {
            options = $.extend( {}, $.fn.cliwe.defaultOptions, methodOrOptions );

            $(document).on("keypress", processKey);
            $(document).on("keydown", processSpecialKey);

            setBlink(caretElement, 500);

            putPrompt(newLine());
        }

        // public methods

        function setLinePrompt(prompt) {
            linePrompt = prompt;
            return this;
        }

        function resetCommandBuffer() {
            commandBuffer = [];
            return this;
        }

        function appendToCommandBuffer( fragment ) {
            for (var i = 0; i < fragment.length; i++) {
                processChar(fragment.charCodeAt(i));
            }
            return this;
        }

        function dump( html ) {
            var result = $("<div class='cliwe-result'></div>").append(html);
            terminalElem.append(result);
        }

        function setMenu( html ) {
            $("menuItem", html).each(function() {
                // TODO display completion
            });
        }

        function callObjectMethod (id, method) {
            var methodArguments = Array.prototype.slice.call(arguments, 2),
                argumentsFragment = "";
            for (var i = 0; i < methodArguments.length - 1; i++) {
                argumentsFragment += methodArguments[i] + ","
            }
            if (methodArguments.length > 0) {
                argumentsFragment += methodArguments[methodArguments.length - 1];
            }
            appendToCommandBuffer(id + "." + method + "(" + argumentsFragment + ")\n");
        }

        // private methods

        function processKey(event) {
            if (event.target.tagName === "BODY") {
                var charCode = event.which;
                processChar(charCode === 13 ? 10 : charCode); // convert '\r' to '\n'
                event.preventDefault();
            }
        }

        function processChar(charCode) {
            if (charCode === 10) {
                processCommandBuffer(true); // external callback will dump command output and result, and change prompt
                var line = newLine();
                putPrompt(line);
            } else {
                var character;
                if (charCode == 32) {
                    character = "&nbsp;";
                } else {
                    character = String.fromCharCode(charCode);
                }
                putChar(character, getLastLine());
                processCommandBuffer();
            }
        }

        function processSpecialKey(event) {
            if (event.target.tagName === "BODY") {
                if (event.keyCode === 8) { // backspace
                    removeCurrentChar();
                    event.preventDefault();
                    processCommandBuffer();
                }
                else if (event.keyCode === 37) { // arrow left
                    moveLeft();
                    event.preventDefault();
                }
                else if (event.keyCode === 39) { // arrow right
                    moveRight();
                    event.preventDefault();
                }
                else if (event.keyCode === 9) {
                    event.preventDefault();
                }
            }
        }

        function processCommandBuffer(endOfLine) {
            var commandFragment = joinBufferLines(commandBuffer) + (endOfLine ? "\n" : "");
            processCommand(commandFragment);
        }

        function joinBufferLines(buffer) {
            var fragment = "";
            for (var line = 0; line < buffer.length; line++) {
                fragment += convertBufferLineToText(buffer[line]);
                if (line < buffer.length - 1) { // more lines available
                    fragment += "\n";
                }
            }
            return fragment;
        }

        function convertBufferLineToText(domLine) {
            var lineText = "",
                charSpans = domLine.children("span.cliwe-char").toArray();
            for (var pos = 0; pos < charSpans.length; pos++) { // skip line prompt
                if (charSpans[pos].childNodes.length > 0) {
                    var c = charSpans[pos].childNodes[0].nodeValue;
                    if (c == "&nbsp;") {
                        lineText += " ";
                    } else {
                        lineText += c;
                    }
                }
           }
            return lineText;
        }

        function putChar(c, line) {
            var lineChars = line.children(),
                newChar = $("<span class='cliwe-char'>" + c + "</span>");
            if (lineChars.size() <= currentCharIndex) {
                line.append(newChar);
                setCurrentCharIndex(lineChars.size());
            } else {
                lineChars.eq(currentCharIndex).after(newChar);
                setCurrentCharIndex(currentCharIndex + 1);
            }
        }

        function moveLeft() {
            if (currentCharIndex > 1) {
                setCurrentCharIndex(currentCharIndex - 1);
            }
        }

        function moveRight() {
            if (getCurrentCharSpan().next().length > 0) {
                setCurrentCharIndex(currentCharIndex + 1);
            }
        }

        function removeCurrentChar() {
            if (currentCharIndex > 1) {
                var current = getCurrentCharSpan();
                if (current.size() > 0) {
                    current.remove();
                    setCurrentCharIndex(currentCharIndex - 1);
                }
            }
        }

        function putPrompt(line) {
            line.append("<span class='cliwe-prompt'>" + linePrompt + "</span>");
            setCurrentCharIndex(1);
        }

        function getLastLine() {
            return terminalElem.children(".cliwe-line").last();
        }

        function getCurrentCharSpan() {
            return getLastLine().children().eq(currentCharIndex);
        }

        function newLine() {
            var line = $("<div></div>").addClass("cliwe-line cliwe-medium");
            terminalElem.append(line);
            caretElement.detach();
            line.append(caretElement);
            commandBuffer.push(line);
            return line;
         }

        function setCurrentCharIndex(charIndex) {
            currentCharIndex = charIndex;
            var caretLeft;
            if (currentCharIndex > 1) {
                caretLeft = getCurrentCharSpan().position().left + 10;
            } else {
                caretLeft = 15;
            }
            caretElement.css({left: caretLeft});
            terminalElem.scrollTop($(container).height());
        }

        function setBlink(element, period) {
            element.fadeToggle(period, function () {
                setBlink(element, period);
            });
        }

        function processCommand(cb) {
            $.ajax({
                type: "POST",
                url: options.serverUrl,
                data: { commandBuffer: cb },
                async: false,
                cache: false,
                timeout: 30000,
                error: function(){
                    return true;
                },
                success: handleResponse
            });
        }

        function handleResponse(html) {
            var response = $(html);
            if (response.is("menu")) {
                terminalElem.cliwe('setMenu', response);
            }
            if (response.is("div")) {
                terminalElem.cliwe('dump', response);
                terminalElem.cliwe('resetCommandBuffer');
                terminalElem.cliwe('setLinePrompt', '>&nbsp;');
            } else {
                terminalElem.cliwe('setLinePrompt', '|&nbsp;');
            }
        }


    };

    $.fn.cliwe.defaultOptions = {
        serverUrl: "/cliweb"
    };

})( jQuery );