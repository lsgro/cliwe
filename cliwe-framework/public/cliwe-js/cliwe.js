(function( $ ) {

    // this plugin can only be used as a singleton currently - global variables shared by any instance of cliwe
    var currentCharIndex = 0,
        caretElement = $("<span class='caret'>&#x2038;</span>").css({ "position": "absolute", "color": "blue", top: "-3px" }),
        commandBuffer = [],
        linePrompt = "&gt;&nbsp;",
        suggestions = [],
        suggestionDialog = null,
        selectedSuggestionIndex = -1,
        keywordSeparatorRegex = /\s*\W\s*/,
        lastKeywordFragment = "",
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
            lastKeywordFragment = "";
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
            suggestions.length = 0;
            $("menuItem", html).each(function() {
                var item = $(this);
                suggestions.push({ fragment: item.text(), offset: item.attr("data-insert-offset") });
            });
            if (suggestionDialog !== null) {
                updateSuggestionDialog();
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

        function processKey(event) {
            if (event.target.tagName === "BODY") {
                var charCode = event.which;
                if (suggestionDialog !== null && charCode === 13) {
                    if (selectedSuggestionIndex > -1) {
                        appendSuggestionToCommandBuffer();
                    }
                    killSuggestionDialog();
                } else if (charCode === 0 && event.ctrlKey === true) {
                    if (suggestionDialog === null) {
                        showSuggestionDialog();
                    }
                } else {
                    processChar(charCode === 13 ? 10 : charCode); // convert '\r' to '\n'
                }
                event.preventDefault();
            }
        }

        function processSpecialKey(event) {
            if (event.target.tagName === "BODY") {
                switch (event.keyCode) {
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
                        if (suggestionDialog !== null) {
                            suggestionUp();
                        }
                        event.preventDefault();
                        break;
                    case 40: // arrow down
                        if (suggestionDialog !== null) {
                            suggestionDown();
                        }
                        event.preventDefault();
                        break;
                    case 27: // ESC
                        if (suggestionDialog !== null) {
                            killSuggestionDialog();
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
                commandFragment = text + (endOfLine ? "\n" : ""),
                keywords = text.split(keywordSeparatorRegex);
            lastKeywordFragment = keywords[keywords.length - 1];
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

        // suggestion dialog
        function showSuggestionDialog() {
            if (lastKeywordFragment.length === 0) {
                processCommand("");
            }
            var currentLine = getLastLine(),
                charSpans = getCharSpans(currentLine),
                indexOfLastKeyword = charSpans.length - lastKeywordFragment.length,
                anchorElement = indexOfLastKeyword >= 0 && indexOfLastKeyword < charSpans.length > 0 ? $(charSpans[indexOfLastKeyword]) : caretElement,
                keywordStartOffset = anchorElement.offset(),
                suggestionLeft = keywordStartOffset.left,
                dialogTopIfBelow = keywordStartOffset.top + 25, // TODO hardcoded line height
                dialogBottomIfAbove = $(container).height() - keywordStartOffset.top,
                dialogHeight = Math.min(suggestions.length, options.suggestionLineNumber) * options.suggestionLineHeight;
            buildSuggestionDialog(suggestions);
            switch (calculateDialogPosition(dialogHeight, dialogTopIfBelow, dialogBottomIfAbove)) {
                case 'below':
                    suggestionDialog.css({ left: suggestionLeft, top: dialogTopIfBelow, height: dialogHeight });
                    break;
                case 'above':
                    suggestionDialog.css({ left: suggestionLeft, bottom: dialogBottomIfAbove, height: dialogHeight });
            }
            terminalElem.append(suggestionDialog);
        }

        function updateSuggestionDialog() {
            var dialogHeight = Math.min(suggestions.length, options.suggestionLineNumber) * options.suggestionLineHeight;
            setSuggestionsInDialog(suggestions, suggestionDialog);
            suggestionDialog.css({ height: dialogHeight });
        }

        function calculateDialogPosition(dialogHeight, dialogTopIfBelow, dialogBottomIfAbove) {
            var documentHeight = $(container).height(),
                marginIfBelow = documentHeight - dialogTopIfBelow - dialogHeight,
                marginIfAbove = documentHeight - dialogBottomIfAbove - dialogHeight;
            if (marginIfBelow < 0 && marginIfAbove > marginIfBelow) return 'above';
            return 'below';
        }

        function buildSuggestionDialog() {
            selectedSuggestionIndex = -1;
            suggestionDialog = $("<div class='cliwe-suggestions'></div>");
            setSuggestionsInDialog(suggestions, suggestionDialog);
        }

        function setSuggestionsInDialog() {
            suggestionDialog.empty();
            for (var i = 0; i < suggestions.length; i++) (function(i) {
                var suggestionLine = $("<div class='cliwe-suggestion'></div>");
                suggestionLine.text(suggestions[i].fragment);
                suggestionLine.css({ height: options.suggestionLineHeight });
                suggestionLine.click(function() {
                    setSuggestionSelected(i);
                    appendSuggestionToCommandBuffer();
                    killSuggestionDialog();
                });
                suggestionDialog.append(suggestionLine);
            })(i)
        }

        function appendSuggestionToCommandBuffer() {
            var selectedSuggestion = suggestions[selectedSuggestionIndex];
            for (var i = 0; i < selectedSuggestion.offset; i++) {
                removeCurrentChar();
            }
            appendToCommandBuffer(selectedSuggestion.fragment);
        }

        function killSuggestionDialog() {
            suggestionDialog.remove();
            suggestionDialog = null;
        }

        function suggestionUp() {
            var suggestionNumber = suggestions.length,
                index;
            if (selectedSuggestionIndex === -1) {
                index = suggestionNumber - 1;
            } else {
                index = (selectedSuggestionIndex + suggestionNumber - 1) % suggestionNumber;
            }
            setSuggestionSelected(index);
        }

        function suggestionDown() {
            var index = (selectedSuggestionIndex + 1) % suggestions.length;
            setSuggestionSelected(index);
        }

        function setSuggestionSelected(index) {
            var suggestionElements = suggestionDialog.children("div.cliwe-suggestion"),
                selectedSuggestionElement = suggestionElements.eq(index);
            if (selectedSuggestionElement !== undefined) {
                selectedSuggestionIndex = index;
                suggestionElements.removeClass("cliwe-selected");
                selectedSuggestionElement.addClass("cliwe-selected");
            } else {
                console.error("Trying to set suggestion number: " + index + "/" + suggestionElements.length);
            }
            adjustSuggestionDialogScroll();
        }

        function adjustSuggestionDialogScroll() {
            var scrollTop = suggestionDialog.scrollTop(),
                selectionTop = selectedSuggestionIndex * options.suggestionLineHeight,
                selectionBottom = selectionTop + options.suggestionLineHeight,
                overflowTop = scrollTop - selectionTop,
                overflowBottom = selectionBottom - suggestionDialog.height() - scrollTop;
            if (overflowTop > 0) {
                suggestionDialog.scrollTop(selectionTop);
            } else if (overflowBottom > 0) {
                suggestionDialog.scrollTop(scrollTop + overflowBottom);
            }
        }
    };

    $.fn.cliwe.defaultOptions = {
        serverUrl: "/cliweb",
        suggestionLineNumber: 10,
        suggestionLineHeight: 16
    };

})( jQuery );