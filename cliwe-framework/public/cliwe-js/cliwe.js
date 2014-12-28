(function( $ ) {

    // this plugin can only be used as a singleton currently - global variables shared by any instance of cliwe
    var currentCharIndex = 0,
        caretElement = $("<span class='cliwe-caret'>&#x2038;</span>").css({ "position": "absolute", "color": "blue", top: "-3px" }),
        commandBuffer = [],
        linePrompt = "&gt;&nbsp;",
        completions = [],
        completionDialog = null,
        selectedCompletionIndex = -1,
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
            completions.length = 0;
            $("menuItem", html).each(function() {
                var item = $(this);
                completions.push({ fragment: item.text(), offset: item.attr("data-insert-offset") });
            });
            if (completionDialog !== null) {
                updateCompletionDialog();
            }
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

        function commandBufferIsEmpty() {
            return commandBuffer.length === 0 || commandBuffer.length === 1 && commandBuffer[0].find(".cliwe-char").length === 0
        }

        function processKey(event) {
            if (event.target.tagName === "BODY" && !event.ctrlKey) {
                var charCode = event.which;
                if (completionDialog !== null && charCode === 13) {
                    if (selectedCompletionIndex > -1) {
                        appendCompletionToCommandBuffer();
                    }
                    killCompletionDialog();
                } else {
                    processChar(charCode === 13 ? 10 : charCode); // convert '\r' to '\n'
                }
                event.preventDefault();
            }
        }

        function processSpecialKey(event) {
            if (event.target.tagName === "BODY") {
                switch (event.keyCode) {
                    case 32: // space + ctrl
                        if (event.ctrlKey) {
                            if (completionDialog === null) {
                                showCompletionDialog();
                            }
                        }
                        break;
                    case 8: // backspace
                        removeCurrentChar();
                        event.preventDefault();
                        processCommandBuffer();
                        break;
                    case 37: // arrow left
                        moveLeft();
                        event.preventDefault();
                        break;
                    case 39: // arrow right
                        moveRight();
                        event.preventDefault();
                        break;
                    case 9: // tab
                        event.preventDefault();
                        break;
                    case 38: // arrow up
                        if (completionDialog !== null) {
                            completionUp();
                        }
                        event.preventDefault();
                        break;
                    case 40: // arrow down
                        if (completionDialog !== null) {
                            completionDown();
                        }
                        event.preventDefault();
                        break;
                    case 27: // ESC
                        if (completionDialog !== null) {
                            killCompletionDialog();
                            event.preventDefault();
                        }
                        break;
                }
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

        function processCommandBuffer(endOfLine) {
            var text = commandBufferText(),
                commandFragment = text + (endOfLine ? "\n" : "");
            processCommand(commandFragment);
        }

        function commandBufferText() {
            var fragment = "";
            for (var line = 0; line < commandBuffer.length; line++) {
                fragment += convertBufferLineToText(commandBuffer[line]);
                if (line < commandBuffer.length - 1) { // more lines available
                    fragment += "\n";
                }
            }
            return fragment;
        }

        function convertBufferLineToText(domLine) {
            var lineText = "",
                charSpans = getCharSpans(domLine);
            for (var pos = 0; pos < charSpans.length; pos++) { // skip line prompt
                if (charSpans[pos].childNodes.length > 0) {
                    var c = charSpans[pos].innerHTML;
                    if (c === "&nbsp;") {
                        lineText += " ";
                    } else {
                        lineText += c;
                    }
                }
            }
            return lineText;
        }

        function getCharSpans(domLine) {
            return domLine.children("span.cliwe-char").toArray();
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
            completions.length = 0;
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

        // completion dialog
        function showCompletionDialog() {
            if (commandBufferIsEmpty()) {
                processCommand("");
            }
            var completionOffset = caretElement.offset(),
                completionLeft = completionOffset.left,
                dialogTopIfBelow = completionOffset.top + 25, // TODO hardcoded line height
                dialogBottomIfAbove = $(container).height() - completionOffset.top,
                dialogHeight = Math.min(completions.length, options.completionLineNumber) * options.completionLineHeight;
            buildCompletionDialog(completions);
            switch (calculateDialogPosition(dialogHeight, dialogTopIfBelow, dialogBottomIfAbove)) {
                case 'below':
                    completionDialog.css({ left: completionLeft, top: dialogTopIfBelow, height: dialogHeight });
                    break;
                case 'above':
                    completionDialog.css({ left: completionLeft, bottom: dialogBottomIfAbove, height: dialogHeight });
            }
            terminalElem.append(completionDialog);
        }

        function updateCompletionDialog() {
            var dialogHeight = Math.min(completions.length, options.completionLineNumber) * options.completionLineHeight;
            setCompletionsInDialog(completions, completionDialog);
            completionDialog.css({ height: dialogHeight });
        }

        function calculateDialogPosition(dialogHeight, dialogTopIfBelow, dialogBottomIfAbove) {
            var documentHeight = $(container).height(),
                marginIfBelow = documentHeight - dialogTopIfBelow - dialogHeight,
                marginIfAbove = documentHeight - dialogBottomIfAbove - dialogHeight;
            if (marginIfBelow < 0 && marginIfAbove > marginIfBelow) return 'above';
            return 'below';
        }

        function buildCompletionDialog() {
            selectedCompletionIndex = -1;
            completionDialog = $("<div class='cliwe-completions'></div>");
            setCompletionsInDialog(completions, completionDialog);
        }

        function setCompletionsInDialog() {
            completionDialog.empty();
            for (var i = 0; i < completions.length; i++) (function(i) {
                var completionLine = $("<div class='cliwe-completion'></div>");
                completionLine.text(completions[i].fragment);
                completionLine.css({ height: options.completionLineHeight });
                completionLine.click(function() {
                    setCompletionSelected(i);
                    appendCompletionToCommandBuffer();
                    killCompletionDialog();
                });
                completionDialog.append(completionLine);
            })(i)
        }

        function appendCompletionToCommandBuffer() {
            var selectedCompletion = completions[selectedCompletionIndex];
            for (var i = 0; i < selectedCompletion.offset; i++) {
                removeCurrentChar();
            }
            appendToCommandBuffer(selectedCompletion.fragment);
        }

        function killCompletionDialog() {
            completionDialog.remove();
            completionDialog = null;
        }

        function completionUp() {
            var completionNumber = completions.length,
                index;
            if (selectedCompletionIndex === -1) {
                index = completionNumber - 1;
            } else {
                index = (selectedCompletionIndex + completionNumber - 1) % completionNumber;
            }
            setCompletionSelected(index);
        }

        function completionDown() {
            var index = (selectedCompletionIndex + 1) % completions.length;
            setCompletionSelected(index);
        }

        function setCompletionSelected(index) {
            var completionElements = completionDialog.children("div.cliwe-completion"),
                selectedCompletionElement = completionElements.eq(index);
            if (selectedCompletionElement !== undefined) {
                selectedCompletionIndex = index;
                completionElements.removeClass("cliwe-selected");
                selectedCompletionElement.addClass("cliwe-selected");
            } else {
                console.error("Trying to set completion number: " + index + "/" + completionElements.length);
            }
            adjustCompletionDialogScroll();
        }

        function adjustCompletionDialogScroll() {
            var scrollTop = completionDialog.scrollTop(),
                selectionTop = selectedCompletionIndex * options.completionLineHeight,
                selectionBottom = selectionTop + options.completionLineHeight,
                overflowTop = scrollTop - selectionTop,
                overflowBottom = selectionBottom - completionDialog.height() - scrollTop;
            if (overflowTop > 0) {
                completionDialog.scrollTop(selectionTop);
            } else if (overflowBottom > 0) {
                completionDialog.scrollTop(scrollTop + overflowBottom);
            }
        }
    };

    $.fn.cliwe.defaultOptions = {
        serverUrl: "/cliweb",
        completionLineNumber: 10,
        completionLineHeight: 16
    };

})( jQuery );

