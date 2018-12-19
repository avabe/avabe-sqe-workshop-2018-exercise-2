/* eslint-disable no-console */
//import * as esprima from 'esprima';
//import {generate} from 'escodegen';

const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};


function to_delete(node, dict, args_dict){
    return node.type !== 'VariableDeclaration' &&
        !(node.type === 'ExpressionStatement' && dict[node.expression.left.name] !== undefined &&
            args_dict[node.expression.left.name] === undefined);
}

function programExtract(prog, dict, args_dict){
    prog.body.map((exp) => extract_symbols(exp, dict, args_dict));
}

function functionExtract(func, dict, args_dict){
    func.params.map((param) => {args_dict[param.name] = 'undefined';});
    extract_symbols(func.body, dict, args_dict);
}

function blockStatementExtract(block, dict, args_dict){
    block.body.map((exp) => extract_symbols(exp, dict, args_dict));
    block['body'] = block.body.filter((node) => to_delete(node, dict, args_dict));
}

function expressionStatementExtract(exp, dict, args_dict){//check = operator
    extract_symbols(exp.expression, dict, args_dict);
}

function sequenceExpressionExtract(seq, dict, args_dict){
    seq.expressions.map((exp) => extract_symbols(exp, dict, args_dict));
}

function assignmentExpressionExtract(exp, dict,args_dict){
    let name = exp.left.name;
    substitute_symbols(exp.right, dict, args_dict);
    let val = escodegen.generate(exp.right);
    let evaluated;
    try{
        evaluated = eval(val);
    }catch(err){
        evaluated = val;
    }
    dict[name] = evaluated;
}

function variableDeclarationExtract(exp, dict, args_dict){
    exp.declarations.map((decl) => declarationExtract(decl, dict, args_dict));
}

function declarationExtract(decl, dict, args_dict){
    let name = decl.id.name;
    substitute_symbols(decl.init, dict, args_dict);
    let val = escodegen.generate(decl.init);
    let evaluated;
    try{
        evaluated = eval(val);
    }
    catch(err){
        evaluated = val;
    }
    dict[name] = evaluated;
}

function extract_symbols(exp, dict, args_dict){
    let funcs_names = ['Program', 'FunctionDeclaration', 'BlockStatement', 'VariableDeclaration',
        'ExpressionStatement', 'SequenceExpression', 'AssignmentExpression'];
    let funcs = [programExtract, functionExtract, blockStatementExtract, variableDeclarationExtract,
        expressionStatementExtract, sequenceExpressionExtract, assignmentExpressionExtract];
    let index = funcs_names.indexOf(exp.type);
    if(index < 0)
        return null;
    funcs[index](exp, dict, args_dict);
}

function programSub(prog, dict, args_dict){
    prog.body.map((exp) => substitute_symbols(exp, dict, args_dict));
    // prog['body'] = prog.body.filter((node) => node.type !== 'VariableDeclaration' &&
    //     !(node.type === 'ExpressionStatement' && dict[node.expression.left.name] !== undefined &&
    //         args_dict[node.expression.left.name] === undefined));
}

function functionSub(func, dict,args_dict){
    substitute_symbols(func.body, dict, args_dict);
}

function blockStatementSub(block, dict, args_dict){
    block.body.map((exp) => substitute_symbols(exp, dict, args_dict));
    block['body'] = block.body.filter((node) => to_delete(node, dict, args_dict));
}

function expressionStatementSub(exp, dict, args_dict){//check = operator
    substitute_symbols(exp.expression, dict, args_dict);
}

function clone_dict(dict){
    let output = {};
    for (var name in dict){
        output[name] = dict[name];
    }
    return output;
}

function ifSub(if_stat, dict, args_dict){
    let tmp2, tmp3;
    substitute_symbols(if_stat.test, dict, args_dict);
    tmp2 = clone_dict(dict);
    tmp3 = clone_dict(dict);
    substitute_symbols(if_stat.consequent, tmp2, args_dict);
    substitute_symbols(if_stat.alternate, tmp3, args_dict);
}

function whileSub(while_stat, dict, args_dict){
    let tmp;
    substitute_symbols(while_stat.test, dict, args_dict);
    tmp = clone_dict(dict);
    substitute_symbols(while_stat.body, tmp, args_dict);
}

function binaryExpressionSub(exp, dict, args_dict){
    substitute_symbols(exp.left, dict, args_dict);
    substitute_symbols(exp.right, dict, args_dict);
}

function identifierSub(id, dict){
    if (dict[id.name] !== undefined)
        id['name'] = dict[id.name];
}

function returnStatementSub(ret, dict, args_dict){
    substitute_symbols(ret.argument, dict, args_dict);
}

function substitute_symbols(func, dict, args_dict){
    let funcs_names = ['Program', 'FunctionDeclaration', 'BlockStatement', 'IfStatement', 'WhileStatement',
        'BinaryExpression', 'ExpressionStatement', 'AssignmentExpression', 'Identifier', 'ReturnStatement'];
    let funcs = [programSub, functionSub, blockStatementSub, ifSub, whileSub, binaryExpressionSub,
        expressionStatementSub, assignmentExpressionExtract, identifierSub, returnStatementSub];
    if(func === null || func === undefined)
        return null;
    let index = funcs_names.indexOf(func.type);
    if(index < 0)
        return undefined;
    funcs[index](func, dict, args_dict);
}

function eval_cond(node, args_dict){
    let eval_string, args_string = '';
    let isGreen;
    for(var name in args_dict){
        if(args_dict[name] !== 'undefined')
            args_string += 'let ' + name + ' = ' + JSON.stringify(args_dict[name]) + '\n';
    }
    eval_string = args_string + escodegen.generate(node);
    try{
        isGreen = eval(eval_string);
    } catch (e) {
        isGreen = false;
    }
    return isGreen;
}

function paint_conditions(func, args_list){
    estraverse.traverse(func, {
        enter: function(node) {
            if(node.type === 'IfStatement' || node.type === 'WhileStatement'){
                if(eval_cond(node.test, args_list))
                    node['rowColor'] = 'greenyellow';
                else node['rowColor'] = 'firebrick';
            }
        }
    });
}

function eval_func(func, args, dict){
    let args_dict = {};
    extract_symbols(func, dict, args_dict);
    extract_symbols(args, args_dict, {});
    substitute_symbols(func, dict, args_dict);
    let new_func = escodegen.generate(func);
    let new_parsedFunc = parseCode(new_func);
    paint_conditions(new_parsedFunc, args_dict);
    return new_parsedFunc;
}


export {parseCode};
export {eval_func, extract_symbols, substitute_symbols, eval_cond};
