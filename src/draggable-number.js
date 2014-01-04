(function(root, factory) {
  // Set up DraggableNumber appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.DraggableNumber = factory(root, exports);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);

  // Finally, as a browser global.
  } else {
    root.DraggableNumber = factory(root, {});
  }
}(this, function(root, exports) {

  var DraggableNumber = function(elements) {
    this.elements = elements;
    this.init();
  };

  DraggableNumber.prototype = {
    constructor: DraggableNumber,

    init: function () {
      for (var i = this.elements.length - 1; i >= 0; i--) {
        new DraggableNumber.Element(this.elements[i]);
      }
    }
  };

  // Set some constants.
  DraggableNumber.MODIFIER_NONE = 0;
  DraggableNumber.MODIFIER_LARGE = 1;
  DraggableNumber.MODIFIER_SMALL = 2;

  // Utility function to replace .bind(this) since it is not available in all browsers.
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  DraggableNumber.Element = function (input) {
    this.input = input;
    this.span = document.createElement("span");
    this.isDragging = false;
    this.lastMousePosition = {x: 0, y: 0};
    this.value = 0;

    // Minimum mouse movement before a drag start.
    this.dragThreshold = 10;

    // Store the original display style for the input and span.
    this.inputDisplayStyle = "";
    this.spanDisplayStyle = "";

    this.init();
  };

  DraggableNumber.Element.prototype = {
    constructor: DraggableNumber.Element,

    init: function () {
      // Get the inital value from the input.
      this.value = parseFloat(this.input.value, 10);

      // Add a span containing the value. Clicking on the span will show the
      // input. Dragging the span will change the value.
      this.addSpan();

      // Save the original display style of the input and span.
      this.inputDisplayStyle = this.input.style.display;
      this.spanDisplayStyle = this.span.style.display;

      // Hide the input.
      this.input.style.display = 'none';

      // Bind 'this' on event callbacks.
      this.onMouseUp = __bind(this.onMouseUp, this);
      this.onMouseMove = __bind(this.onMouseMove, this);
      this.onMouseDown = __bind(this.onMouseDown, this);
      this.onInputBlur = __bind(this.onInputBlur, this);
      this.onInputKeyDown = __bind(this.onInputKeyDown, this);

      // Add mousedown event handler.
      this.span.addEventListener('mousedown', this.onMouseDown, false);

      // Add key events on the input.
      this.input.addEventListener('blur', this.onInputBlur, false);
      this.input.addEventListener('keypress', this.onInputKeyDown, false);
    },

    destroy: function () {
      if (this.span.parentNode) {
        this.span.parentNode.removeChild(this.span);
      }
    },

    addSpan: function () {
      var inputParent = this.input.parentNode;
      inputParent.insertBefore(this.span, this.input);
      this.span.innerHTML = this.value;

      // Make span not selectable.
      this.span.style['-moz-user-select'] = 'none';
      this.span.style['-webkit-user-select'] = 'none';
      this.span.style['-ms-user-select'] = 'none';
      this.span.style['user-select'] = 'none';

      // Add resize cursor.
      this.span.style.cursor = "col-resize";

      this.span.addEventListener('selectstart', function() {
        return false;
      });
    },

    showInput: function () {
      this.input.style.display = this.inputDisplayStyle;
      this.span.style.display = 'none';
      this.input.focus();
    },

    showSpan: function () {
      this.input.style.display = 'none';
      this.span.style.display = this.spanDisplayStyle;
    },

    onInputBlur: function (e) {
      this.value = parseFloat(this.input.value, 10);
      this.updateNumber(0);
      this.showSpan();
    },

    onInputKeyDown: function (e) {
      var keyEnter = 13;
      if (e.charCode == keyEnter) {
        this.input.blur();
      }
    },

    onMouseDown: function (e) {
      this.isDragging = false;
      this.lastMousePosition = {x: e.clientX, y: e.clientY * -1};

      document.addEventListener('mouseup', this.onMouseUp, false);
      document.addEventListener('mousemove', this.onMouseMove, false);
    },

    onMouseUp: function (e) {
      // If we didn't drag the span then we display the input.
      if (this.isDragging === false) {
        this.showInput();
      }
      this.isDragging = false;

      document.removeEventListener('mouseup', this.onMouseUp, false);
      document.removeEventListener('mousemove', this.onMouseMove, false);
    },

    hasMovedEnough: function (newMousePosition, lastMousePosition) {
      if (Math.abs(newMousePosition.x - lastMousePosition.x) >= this.dragThreshold ||
        Math.abs(newMousePosition.y - lastMousePosition.y) >= this.dragThreshold) {
        return true;
      }
      return false;
    },

    onMouseMove: function (e) {
      // Get the new mouse position.
      var newMousePosition = {x: e.clientX, y: e.clientY * -1};

      if (this.hasMovedEnough(newMousePosition, this.lastMousePosition)) {
        this.isDragging = true;
      }

      // If we are not dragging don't do anything.
      if (this.isDragging === false) {
        return;
      }

      // Get the increment modifier. Small increment * 0.1, large increment * 10.
      var modifier = DraggableNumber.MODIFIER_NONE;
      if (e.shiftKey) {
        modifier = DraggableNumber.MODIFIER_LARGE;
      }
      else if (e.ctrlKey) {
        modifier = DraggableNumber.MODIFIER_SMALL;
      }

      // Calculate the delta with previous mouse position.
      var delta = this.getLargestDelta(newMousePosition, this.lastMousePosition);

      // Get the number offset.
      var offset = this.getNumberOffset(delta, modifier);

      // Update the input number.
      this.updateNumber(offset);

      // Save current mouse position.
      this.lastMousePosition = newMousePosition;
    },

    getNumberOffset: function (delta, modifier) {
      var increment = 1;
      if (modifier == DraggableNumber.MODIFIER_SMALL) {
        increment *= 0.1;
      }
      else if (modifier == DraggableNumber.MODIFIER_LARGE) {
        increment *= 10;
      }
      // Negative increment if delta is negative.
      if (delta < 0) {
        increment *= -1;
      }
      return increment;
    },

    updateNumber: function (offset) {
      this.value += offset;
      this.input.value = this.value;
      this.span.innerHTML = this.value;
    },

    getLargestDelta: function (newPosition, oldPosition) {
      var result = 0;
      var delta = {
        x: newPosition.x - oldPosition.x,
        y: newPosition.y - oldPosition.y,
      };
      if (Math.abs(delta.x) > Math.abs(delta.y)) {
        return delta.x;
      }
      else {
        return delta.y;
      }
    }
  };

  exports.DraggableNumber = DraggableNumber;
  return DraggableNumber;
}));