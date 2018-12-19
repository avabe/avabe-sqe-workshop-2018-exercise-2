import $ from 'jquery';
import {parseCode, eval_func} from './code-analyzer';
import {generate} from 'escodegen';
import * as estraverse from 'estraverse';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse);
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
    });

    $('#evalButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args = $('#argumentsHolder').val();
        let parsedArgs = parseCode(args);
        let parsedCode = parseCode(codeToParse);
        let evaluatedCode = eval_func(parsedCode, parsedArgs, {});
        let to_print = print_html(evaluatedCode);
        $('#parsedCode').html(to_print);
    });
});


function print_html(ast){
    let rows_colors = {};
    estraverse.traverse(ast, {
        enter: function(node) {
            if(node.rowColor !== undefined){
                let row = node.loc.start.line;
                rows_colors[row] = node.rowColor;
            }
        }
    });
    let func = generate(ast);
    let rows = func.split('\n');
    let html = '';
    for(let i=0; i < rows.length; i++){
        if(rows_colors[i+1] !== undefined)
            html += '<span style="background-color:' + rows_colors[i+1] + '">' + rows[i] + '</span><br>';
        else html += '<span style="background-color:white">' + rows[i] + '</span><br>';
    }
    return html;
}