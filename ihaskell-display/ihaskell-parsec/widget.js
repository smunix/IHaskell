// Only load this script once.
var kernel = IPython.notebook.kernel;
var initialized = kernel !== undefined && kernel != null;
console.log("Initialized", initialized);
if (initialized && window.parsecWidgetRegistered === undefined) {

// Do not load this script again.
window.parsecWidgetRegistered = true;

// Register the comm target.
var ParsecWidget = function (comm) {
    this.comm = comm;
    this.comm.on_msg($.proxy(this.handler, this));

    // Get the cell that was probably executed.
    // The msg_id:cell mapping will make this possible without guessing.
    this.cell = IPython.notebook.get_cell(IPython.notebook.get_selected_index()-1);

    // Store this widget so we can use it from callbacks.
    var widget = this;

    // Editor options.
    var options = {
        lineNumbers: true,
        // Show parsec errors as lint errors.
        gutters: ["CodeMirror-lint-markers"],
        lintWith: {
            "getAnnotations": function(cm, update, opts) {
                var errs = [];
                if (widget.hasError) {
                    var col = widget.error["col"];
                    var line = widget.error["line"];
                    errs = [{
                        from: CodeMirror.Pos(line - 1, col - 1),
                        to: CodeMirror.Pos(line - 1, col),
                        message: widget.error["msg"],
                        severity: "error"
                    }];
                }
                update(cm, errs);
            },
            "async": true,
        }
    };

    // Create the editor.
    var out = this.cell.output_area.element;
    this.textarea = out.find("#parsec-editor")[0];
    this.output = out.find("#parsec-output")[0];

    var editor = CodeMirror.fromTextArea(this.textarea, options);
    var editor = editor;

    // Update every key press.
    editor.on("keyup", function() {
        var text = editor.getDoc().getValue();
        comm.send({"text": text});
    });
};

ParsecWidget.prototype.handler = function(msg) {
    var data = msg.content.data;
    this.hasError = data["status"] == "error";
    if (this.hasError) {
        out = data["msg"];
        this.error = data;
    } else {
        out = data["result"];
    }
    // Update viewed output.
    this.output.innerHTML = out;
};

// Register this widget.
IPython.notebook.kernel.comm_manager.register_target('parsec', IPython.utils.always_new(ParsecWidget));
console.log("Registering Parsec widget.");
}
